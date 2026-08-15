'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Loader2, KeyRound, MapPin, AlertCircle } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { collection, doc, query, where, getDocs, getDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { useDataContext } from '@/context/data-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getHaversineDistance } from '@/lib/utils';
import { registerOrCheckDevice, logSecurityAttempt, claimAttendanceSession } from '@/lib/attendance-security';

type State = 'idle' | 'loading' | 'success' | 'already_marked' | 'invalid_code' | 'out_of_bounds' | 'location_denied' | 'security_blocked' | 'error';

export default function AttendPage() {
  const [code, setCode] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [state, setState] = useState<State>('idle');
  const [distance, setDistance] = useState<number | null>(null);
  const [activeRadius, setActiveRadius] = useState<number>(30);
  const { user } = useUser();
  const firestore = useFirestore();
  const { classes } = useDataContext();

  const handleSubmit = async () => {
    if (!user) { setState('error'); return; }
    if (!code || code.length !== 4) { setState('invalid_code'); return; }
    if (!selectedClass) { setState('invalid_code'); return; }

    setState('loading');

    const today = new Date().toISOString().split('T')[0];
    const course = classes.find(c => c.id === selectedClass);

    try {
      // Check the active teacher session first. Attendance is scoped to the
      // current period, so a student can attend different periods on the same day.
      const sessionQuery = query(
        collection(firestore, 'activeSessions'),
        where('classId', '==', selectedClass),
        where('code', '==', code),
        where('active', '==', true)
      );
      const sessions = await getDocs(sessionQuery);
      if (sessions.empty) {
        setState('invalid_code');
        return;
      }
      const sessionData = sessions.docs[0].data() as {
        latitude?: number | null;
        longitude?: number | null;
        radius?: number;
        expiresAt?: number;
        periodKey?: string;
      };

      const periodKey = sessionData.periodKey || '';
      const sessionId = sessions.docs[0].id;

      // Session's QR/code rotates every 10 minutes — if it's stale, ask the student to re-check.
      if (sessionData.expiresAt && Date.now() > sessionData.expiresAt) {
        setState('invalid_code');
        return;
      }

      // The device is registered for the account. A device mismatch (new
      // phone, cleared browser storage, incognito mode, etc.) no longer
      // blocks attendance — it's logged for the Dean as a signal and the
      // trusted device is refreshed automatically, so a student is never
      // permanently locked out over a device change.
      const security = await registerOrCheckDevice(firestore, user);
      if (security.deviceMismatch) {
        await logSecurityAttempt(firestore, user, {
          classId: selectedClass,
          className: course?.name || selectedClass,
          periodKey,
          sessionId,
          currentIp: security.ip,
          trustedIp: security.trustedIp,
          deviceMismatch: true,
          ipChanged: security.ipChanged,
          reason: 'Attendance code entered from a new/unrecognized device for this account. Logged for review; attendance was still recorded.',
        });
      } else if (security.ipChanged) {
        await logSecurityAttempt(firestore, user, {
          classId: selectedClass,
          className: course?.name || selectedClass,
          periodKey,
          sessionId,
          currentIp: security.ip,
          trustedIp: security.trustedIp,
          deviceMismatch: false,
          ipChanged: true,
          reason: 'Trusted device used from a different network IP. Attendance was allowed and the network change was logged.',
        });
      }

      // A shared device within the same session is logged for the Dean as a
      // signal, but no longer blocks attendance — teachers legitimately
      // demo with one device, and classroom devices are sometimes shared.
      const claimAttendanceDevice = async () => {
        const claim = await claimAttendanceSession(firestore, user, sessionId, {
          classId: selectedClass,
          periodKey,
          ip: security.ip,
          deviceId: security.deviceId,
        });
        if (claim.sharedDevice) {
          await logSecurityAttempt(firestore, user, {
            classId: selectedClass,
            className: course?.name || selectedClass,
            periodKey,
            sessionId,
            currentIp: security.ip,
            trustedIp: security.trustedIp,
            deviceMismatch: false,
            ipChanged: false,
            reason: 'This attendance session was already used by another student account on this device. Logged for review; attendance was still recorded.',
          });
        }
        return true;
      };

      if (periodKey) {
        const periodExisting = await getDocs(query(
          collection(firestore, 'attendance'),
          where('studentId', '==', user.uid),
          where('classId', '==', selectedClass),
          where('date', '==', today),
          where('periodKey', '==', periodKey)
        ));
        if (!periodExisting.empty) {
          setState('already_marked');
          return;
        }
      }

      // 3. Location check — uses the teacher's live location synced from the
      // active session (the same location baked into the QR code), not the
      // static per-class lat/lng which is never set in this app.
      const sessionLat = sessionData.latitude;
      const sessionLng = sessionData.longitude;

      // Claim the physical device only after the location check succeeds (or
      // when this session has no location coordinates). This prevents a failed
      // geofence attempt from consuming the session claim.
      if (sessionLat && sessionLng) {
        const geofenceRadius = sessionData.radius || course?.geofenceRadius || 30;
        setActiveRadius(geofenceRadius);

        // Check if geolocation is available
        if (!navigator.geolocation) {
          setState('location_denied');
          return;
        }

        let position: GeolocationPosition;
        try {
          position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false, // false works better on HTTP
              timeout: 15000,
              maximumAge: 60000,
            });
          });
        } catch (e: any) {
          console.error('Location error:', e);
          // If location fails on HTTP, show helpful message
          if (window.location.protocol === 'http:') {
            setState('location_denied');
          } else {
            setState('location_denied');
          }
          return;
        }

        const { latitude: studentLat, longitude: studentLon } = position.coords;
        const dist = getHaversineDistance(
          studentLat, studentLon,
          sessionLat, sessionLng
        );
        setDistance(Math.round(dist));

        // GPS readings (especially indoors) commonly carry 15-50m of error.
        // `position.coords.accuracy` is the device's own estimate of that
        // error radius, so it's added as tolerance instead of comparing the
        // raw distance straight against the classroom radius — otherwise
        // students standing in the classroom get a false "not in location"
        // rejection purely from GPS noise. Capped so a wildly inaccurate
        // reading can't defeat the geofence entirely.
        const accuracyBuffer = Math.min(position.coords.accuracy || 0, 40);
        if (dist > geofenceRadius + accuracyBuffer) {
          setState('out_of_bounds');
          return;
        }

      

        if (!(await claimAttendanceDevice())) return;

        // Save attendance atomically. A second scan for the same student/class/period
        // cannot create another record.
        const attendanceId = `${user.uid}_${selectedClass}_${today}_${periodKey || 'unknown'}`.replace(/[^a-zA-Z0-9_-]/g, '_');
        const attendanceRef = doc(firestore, 'attendance', attendanceId);
        await runTransaction(firestore, async transaction => {
          const snap = await transaction.get(attendanceRef);
          if (snap.exists()) throw new Error('ALREADY_MARKED');
          transaction.set(attendanceRef, {
            studentId: user.uid,
            studentEmail: user.email,
            studentName: user.displayName || user.email,
            classId: selectedClass,
            className: course?.name || selectedClass,
            date: today,
            status: 'present',
            method: 'manual_code',
            periodKey,
            sessionId,
            studentLatitude: studentLat,
            studentLongitude: studentLon,
            ipAddress: security.ip,
            deviceId: security.deviceId,
            markedAt: serverTimestamp(),
          });
        });

      } else {

        const attendanceId = `${user.uid}_${selectedClass}_${today}_${periodKey || 'unknown'}`.replace(/[^a-zA-Z0-9_-]/g, '_');
        const attendanceRef = doc(firestore, 'attendance', attendanceId);
        await runTransaction(firestore, async transaction => {
          const snap = await transaction.get(attendanceRef);
          if (snap.exists()) throw new Error('ALREADY_MARKED');
          transaction.set(attendanceRef, {
            studentId: user.uid,
            studentEmail: user.email,
            studentName: user.displayName || user.email,
            classId: selectedClass,
            className: course?.name || selectedClass,
            date: today,
            status: 'present',
            method: 'manual_code',
            periodKey,
            sessionId,
            ipAddress: security.ip,
            deviceId: security.deviceId,
            markedAt: serverTimestamp(),
          });
        });
      }

      setState('success');

    } catch (e: any) {
      console.error('Manual attendance error:', e);
      if (e?.message === 'ALREADY_MARKED') { setState('already_marked'); return; }
      setState('error');
    }
  };

  const ICON: Record<State, React.ReactNode> = {
    idle: <KeyRound className="h-8 w-8 text-primary" />,
    loading: <Loader2 className="h-8 w-8 animate-spin text-primary" />,
    success: <CheckCircle className="h-8 w-8 text-green-500" />,
    already_marked: <CheckCircle className="h-8 w-8 text-blue-500" />,
    invalid_code: <XCircle className="h-8 w-8 text-destructive" />,
    out_of_bounds: <MapPin className="h-8 w-8 text-destructive" />,
    location_denied: <AlertCircle className="h-8 w-8 text-destructive" />,
    security_blocked: <AlertCircle className="h-8 w-8 text-destructive" />,
    error: <XCircle className="h-8 w-8 text-destructive" />,
  };

  const TITLE: Record<State, string> = {
    idle: 'Enter Attendance Code',
    loading: 'Verifying...',
    success: 'Attendance Marked ✅',
    already_marked: 'Already Marked ✅',
    invalid_code: 'Invalid Code ❌',
    out_of_bounds: 'Not in Classroom ❌',
    location_denied: 'Location Denied ❌',
    security_blocked: 'Attendance blocked 🔐',
    error: 'Something went wrong',
  };

  const DESC: Record<State, string> = {
    idle: 'Enter the 4-digit code shown by your teacher. Your location will also be verified.',
    loading: 'Checking your code and location...',
    success: 'You have been marked present!',
    already_marked: 'Your attendance is already recorded for this period.',
    invalid_code: 'Wrong code or no active session. Ask your teacher.',
    out_of_bounds: `You are ${distance}m away from the classroom. You must be within ${activeRadius}m.`,
    location_denied: 'Please enable location access in your browser settings.',
    security_blocked: 'This attendance session has already been used by another student account on this device. Your attendance was not marked. The attempt was logged for the Dean.',
    error: 'Please try again.',
  };

  const showForm = ['idle', 'invalid_code', 'out_of_bounds', 'location_denied', 'error'].includes(state);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-2">
            {ICON[state]}
          </div>
          <CardTitle>{TITLE[state]}</CardTitle>
          <CardDescription>{DESC[state]}</CardDescription>
        </CardHeader>

        {showForm && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Your Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose class..." />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>4-Digit Code</Label>
              <Input
                type="number"
                placeholder="e.g. 4821"
                maxLength={4}
                value={code}
                onChange={e => setCode(e.target.value.slice(0, 4))}
                className="text-center text-2xl font-mono tracking-widest"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted p-3 rounded-lg">
              <MapPin className="h-4 w-4 shrink-0 text-primary" />
              <span>Your location will be verified. You must be physically present in the classroom.</span>
            </div>

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={code.length !== 4 || !selectedClass || state === 'loading'}
            >
              {state === 'loading' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mark My Attendance
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
