'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, Camera, ScanLine, MapPin, AlertCircle, KeyRound } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, getDocs, getDoc, doc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { useDataContext } from '@/context/data-context';
import { getHaversineDistance } from '@/lib/utils';
import { SUBJECTS } from '@/lib/timetable';
import { registerOrCheckDevice, logSecurityAttempt, claimAttendanceSession } from '@/lib/attendance-security';

type ScanState =
  | 'idle'
  | 'scanning'
  | 'processing'
  | 'success'
  | 'already_marked'
  | 'expired'
  | 'out_of_bounds'
  | 'location_denied'
  | 'security_blocked'
  | 'error';

export default function ScanPage() {
  const router = useRouter();
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [className, setClassName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [distance, setDistance] = useState<number | null>(null);
  const [geofenceRadius, setGeofenceRadius] = useState<number>(100);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const processingRef = useRef(false);
  const { classes } = useDataContext();
  const firestore = useFirestore();
  const { user } = useUser();

  // Teachers and deans generate QR codes, they don't scan them — send them
  // to the attendance page instead of showing the student camera-scan UI.
  useEffect(() => {
    const isTeacher = user?.email?.endsWith('@teacher.com') || user?.email?.endsWith('@faculty.com');
    const isDean = user?.email?.endsWith('@dean.com');
    if (isTeacher || isDean) {
      router.replace('/attendance');
    }
  }, [user, router]);

  const stopCamera = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => () => stopCamera(), []);

  const startCamera = async () => {
    processingRef.current = false;
    setScanState('scanning');
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        scanQR();
      }
    } catch (e: any) {
      setScanState('error');
      const isHttps = window.location.protocol === 'https:';
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (!isHttps && !isLocal) {
        setErrorMsg('Camera requires HTTPS. Please use the ngrok link instead of the local IP address.');
      } else {
        setErrorMsg('Camera access denied. Please allow camera permission in browser settings.');
      }
    }
  };

  const scanQR = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tick = async () => {
      if (processingRef.current) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        if ('BarcodeDetector' in window) {
          try {
            // @ts-ignore
            const detector = new BarcodeDetector({ formats: ['qr_code'] });
            const codes = await detector.detect(canvas);
            if (codes.length > 0 && !processingRef.current) {
              processingRef.current = true;
              stopCamera();
              processQR(codes[0].rawValue);
              return;
            }
          } catch (e) {}
        }
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
  };

  const processQR = async (data: string) => {
    setScanState('processing');
    try {
      let classId = '';
      let expires = 0;
      let qrRadius = 0;
      let qrLat = 0;
      let qrLng = 0;
      let sessionId = '';
      let periodKey = '';

      if (data.startsWith('ATTENDAVISION:')) {
        const params = new URLSearchParams(data.replace('ATTENDAVISION:', ''));
        classId = params.get('class') || '';
        expires = Number(params.get('expires') || 0);
        qrRadius = Number(params.get('radius') || 0);
        qrLat = Number(params.get('lat') || 0);
        qrLng = Number(params.get('lng') || 0);
        sessionId = params.get('session') || '';
        periodKey = params.get('period') || '';
      } else {
        try {
          const url = new URL(data);
          classId = url.searchParams.get('class') || '';
          expires = Number(url.searchParams.get('expires') || 0);
          qrRadius = Number(url.searchParams.get('radius') || 0);
        } catch {
          classId = '';
        }
      }

      // Validate
      if (!classId) {
        setScanState('error');
        setErrorMsg('Invalid QR code. Ask your teacher to generate a new one.');
        return;
      }

      // Only check expiry if expires > 0
      if (expires > 0 && Date.now() > expires) {
        setScanState('expired');
        return;
      }

      if (!user) {
        setScanState('error');
        setErrorMsg('Please login first.');
        return;
      }

      const course = classes.find(c => c.id === classId);
      // Fallback to timetable SUBJECTS if not in classesData
      const subjectInfo = SUBJECTS[classId];
      const courseName = course?.name || subjectInfo?.name || classId;
      if (!course && !subjectInfo) {
        setScanState('error');
        setErrorMsg('Class not found. Please try again.');
        return;
      }
      setClassName(courseName);

      // Anti-proxy attendance: the device is registered for the account.
      // A device mismatch (new phone, cleared browser storage, incognito
      // mode, etc.) no longer blocks attendance — it's logged for the Dean
      // as a signal and the trusted device is refreshed automatically, so a
      // student is never permanently locked out over a device change.
      const security = await registerOrCheckDevice(firestore, user);
      if (security.deviceMismatch) {
        await logSecurityAttempt(firestore, user, {
          classId,
          className: courseName,
          periodKey,
          sessionId,
          currentIp: security.ip,
          trustedIp: security.trustedIp,
          deviceMismatch: true,
          ipChanged: security.ipChanged,
          reason: 'Attendance marked from a new/unrecognized device for this account. Logged for review; attendance was still recorded.',
        });
      } else if (security.ipChanged) {
        // An IP change alone is not a failure: it is logged for the Dean as a
        // network-change signal while legitimate mobile-network changes remain
        // possible.
        await logSecurityAttempt(firestore, user, {
          classId,
          className: courseName,
          periodKey,
          sessionId,
          currentIp: security.ip,
          trustedIp: security.trustedIp,
          deviceMismatch: false,
          ipChanged: true,
          reason: 'Trusted account used from a different network IP. Attendance was allowed because the trusted device matched.',
        });
      }

      if (sessionId) {
        const sessionSnap = await getDoc(doc(firestore, 'activeSessions', sessionId));
        if (!sessionSnap.exists() || sessionSnap.data().active !== true || sessionSnap.data().classId !== classId || (sessionSnap.data().periodKey && periodKey && sessionSnap.data().periodKey !== periodKey)) {
          setScanState('error');
          setErrorMsg('This attendance session is no longer active. Ask your teacher to show the current QR code.');
          return;
        }
        periodKey = periodKey || sessionSnap.data().periodKey || '';
      }

      const effectiveRadius = course?.geofenceRadius || qrRadius || 100;
      setGeofenceRadius(effectiveRadius);

      // Geofencing — use QR lat/lng (teacher's location) or course lat/lng
      const teacherLat = qrLat || (course as any)?.latitude || 0;
      const teacherLng = qrLng || (course as any)?.longitude || 0;
      
      if (teacherLat && teacherLng) {
        if (!navigator.geolocation) { setScanState('location_denied'); return; }
        let position: GeolocationPosition;
        try {
          position = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 0,
            })
          );
        } catch {
          setScanState('location_denied');
          return;
        }
        const dist = getHaversineDistance(
          position.coords.latitude, position.coords.longitude,
          teacherLat, teacherLng
        );
        setDistance(Math.round(dist));
        // GPS readings (especially indoors) commonly carry 15-50m of error.
        // `position.coords.accuracy` is the device's own estimate of that
        // error radius, so it's added as tolerance instead of comparing the
        // raw distance straight against the classroom radius — otherwise
        // students standing in the classroom get a false "not in location"
        // rejection purely from GPS noise. The buffer is capped so a wildly
        // inaccurate reading (e.g. 300m) can't defeat the geofence entirely.
        const accuracyBuffer = Math.min(position.coords.accuracy || 0, 40);
        if (dist > effectiveRadius + accuracyBuffer) { setScanState('out_of_bounds'); return; }
      }

      // A shared device within the same session is logged for the Dean as a
      // signal, but no longer blocks attendance — teachers legitimately
      // demo with one device, and classroom devices are sometimes shared.
      if (sessionId) {
        const claim = await claimAttendanceSession(firestore, user, sessionId, {
          classId,
          periodKey,
          ip: security.ip,
          deviceId: security.deviceId,
        });
        if (claim.sharedDevice) {
          await logSecurityAttempt(firestore, user, {
            classId,
            className: courseName,
            periodKey,
            sessionId,
            currentIp: security.ip,
            trustedIp: security.trustedIp,
            deviceMismatch: false,
            ipChanged: false,
            reason: 'This attendance session was already used by another student account on this device. Logged for review; attendance was still recorded.',
          });
        }
      }

      // Duplicate check
      const today = new Date().toISOString().split('T')[0];
      const existing = await getDocs(query(
        collection(firestore, 'attendance'),
        where('studentId', '==', user.uid),
        where('classId', '==', classId),
        where('date', '==', today),
        ...(periodKey ? [where('periodKey', '==', periodKey)] : [])
      ));
      if (!existing.empty) { setScanState('already_marked'); return; }

      // Save attendance atomically so two rapid scans cannot create duplicate
      // attendance records for the same student/class/period.
      const attendanceId = `${user.uid}_${classId}_${today}_${periodKey || 'unknown'}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      const attendanceRef = doc(firestore, 'attendance', attendanceId);
      await runTransaction(firestore, async transaction => {
        const snap = await transaction.get(attendanceRef);
        if (snap.exists()) throw new Error('ALREADY_MARKED');
        transaction.set(attendanceRef, {
          studentId: user.uid,
          studentEmail: user.email,
          studentName: user.displayName || user.email,
          classId,
          className: courseName,
          date: today,
          status: 'present',
          method: 'qr_scan',
          periodKey: periodKey || null,
          sessionId: sessionId || null,
          ipAddress: security.ip,
          deviceId: security.deviceId,
          markedAt: serverTimestamp(),
        });
      });

      setScanState('success');
    } catch (e: any) {
      if (e?.message === 'ALREADY_MARKED') { setScanState('already_marked'); return; }
      setScanState('error');
      setErrorMsg('Could not process QR code. Please try again.');
    }
  };

  const reset = () => {
    stopCamera();
    processingRef.current = false;
    setScanState('idle');
    setClassName('');
    setErrorMsg('');
    setDistance(null);
  };

  const ICON: Record<ScanState, React.ReactNode> = {
    idle: <ScanLine className="h-8 w-8 text-primary" />,
    scanning: <Camera className="h-8 w-8 text-primary animate-pulse" />,
    processing: <Loader2 className="h-8 w-8 animate-spin text-primary" />,
    success: <CheckCircle className="h-8 w-8 text-green-500" />,
    already_marked: <CheckCircle className="h-8 w-8 text-blue-500" />,
    expired: <XCircle className="h-8 w-8 text-destructive" />,
    out_of_bounds: <MapPin className="h-8 w-8 text-destructive" />,
    location_denied: <AlertCircle className="h-8 w-8 text-destructive" />,
    security_blocked: <AlertCircle className="h-8 w-8 text-destructive" />,
    error: <XCircle className="h-8 w-8 text-destructive" />,
  };

  const TITLE: Record<ScanState, string> = {
    idle: 'Scan QR Code',
    scanning: 'Scanning...',
    processing: 'Marking Attendance...',
    success: 'Attendance Marked ✅',
    already_marked: 'Already Marked ✅',
    expired: 'QR Code Expired',
    out_of_bounds: 'Not in Classroom ❌',
    location_denied: 'Location Required ❌',
    security_blocked: 'Attendance Not Marked ❌',
    error: 'Error',
  };

  const DESC: Record<ScanState, string> = {
    idle: "Tap 'Open Camera & Scan' to scan your teacher's QR code",
    scanning: 'Point your camera at the QR code shown by teacher',
    processing: 'Please wait...',
    success: `You are marked present for ${className} 🎉`,
    already_marked: `Attendance for ${className} already recorded today.`,
    expired: 'This QR code has expired. Ask your teacher to generate a new one.',
    out_of_bounds: `You are ${distance}m away. Must be within ${geofenceRadius}m of classroom.`,
    location_denied: 'Please enable location access in your browser settings.',
    security_blocked: 'This account is being used from an unrecognized device. Attendance was not marked. The attempt has been sent to the Dean for review.',
    error: errorMsg || 'Something went wrong. Please try again.',
  };

  const doneStates: ScanState[] = ['success', 'already_marked', 'expired', 'out_of_bounds', 'location_denied', 'security_blocked', 'error'];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-2">
            {ICON[scanState]}
          </div>
          <CardTitle>{TITLE[scanState]}</CardTitle>
          <CardDescription>{DESC[scanState]}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">

          {scanState === 'scanning' && (
            <div className="relative w-full rounded-lg overflow-hidden bg-black aspect-square">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-56 h-56 border-4 border-primary rounded-2xl opacity-80" />
              </div>
              <p className="absolute bottom-4 left-0 right-0 text-center text-white text-sm font-medium">
                Point at teacher's QR code
              </p>
            </div>
          )}

          {scanState === 'idle' && (
            <Button className="w-full" size="lg" onClick={startCamera}>
              <Camera className="mr-2 h-5 w-5" />
              Open Camera & Scan
            </Button>
          )}

          {(scanState === 'idle' || doneStates.includes(scanState)) && (
            <Link href="/attend" className="w-full">
              <Button variant="outline" className="w-full">
                <KeyRound className="mr-2 h-4 w-4" />
                Enter Teacher OTP Instead
              </Button>
            </Link>
          )}

          {doneStates.includes(scanState) && (
            <Button variant="outline" className="w-full" onClick={reset}>
              Scan Again
            </Button>
          )}

          {scanState === 'scanning' && (
            <Button variant="outline" className="w-full" onClick={reset}>
              Cancel
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
