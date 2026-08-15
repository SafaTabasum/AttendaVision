'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, serverTimestamp, doc, getDoc, getDocs, query, where, runTransaction } from 'firebase/firestore';
import { CalendarDays, CheckCircle2, CircleAlert, ScanLine, TrendingUp, XCircle, Users, RotateCcw, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { format, isSameDay, startOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { StudentPage, SectionCard } from '@/components/student/student-page';
import { PERIOD_TIMES, SUBJECTS, TIMETABLE, getTeacherNameByEmail } from '@/lib/timetable';
import { formatTime24to12 } from '@/lib/utils';
import { useDataContext } from '@/context/data-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QrSessionManager } from '@/components/dashboard/qr-session-manager';
import { useToast } from '@/hooks/use-toast';

type AttendanceStatus = 'present' | 'absent';

const keyForDate = (date: Date) => format(date, 'yyyy-MM-dd');

function getDayKey(date: Date) { return ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][date.getDay()]; }

function getCurrentPeriodKey(date = new Date()) {
  const minutes = date.getHours() * 60 + date.getMinutes();
  const slots = [
    [570, 630, 'P1'], [630, 690, 'P2'], [690, 750, 'P3'],
    [810, 870, 'P4'], [870, 930, 'P5'], [930, 990, 'P6'],
  ] as const;
  const slot = slots.find(([start, end]) => minutes >= start && minutes < end);
  return slot?.[2] || `OFF-${date.getHours()}-${Math.floor(date.getMinutes() / 30)}`;
}

function rollNumber(student: any) {
  const email = String(student.email || '');
  const match = email.match(/^(\d+)@/);
  return match?.[1] || String(student.id || '');
}


function DailyAttendance({ selectedDate, setSelectedDate }: { selectedDate: Date; setSelectedDate: (date: Date) => void }) {
  const { attendance } = useDataContext();
  const date = keyForDate(selectedDate);
  const records = useMemo(() => attendance.filter(record => record.date === date), [attendance, date]);
  const dateChoices = Array.from({ length: 5 }, (_, index) => { const d = new Date(selectedDate); d.setDate(d.getDate() - 2 + index); return d; });

  return <SectionCard title="Daily attendance" icon={CalendarDays}>
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="student-scroll-x flex min-w-0 gap-2 overflow-x-auto">
        {dateChoices.map(dateItem => <button key={keyForDate(dateItem)} onClick={() => setSelectedDate(startOfDay(dateItem))} className={`min-w-[68px] rounded-2xl px-3 py-2 text-center transition ${isSameDay(dateItem, selectedDate) ? 'bg-[#37336e] text-white shadow-sm' : 'bg-[#f5f4fb] text-slate-600'}`}><span className="block text-[10px] font-semibold">{format(dateItem, 'EEE')}</span><span className="mt-0.5 block text-sm font-extrabold">{format(dateItem, 'dd')}</span></button>)}
      </div>
      <Dialog><DialogTrigger asChild><button className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#37336e] text-white shadow-sm" aria-label="Select attendance date"><CalendarDays className="h-5 w-5" /></button></DialogTrigger><DialogContent className="w-[calc(100%-32px)] max-w-sm rounded-3xl"><DialogHeader><DialogTitle>Select date</DialogTitle></DialogHeader><div className="mx-auto rounded-2xl border border-slate-100 bg-white p-1"><Calendar mode="single" selected={selectedDate} onSelect={dateItem => dateItem && setSelectedDate(startOfDay(dateItem))} initialFocus /></div><p className="text-center text-xs text-slate-500">Selected: {format(selectedDate, 'EEE, MMM d, yyyy')}</p></DialogContent></Dialog>
    </div>
    <div className="mb-4 rounded-2xl bg-[#f5f4fb] px-4 py-3"><p className="text-sm font-extrabold text-[#171827]">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p><p className="mt-1 text-[11px] text-slate-500">{records.length ? `${records.length} attendance record${records.length === 1 ? '' : 's'} recorded` : 'No attendance recorded for this day'}</p></div>
    {records.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center"><CalendarDays className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-600">No attendance recorded</p><p className="mt-1 text-xs text-slate-400">Attendance will appear here only after it is actually recorded.</p></div> : <div className="space-y-2">{records.map(record => <div key={record.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm"><div className="min-w-0 flex-1"><p className="text-sm font-bold">{(record as any).className || record.classId}</p><p className="mt-1 text-[10px] text-slate-400">{record.date}</p></div><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${record.status === 'present' || record.status === 'late' ? 'bg-[#e8f5ed] text-[#3d8b61]' : 'bg-[#fde8e8] text-[#d45454]'}`}>{record.status === 'present' ? <CheckCircle2 className="h-3.5 w-3.5" /> : record.status === 'late' ? <CircleAlert className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}{record.status === 'late' ? 'Late' : record.status === 'present' ? 'Present' : 'Absent'}</span></div>)}</div>}
  </SectionCard>;
}

function TeacherAttendance() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { students, classes, attendance } = useDataContext();
  const { toast } = useToast();
  // Only show classes/labs that belong to this teacher (matched via the
  // teacherEmail on each subject in timetable.ts) — previously every
  // teacher saw the full subject list and the dropdown just defaulted to
  // whichever subject came first (ETC), regardless of who was logged in.
  const teacherEmail = (user?.email || '').toLowerCase();
  const attendanceClasses = useMemo(
    () => classes.filter(c => c.id !== 'NAMAZ' && SUBJECTS[c.id]?.teacherEmail?.toLowerCase() === teacherEmail),
    [classes, teacherEmail]
  );
  const [selectedClass, setSelectedClass] = useState('');
  useEffect(() => {
    // Once the teacher's own classes are known, default to the first one
    // instead of leaving the dropdown on an empty/wrong selection.
    if (attendanceClasses.length && !attendanceClasses.some(c => c.id === selectedClass)) {
      setSelectedClass(attendanceClasses[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendanceClasses]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<{ id: string; periodKey: string } | null>(null);
  const [submissionLocked, setSubmissionLocked] = useState(false);

  const date = keyForDate(selectedDate);
  const selectedCourse = classes.find(c => c.id === selectedClass);
  const classStudents = useMemo(() => [...students].sort((a, b) => rollNumber(a).localeCompare(rollNumber(b), undefined, { numeric: true })), [students]);
  const useLiveSession = date === keyForDate(new Date());
  const periodKey = (useLiveSession ? activeSession?.periodKey : null) || getCurrentPeriodKey(selectedDate);
  const existing = useMemo(() => attendance.filter(a => a.classId === selectedClass && a.date === date && ((a as any).periodKey === periodKey || (!(a as any).periodKey && periodKey === 'P1'))), [attendance, selectedClass, date, periodKey]);
  const currentStatus = (id: string): AttendanceStatus => statuses[id] || (existing.find(a => a.studentId === id)?.status === 'present' ? 'present' : 'absent');
  const absentCount = classStudents.filter(s => currentStatus(s.id) === 'absent').length;
  const presentCount = classStudents.length - absentCount;

  useEffect(() => {
    let cancelled = false;
    const loadActiveSession = async () => {
      if (!firestore || !selectedClass) return;
      try {
        const q = query(collection(firestore, 'activeSessions'), where('classId', '==', selectedClass), where('active', '==', true));
        const snap = await getDocs(q);
        const today = keyForDate(new Date());
        const match = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })).find(s => (s.date || today) === today);
        if (!cancelled && match) setActiveSession({ id: match.id, periodKey: match.periodKey || getCurrentPeriodKey() });
        else if (!cancelled) setActiveSession(null);
      } catch {
        if (!cancelled) setActiveSession(null);
      }
    };
    loadActiveSession();
    const timer = setInterval(loadActiveSession, 3000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [firestore, selectedClass]);

  useEffect(() => {
    let cancelled = false;
    const checkLock = async () => {
      if (!firestore || !selectedClass) return;
      const lockId = `${selectedClass}_${date}_${periodKey}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      try {
        const snap = await getDoc(doc(firestore, 'attendanceSubmissions', lockId));
        if (!cancelled) setSubmissionLocked(snap.exists());
      } catch { if (!cancelled) setSubmissionLocked(false); }
    };
    checkLock();
    return () => { cancelled = true; };
  }, [firestore, selectedClass, date, periodKey, activeSession?.id]);

  const setStudentStatus = (id: string, status: AttendanceStatus) => setStatuses(prev => ({ ...prev, [id]: status }));
  const markAllAbsent = () => setStatuses(Object.fromEntries(classStudents.map(s => [s.id, 'absent'])));
  const resetStatuses = () => setStatuses({});

  // Shared by the manual "Submit Attendance" button and by the QR scanner's
  // auto-finalize (see onQrSessionComplete below) so both paths write
  // attendance/notifications the exact same way. `statusFor` decides
  // present/absent per student: the manual button uses whatever the teacher
  // has toggled on screen (currentStatus), auto-finalize uses "present only
  // if they actually scanned/entered the code".
  const finalizeAttendance = async (opts: {
    classId: string; className: string; date: string; periodKey: string;
    sessionId: string | null; students: typeof classStudents; existingForPeriod: typeof existing;
    statusFor: (studentId: string) => AttendanceStatus;
  }) => {
    if (!firestore || !user) return false;
    const { classId, className, date: targetDate, periodKey: targetPeriod, sessionId, students: targetStudents, existingForPeriod, statusFor } = opts;
    const lockId = `${classId}_${targetDate}_${targetPeriod}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const lockRef = doc(firestore, 'attendanceSubmissions', lockId);
    const absentStudents = targetStudents.filter(student => statusFor(student.id) === 'absent');
    const notificationRefs = absentStudents.map(() => doc(collection(firestore, 'notifications')));

    await runTransaction(firestore, async transaction => {
      const lockSnap = await transaction.get(lockRef);
      if (lockSnap.exists()) throw new Error('ATTENDANCE_ALREADY_SUBMITTED');

      const attendanceRefs = targetStudents.map(student => {
        const old = existingForPeriod.find(a => a.studentId === student.id);
        return old?.id
          ? doc(firestore, 'attendance', old.id)
          : doc(firestore, 'attendance', `${student.id}_${classId}_${targetDate}_${targetPeriod}`.replace(/[^a-zA-Z0-9_-]/g, '_'));
      });
      const existingSnaps = await Promise.all(attendanceRefs.map(ref => transaction.get(ref)));

      transaction.set(lockRef, {
        lockId, classId, className, date: targetDate, periodKey: targetPeriod,
        sessionId: sessionId || null, teacherId: user.uid, submittedAt: serverTimestamp(),
      });

      targetStudents.forEach((student, index) => {
        const status = statusFor(student.id);
        const old = existingForPeriod.find(a => a.studentId === student.id);
        const ref = attendanceRefs[index];
        if (old?.id || existingSnaps[index].exists()) {
          transaction.update(ref, {
            status, markedAt: serverTimestamp(), markedBy: user.uid,
            method: (old as any)?.method === 'qr_scan' || existingSnaps[index].data()?.method === 'qr_scan' ? 'qr_scan' : 'teacher_manual',
          });
        } else {
          transaction.set(ref, {
            studentId: student.id, studentEmail: student.email || '', studentName: student.name,
            classId, className, date: targetDate, periodKey: targetPeriod,
            sessionId: sessionId || null, status,
            method: 'teacher_manual', markedBy: user.uid, markedAt: serverTimestamp(),
          });
        }
      });

      // Create the absent-student notifications in the same transaction as
      // attendance, so the submission and its alerts succeed or fail together.
      absentStudents.forEach((student, index) => {
        transaction.set(notificationRefs[index], {
          type: 'attendance',
          title: 'Attendance',
          body: 'Maintain 75% of attendance is mandatory',
          studentId: student.id,
          classId,
          uploaderId: user.uid,
          uploaderName: teacherDisplayName,
          audience: 'class',
          createdAt: serverTimestamp(),
        });
      });
    });

    return true;
  };

  const submitAttendance = async () => {
    if (!firestore || !selectedCourse || !user || submissionLocked) return;
    setSaving(true);
    try {
      await finalizeAttendance({
        classId: selectedCourse.id, className: selectedCourse.name, date, periodKey,
        sessionId: (useLiveSession ? activeSession?.id : null) || null,
        students: classStudents, existingForPeriod: existing,
        statusFor: (id) => currentStatus(id),
      });
      setSubmissionLocked(true);
      toast({ title: 'Attendance submitted', description: `${presentCount} present · ${absentCount} absent` });
      setStatuses({});
    } catch (error: any) {
      if (error?.message === 'ATTENDANCE_ALREADY_SUBMITTED') {
        setSubmissionLocked(true);
        toast({ variant: 'destructive', title: 'Attendance already submitted', description: 'This period has already been submitted. It cannot be submitted again.' });
      } else {
        console.error(error);
        toast({ variant: 'destructive', title: 'Could not submit attendance', description: 'Please check your Firebase permissions and try again.' });
      }
    } finally { setSaving(false); }
  };

  // Runs when the QR/code scanner's window closes (full duration elapsed,
  // or the teacher ends it early) — see QrSessionManager's onSessionComplete.
  // Whoever scanned in time is finalized as Present and everyone else in
  // the class as Absent automatically, so the teacher never has to open the
  // manual roll-call and re-mark the same class by hand.
  const onQrSessionComplete = async (info: { classId: string; sessionId: string; periodKey: string; date: string }) => {
    const course = classes.find(c => c.id === info.classId);
    if (!course) return;
    const targetDate = info.date || keyForDate(new Date());
    const scannedIds = new Set(
      attendance
        .filter(a => a.classId === info.classId && a.date === targetDate && (a as any).periodKey === info.periodKey && (a.status === 'present' || a.status === 'late'))
        .map(a => a.studentId)
    );
    const existingForPeriod = attendance.filter(a => a.classId === info.classId && a.date === targetDate && (a as any).periodKey === info.periodKey);
    try {
      await finalizeAttendance({
        classId: course.id, className: course.name, date: targetDate, periodKey: info.periodKey,
        sessionId: info.sessionId, students: classStudents, existingForPeriod,
        statusFor: (id) => (scannedIds.has(id) ? 'present' : 'absent'),
      });
      if (targetDate === date && info.classId === selectedClass && info.periodKey === periodKey) setSubmissionLocked(true);
      toast({ title: 'Scanner session ended', description: `Attendance auto-marked for ${course.name} — no need to submit again.` });
    } catch (error: any) {
      // Already submitted (e.g. teacher also hit Submit manually) is expected and fine to ignore.
      if (error?.message !== 'ATTENDANCE_ALREADY_SUBMITTED') {
        console.error('Auto-finalize attendance error:', error);
      }
    }
  };

  // Memoized so the object identity stays stable across re-renders (e.g.
  // when Firestore's activeSessions listener fires while a QR session is
  // running). QrSessionManager resets its whole session state whenever
  // `classInfo` changes identity, so a fresh object on every render was
  // wiping out the active QR/session seconds after it started.
  const teacherDisplayName = user?.displayName || getTeacherNameByEmail(user?.email) || 'Faculty';
  const classInfo = useMemo(
    () => (selectedCourse ? { id: selectedCourse.id, name: selectedCourse.name, time: 'Today', prof: teacherDisplayName, room: 'Room 423', geofenceRadius: selectedCourse.geofenceRadius } : null),
    [selectedCourse?.id, selectedCourse?.name, selectedCourse?.geofenceRadius, teacherDisplayName]
  );

  return <div className="min-h-[calc(100vh-56px)] bg-[#f7f7f7] px-4 pb-10 pt-4 md:px-8"><div className="mx-auto max-w-6xl">
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Faculty attendance</p><h1 className="mt-1 text-2xl font-extrabold">Take Attendance</h1><p className="mt-1 text-xs text-slate-500">Choose a class, review the list, then submit attendance.</p></div><div className="flex gap-2"><Button onClick={() => setScannerOpen(true)} disabled={!classInfo} className="rounded-xl bg-[#193d64]"><ScanLine className="mr-2 h-4 w-4" />Create Scanner</Button></div></div>
    {attendanceClasses.length === 0 ? (
      <Card className="rounded-2xl border-0 shadow-sm"><CardContent className="p-8 text-center"><p className="text-sm font-semibold text-slate-600">No classes are assigned to your account yet.</p><p className="mt-1 text-xs text-slate-400">Your login email ({user?.email}) doesn't match any subject's teacher email in the timetable. Ask the admin to fix this in src/lib/timetable.ts.</p></CardContent></Card>
    ) : (
    <>
    <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]"><Card className="rounded-2xl border-0 shadow-sm"><CardContent className="p-4"><div className="grid gap-3 sm:grid-cols-2"><div><p className="mb-2 text-xs font-semibold text-slate-500">Class</p><Select value={selectedClass} onValueChange={(value) => { setSelectedClass(value); setStatuses({}); }}><SelectTrigger className="rounded-xl"><SelectValue placeholder="Choose class" /></SelectTrigger><SelectContent>{attendanceClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div><div><p className="mb-2 text-xs font-semibold text-slate-500">Date</p><div className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold">{format(selectedDate, 'dd MMM yyyy')}</div></div></div></CardContent></Card><Card className="rounded-2xl border-0 shadow-sm"><CardContent className="flex h-full items-center gap-5 p-4"><div><p className="text-xs text-slate-400">Present</p><p className="text-xl font-extrabold text-[#3d8b61]">{presentCount}</p></div><div><p className="text-xs text-slate-400">Absent</p><p className="text-xl font-extrabold text-[#d45454]">{absentCount}</p></div></CardContent></Card></div>
    <Card className="rounded-2xl border-0 shadow-sm"><CardContent className="p-4 md:p-6"><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs text-slate-400">{selectedCourse?.name || 'Select a class'}</p><p className="mt-1 text-sm font-bold">{submissionLocked ? 'Attendance for this period is already submitted.' : 'Students who scanned are Present; others start as Absent until you mark them Present.'}</p></div><div className="flex gap-2"><Button variant="ghost" onClick={markAllAbsent} className="text-[#365a78]">Mark all as absent</Button><Button variant="ghost" onClick={resetStatuses} className="text-[#d58b4d]"><RotateCcw className="mr-1 h-4 w-4" />Reset</Button></div></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{classStudents.map(student => { const status = currentStatus(student.id); return <button key={student.id} type="button" onClick={() => setStudentStatus(student.id, status === 'present' ? 'absent' : 'present')} className={`relative min-h-[92px] rounded-2xl border-2 bg-white p-4 text-left transition ${status === 'absent' ? 'border-[#d85a4f]' : 'border-[#9bc56e]'}`}><span className="absolute right-2 top-2 rounded-md px-1.5 py-0.5 text-[9px] font-extrabold text-white" style={{ background: status === 'absent' ? '#d85a4f' : '#8bbd5c' }}>{status === 'absent' ? 'Ab' : 'P'}</span><span className="block truncate text-sm font-extrabold">{student.name}</span><span className="mt-1 block text-[10px] text-slate-400">{rollNumber(student)}</span></button> })}</div>{classStudents.length === 0 && <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">No students are configured for this class.</div>}<Button onClick={submitAttendance} disabled={saving || classStudents.length === 0 || submissionLocked} className="mt-5 h-12 w-full rounded-2xl bg-[#193d64] text-base font-bold hover:bg-[#153452]">{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : submissionLocked ? 'Attendance Already Submitted' : <><Save className="mr-2 h-4 w-4" />Submit Attendance</>}</Button></CardContent></Card>
    <Card className="mt-4 rounded-2xl border-0 shadow-sm"><CardContent className="p-4"><div className="mb-3 flex items-center gap-2"><ScanLine className="h-5 w-5 text-[#193d64]" /><div><p className="font-bold">QR Attendance</p><p className="text-xs text-slate-500">Create a timed QR scanner for students.</p></div></div><Button onClick={() => setScannerOpen(true)} disabled={!classInfo} className="w-full rounded-xl bg-[#193d64]"><ScanLine className="mr-2 h-4 w-4" />Create Scanner</Button></CardContent></Card>
    <QrSessionManager classInfo={classInfo} isOpen={scannerOpen} onClose={() => setScannerOpen(false)} onSessionComplete={onQrSessionComplete} />
    </>
    )}
  </div></div>;
}

export default function AttendancePage() {
  const { user } = useUser();
  const { attendance } = useDataContext();
  const teacher = user?.email?.endsWith('@teacher.com') || user?.email?.endsWith('@faculty.com');
  const [selectedDate, setSelectedDate] = useState(new Date());

  if (teacher) return <TeacherAttendance />;

  const mine = attendance.filter(record => record.studentId === user?.uid);
  const total = mine.length;
  const present = mine.filter(r => r.status === 'present' || r.status === 'late').length;
  const absent = mine.filter(r => r.status === 'absent').length;
  const overall = total ? Math.round((present / total) * 1000) / 10 : null;

  const bySubject = Object.values(SUBJECTS)
    .filter(subject => subject.code !== 'NAMAZ' && subject.teacherName)
    .map(subject => {
      const records = mine.filter(r => r.classId === subject.code || (r as any).subjectId === subject.code || (r as any).subjectCode === subject.code);
      const p = records.filter(r => r.status === 'present' || r.status === 'late').length;
      return { name: subject.name, shortName: subject.shortName, pct: records.length ? Math.round((p / records.length) * 100) : null, total: records.length };
    }).filter(row => row.total > 0);

  const missed = absent;

  return <StudentPage title="Attendance">
    <Card className="student-card mb-4 overflow-hidden bg-[#37336e] text-white"><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-white/70">Overall attendance</p><p className="mt-1 text-3xl font-extrabold">{overall === null ? '—' : `${overall}%`}</p><p className="mt-1 text-xs text-white/70">Based only on recorded attendance</p></div><TrendingUp className="h-8 w-8 text-white/70" /></div></CardContent></Card>
    <div className="mb-4 grid grid-cols-2 gap-3"><Card className="student-card"><CardContent className="p-4"><CheckCircle2 className="mb-2 h-5 w-5 text-[#3d8b61]" /><p className="text-xl font-bold">{overall === null ? '—' : `${overall}%`}</p><p className="text-[10px] text-slate-400">Total attendance</p></CardContent></Card><Card className="student-card"><CardContent className="p-4"><CircleAlert className="mb-2 h-5 w-5 text-[#d58b4d]" /><p className="text-xl font-bold">{missed}</p><p className="text-[10px] text-slate-400">Classes missed</p></CardContent></Card></div>
    <SectionCard title="Attendance overview"><div className="rounded-2xl bg-[#fafbfe] p-3"><div className="mb-2 flex items-end justify-between"><div><p className="text-[10px] text-slate-400">Subject performance</p><p className="text-sm font-bold">Recorded subjects only</p></div><span className="rounded-full bg-[#e8f5ed] px-2.5 py-1 text-[10px] font-bold text-[#3d8b61]">{overall === null ? '—' : `${overall}% overall`}</span></div>{bySubject.length ? <div className="flex h-36 items-end justify-between gap-2 border-b border-slate-200 px-2 pt-4">{bySubject.map(row => <div key={row.name} className="flex h-full flex-1 flex-col items-center justify-end gap-1"><span className="text-[9px] font-bold text-slate-500">{row.pct}%</span><div className="w-full max-w-[34px] rounded-t-lg bg-[#55a6bb]" style={{ height: `${Math.max(16, (row.pct || 0) * 0.82)}%` }} /><span className="w-14 truncate text-center text-[8px] text-slate-400">{row.shortName}</span></div>)}</div> : <div className="flex h-36 items-center justify-center text-xs text-slate-400">No attendance records yet.</div>}</div></SectionCard>
    <SectionCard title="Subject-wise attendance"><div className="space-y-4">{bySubject.length ? bySubject.map(row => <div key={row.name}><div className="mb-1 flex justify-between text-xs"><span className="font-semibold">{row.name}</span><span className="font-bold">{row.pct}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#55a6bb]" style={{ width: `${row.pct}%` }} /></div></div>) : <div className="rounded-2xl border border-dashed p-6 text-center text-xs text-slate-400">No subject attendance recorded yet.</div>}</div></SectionCard>
    <div className="mt-4"><DailyAttendance selectedDate={selectedDate} setSelectedDate={setSelectedDate} /></div>
    <Link href="/scan"><Button className="mt-4 w-full rounded-xl bg-[#37336e]"><ScanLine className="mr-2 h-4 w-4" />Mark attendance</Button></Link>
  </StudentPage>;
}
