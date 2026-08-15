
'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Square } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { cn } from '@/lib/utils';
import { Progress } from '../ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useFirestore } from '@/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

type ClassInfo = {
  id: string;
  name: string;
  time: string;
  prof: string;
  room: string;
  geofenceRadius?: number;
};

type QrSessionManagerProps = {
  classInfo: ClassInfo | null;
  isOpen: boolean;
  onClose: () => void;
  // Fired once the scan window is over (full duration elapsed, or the
  // teacher explicitly ends it early) so the host page can auto-finalize
  // attendance — scanned students stay Present, everyone else becomes
  // Absent — without the teacher having to press Submit again.
  onSessionComplete?: (info: { classId: string; sessionId: string; periodKey: string; date: string }) => void;
};

const QR_ROTATION_SECONDS = 600;
const RADIUS_OPTIONS = [15, 20, 25, 30, 40, 50, 75, 100];

function generateSessionCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function getCurrentPeriodKey(date = new Date()) {
  const minutes = date.getHours() * 60 + date.getMinutes();
  const slots = [[570, 630, 'P1'], [630, 690, 'P2'], [690, 750, 'P3'], [810, 870, 'P4'], [870, 930, 'P5'], [930, 990, 'P6']] as const;
  return slots.find(([start, end]) => minutes >= start && minutes < end)?.[2] || `OFF-${date.getHours()}-${Math.floor(date.getMinutes() / 30)}`;
}

export function QrSessionManager({ classInfo, isOpen, onClose, onSessionComplete }: QrSessionManagerProps) {
  const [sessionName, setSessionName] = useState('');
  const [duration, setDuration] = useState(900);
  const [sessionRadius, setSessionRadius] = useState(30);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [sessionTimeLeft, setSessionTimeLeft] = useState(0);
  const [qrTimeLeft, setQrTimeLeft] = useState(QR_ROTATION_SECONDS);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [totalDuration, setTotalDuration] = useState(0);
  const [sessionCode, setSessionCode] = useState('');
  const [sessionDocId, setSessionDocId] = useState('');
  // Ref mirrors sessionDocId so the QR-rotation interval (and its closures)
  // always sees the latest doc id instead of a stale one from render time.
  const sessionDocIdRef = useRef('');
  const sessionPeriodKeyRef = useRef('');
  const sessionDateRef = useRef('');
  const firestore = useFirestore();

  const getCardBgColor = (remainingSeconds: number, totalSeconds: number) => {
    if (totalSeconds === 0) return 'bg-background';
    const percentage = (remainingSeconds / totalSeconds) * 100;
    if (percentage > 33) return 'bg-green-100/50 dark:bg-green-900/20';
    if (percentage > 11) return 'bg-yellow-100/50 dark:bg-yellow-900/20';
    return 'bg-red-100/50 dark:bg-red-900/20';
  }

  // Persists the teacher's live location + radius on the activeSessions doc
  // so that manual-code entry (which has no QR to read lat/lng from) can
  // enforce the exact same geofence check as the QR scan flow.
  const syncSessionLocation = async (lat: number | null, lng: number | null, expires: number) => {
    if (!sessionDocIdRef.current) return;
    try {
      await updateDoc(doc(firestore, 'activeSessions', sessionDocIdRef.current), {
        latitude: lat,
        longitude: lng,
        radius: sessionRadius,
        expiresAt: expires,
      });
    } catch (e) {
      console.error('Error syncing session location:', e);
    }
  };

  const generateQrCode = () => {
    if (!classInfo) return;
    const expires = Date.now() + QR_ROTATION_SECONDS * 1000;

    // Get teacher's current location and encode in QR
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(6);
          const lng = pos.coords.longitude.toFixed(6);
          const qrData = `ATTENDAVISION:class=${classInfo.id}&session=${sessionDocIdRef.current}&period=${sessionPeriodKeyRef.current}&expires=${expires}&radius=${sessionRadius}&lat=${lat}&lng=${lng}`;
          const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}&color=000000&bgcolor=FFFFFF&ecc=H`;
          setQrCodeUrl(apiUrl);
          syncSessionLocation(pos.coords.latitude, pos.coords.longitude, expires);
        },
        () => {
          // If location denied, generate without location
          const qrData = `ATTENDAVISION:class=${classInfo.id}&session=${sessionDocIdRef.current}&period=${sessionPeriodKeyRef.current}&expires=${expires}&radius=${sessionRadius}`;
          const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}&color=000000&bgcolor=FFFFFF&ecc=H`;
          setQrCodeUrl(apiUrl);
          syncSessionLocation(null, null, expires);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      const qrData = `ATTENDAVISION:class=${classInfo.id}&session=${sessionDocIdRef.current}&period=${sessionPeriodKeyRef.current}&expires=${expires}&radius=${sessionRadius}`;
      const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}&color=000000&bgcolor=FFFFFF&ecc=H`;
      setQrCodeUrl(apiUrl);
      syncSessionLocation(null, null, expires);
    }
  };

  useEffect(() => {
    if (classInfo) {
      setSessionName(`${classInfo.name} - Lecture`);
      setSessionRadius(classInfo.geofenceRadius || 30);
      setQrCodeUrl('');
      setSessionActive(false);
      setSessionTimeLeft(0);
      setQrTimeLeft(QR_ROTATION_SECONDS);
      setIsPaused(false);
      setDuration(900); // Reset to 15 mins
      setSessionDocId('');
      sessionDocIdRef.current = '';
      sessionPeriodKeyRef.current = '';
      sessionDateRef.current = '';
    }
  }, [classInfo]);

  useEffect(() => {
    if (!sessionActive || isPaused) return;

    if (sessionTimeLeft <= 0) {
      setSessionActive(false);
      setQrCodeUrl('');
      deactivateSessionInFirestore();
      if (classInfo && sessionDocIdRef.current) {
        onSessionComplete?.({
          classId: classInfo.id,
          sessionId: sessionDocIdRef.current,
          periodKey: sessionPeriodKeyRef.current,
          date: sessionDateRef.current,
        });
      }
      return;
    }

    const sessionTimer = setInterval(() => {
      setSessionTimeLeft(prev => prev - 1);
    }, 1000);

    const qrTimer = setInterval(() => {
      setQrTimeLeft(prev => {
        if (prev <= 1) {
          generateQrCode();
          return QR_ROTATION_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(sessionTimer);
      clearInterval(qrTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionTimeLeft, isPaused, sessionActive]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const startSession = async () => {
    const code = generateSessionCode();
    setSessionTimeLeft(duration);
    setTotalDuration(duration);
    setQrTimeLeft(QR_ROTATION_SECONDS);
    setSessionCode(code);
    setSessionActive(true);
    setIsPaused(false);
    // Save active session to Firestore first so students can use the manual
    // code, and so the doc id is ready before we try to sync location onto it.
    try {
      const docRef = await addDoc(collection(firestore, 'activeSessions'), {
        classId: classInfo!.id,
        className: classInfo!.name,
        code: code,
        active: true,
        radius: sessionRadius,
        latitude: null,
        longitude: null,
        date: new Date().toISOString().split('T')[0],
        periodKey: getCurrentPeriodKey(),
        createdAt: serverTimestamp(),
      });
      setSessionDocId(docRef.id);
      sessionDocIdRef.current = docRef.id;
      sessionPeriodKeyRef.current = getCurrentPeriodKey();
      sessionDateRef.current = new Date().toISOString().split('T')[0];
      await updateDoc(doc(firestore, 'activeSessions', docRef.id), { periodKey: sessionPeriodKeyRef.current });
    } catch(e) {
      console.error('Error saving session:', e);
    }
    generateQrCode();
  };

  const extendTime = (seconds: number) => {
    setSessionTimeLeft(prev => prev + seconds);
    setTotalDuration(prev => prev + seconds);
  };

  // Marks the Firestore session doc inactive. Split out from endSession so
  // it can also run from the dialog's X/Escape/outside-click path and from
  // the natural session-timer expiry — both of which previously left the
  // session "active" in Firestore even though the teacher's UI had reset,
  // letting a screenshotted/leaked QR keep working until its 10-minute
  // rotation window ran out.
  const deactivateSessionInFirestore = async () => {
    const id = sessionDocIdRef.current;
    if (!id) return;
    try {
      await updateDoc(doc(firestore, 'activeSessions', id), { active: false });
    } catch (e) {
      console.error('Error deactivating session:', e);
    }
  };

  const endSession = async () => {
    const wasActive = sessionActive;
    const info = classInfo && sessionDocIdRef.current
      ? { classId: classInfo.id, sessionId: sessionDocIdRef.current, periodKey: sessionPeriodKeyRef.current, date: sessionDateRef.current }
      : null;
    setSessionActive(false);
    setQrCodeUrl('');
    setSessionTimeLeft(0);
    await deactivateSessionInFirestore();
    setSessionDocId('');
    sessionDocIdRef.current = '';
    sessionPeriodKeyRef.current = '';
    sessionDateRef.current = '';
    // Ending early still finalizes attendance for whoever already scanned,
    // the same as letting the timer run out — so the teacher never has to
    // re-mark the class by hand afterwards.
    if (wasActive && info) onSessionComplete?.(info);
    onClose();
  }

  // Fires when the teacher closes the dialog via the X button, Escape key,
  // or clicking outside — not just the explicit "End Session" button. If a
  // session is currently active, treat this exactly like "End Session" so
  // the QR/manual code stop working immediately instead of staying valid
  // in Firestore until their timer naturally expires.
  const handleDialogOpenChange = (open: boolean) => {
    if (open) return;
    if (sessionActive || sessionDocIdRef.current) {
      endSession();
    } else {
      onClose();
    }
  };

  const handleDurationChange = (value: number[]) => {
    const seconds = value[0];
    setDuration(seconds);
  }

  if (!classInfo) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>QR Session for {classInfo.name}</DialogTitle>
          <DialogDescription>
            Create and manage the QR code attendance session for this class.
          </DialogDescription>
        </DialogHeader>
        
        {!sessionActive ? (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="session-name" className="text-right">
                Session Name
              </Label>
              <Input
                id="session-name"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="duration" className="text-right">
                Duration
              </Label>
              <div className="col-span-3 space-y-2">
                <Slider
                  id="duration"
                  min={15} // 15 seconds
                  max={14400} // 4 hours
                  step={15}
                  value={[duration]}
                  onValueChange={handleDurationChange}
                />
                 <div className="text-center text-sm text-muted-foreground">
                    {duration < 60 ? `${duration} seconds` : `${duration/60} minutes`}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-6">
            <Card className={cn("flex flex-col items-center justify-center p-6 transition-colors", getCardBgColor(sessionTimeLeft, totalDuration))}>
                <CardContent className='p-0 bg-white rounded-lg'>
                    {qrCodeUrl && !isPaused ? (
                        <Image src={qrCodeUrl} alt="Generated QR Code" width={300} height={300} className="rounded-lg" unoptimized />
                    ) : (
                        <div className="w-[300px] h-[300px] bg-muted rounded-lg flex flex-col items-center justify-center text-muted-foreground">
                            <Pause className='w-16 h-16'/>
                            <p>Session Paused</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">{sessionName}</p>
              <p className="font-mono text-4xl font-bold tracking-tighter">
                {formatTime(sessionTimeLeft)}
              </p>
              <Badge variant={isPaused ? "secondary" : "default"} className={isPaused ? 'bg-yellow-500 text-white' : 'bg-green-500'}>
                {isPaused ? 'Paused' : 'Active'}
              </Badge>
            </div>

            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Manual Entry Code</p>
              <p className="font-mono text-5xl font-bold tracking-widest text-primary">{sessionCode}</p>
              <p className="text-xs text-muted-foreground mt-1">Students can type this code instead of scanning</p>
            </div>
            
            <div className='w-full space-y-2'>
              <p className='text-center text-sm text-muted-foreground'>
                New code in {qrTimeLeft}s
              </p>
              <Progress value={(qrTimeLeft / QR_ROTATION_SECONDS) * 100} className='h-2' />
            </div>
            
            <div className="space-y-2">
              <Label>Session Radius Override</Label>
              <Select value={String(sessionRadius)} onValueChange={(value) => setSessionRadius(Number(value))}>
                  <SelectTrigger>
                      <SelectValue placeholder="Select a radius" />
                  </SelectTrigger>
                  <SelectContent>
                      {RADIUS_OPTIONS.map(r => (
                          <SelectItem key={r} value={String(r)}>{r} meters</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Manage Session</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setIsPaused(!isPaused)}>
                  {isPaused ? <Play className="mr-2 h-4 w-4" /> : <Pause className="mr-2 h-4 w-4" />}
                  {isPaused ? 'Resume' : 'Pause'}
                </Button>
                <Button variant="destructive" onClick={endSession}>
                    <Square className='mr-2 h-4 w-4'/>
                    End Session
                </Button>
              </div>
            </div>

            <div className="space-y-2">
                <Label>Extend Time</Label>
                <div className='flex gap-2'>
                    <Button variant='secondary' className='w-full' onClick={() => extendTime(300)}>+5 min</Button>
                    <Button variant='secondary' className='w-full' onClick={() => extendTime(600)}>+10 min</Button>
                    <Button variant='secondary' className='w-full' onClick={() => extendTime(900)}>+15 min</Button>
                </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {!sessionActive && (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={startSession}>Start Session</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
