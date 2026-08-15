'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  GraduationCap,
  MapPin,
  Users,
  ScanLine,
  ClipboardCheck,
  BriefcaseBusiness,
  Megaphone,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useDataContext } from '@/context/data-context';
import { QrSessionManager } from '@/components/dashboard/qr-session-manager';
import { getTodaySchedule, getPeriodStatus, DAY_NAMES, getTeacherNameByEmail } from '@/lib/timetable';
import { formatTime24to12 } from '@/lib/utils';

const teacherEssentials = [
  { href: '/requests', label: 'Requests', icon: ClipboardCheck, tone: 'bg-[#e8f0df] text-[#6f9b45]' },
  { href: '/clubs', label: 'Clubs', icon: Users, tone: 'bg-[#d7ebf0] text-[#4f9cb4]' },
  { href: '/events', label: 'Campus Events', icon: MapPin, tone: 'bg-[#ddd9ee] text-[#6750ad]' },
];

const studentQuickTiles = [
  { href: '/attendance', label: 'Attendance', icon: CheckCircle2, tone: 'bg-[#e8f5ed] text-[#3d8b61]' },
  { href: '/events', label: 'Campus Events', icon: CalendarDays, tone: 'bg-[#eee9ff] text-[#6655b5]' },
  { href: '/clubs', label: 'Campus Clubs', icon: Users, tone: 'bg-[#e8f2ff] text-[#4d7bb7]' },
];

const teacherTools = [
  { href: '/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/attendance', label: 'Attendance', icon: CheckCircle2 },
  { href: '/resources', label: 'Resources', icon: BookOpen },
];

const studentTools = [
  { href: '/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/resources', label: 'Resources', icon: BookOpen },
];

function StudentDashboard() {
  const { user } = useUser();
  const { attendance, students } = useDataContext();
  const [greeting, setGreeting] = useState('Good Evening');
  const todaySchedule = getTodaySchedule();
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const todayKey = days[new Date().getDay()];
  const todayName = DAY_NAMES[todayKey] || 'Sunday';

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening');
  }, []);

  const nextClass = todaySchedule.find((x) => getPeriodStatus(x.period.startTime, x.period.endTime) !== 'done');
  const studentId = students.find((student) => student.email?.toLowerCase() === user?.email?.toLowerCase())?.id || user?.uid;
  const studentAttendance = attendance.filter((record) => record.studentId === studentId);
  const attendanceTotal = studentAttendance.length;
  const attendancePresent = studentAttendance.filter((record) => record.status === 'present' || record.status === 'late').length;
  const attendancePercentage = attendanceTotal ? Math.round((attendancePresent / attendanceTotal) * 1000) / 10 : null;

  return (
    <div className="student-mobile-surface px-4 pb-6 pt-3 md:max-w-6xl md:px-8">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500">{greeting}!</p>
          <h1 className="mt-1 text-[22px] font-extrabold tracking-tight text-[#171827]">Welcome, {user?.displayName || 'Student'}</h1>
          <p className="mt-1 text-xs text-slate-500">{format(new Date(), 'EEEE, MMMM d')} · IT · II-A · Room 423</p>
        </div>
        <Link href="/notifications" className="relative mt-1 rounded-full p-2 text-[#37336e] hover:bg-white"><Bell className="h-5 w-5" /><span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#ed6b83]" /></Link>
      </div>

      <Card className="student-card mb-5 overflow-hidden bg-[#37336e] text-white"><CardContent className="relative p-5"><div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/10" /><div className="relative"><div className="flex items-center gap-2 text-xs text-white/80"><GraduationCap className="h-4 w-4" /> II-A · Academic Year 2026–27</div><h2 className="mt-3 text-lg font-bold">Your attendance at a glance</h2><div className="mt-4 flex items-end justify-between"><div><p className="text-3xl font-extrabold">{attendancePercentage === null ? '—' : `${attendancePercentage}%`}</p><p className="text-xs text-white/70">Overall attendance</p></div><Link href="/attendance"><Button size="sm" className="rounded-full bg-white text-[#37336e] hover:bg-white/90">View details <ArrowRight className="ml-1 h-4 w-4" /></Button></Link></div></div></CardContent></Card>

      <section className="mb-5"><div className="mb-3 flex items-center justify-between"><h2 className="text-base font-bold">Essentials</h2><Link href="/schedule" className="text-xs font-semibold text-[#37336e]">View all</Link></div><div className="grid grid-cols-2 gap-3 md:grid-cols-3">{studentQuickTiles.map((tile) => <Link key={tile.href} href={tile.href}><Card className="student-card h-full transition hover:-translate-y-0.5"><CardContent className="p-4"><div className={`student-icon-tile mb-3 flex h-11 w-11 items-center justify-center ${tile.tone}`}><tile.icon className="h-5 w-5" /></div><p className="text-sm font-bold">{tile.label}</p><p className="mt-1 text-[11px] text-slate-400">Tap to open</p></CardContent></Card></Link>)}</div></section>

      <section className="mb-5"><div className="mb-3 flex items-center justify-between"><h2 className="text-base font-bold">Today&apos;s schedule</h2><Link href="/schedule" className="text-xs font-semibold text-[#37336e]">Full timetable</Link></div><Card className="student-card"><CardContent className="p-4"><div className="mb-3 flex items-center justify-between rounded-xl bg-[#f5f4fb] px-3 py-2"><span className="text-xs font-semibold text-[#37336e]">{todayName}</span><span className="text-[11px] text-slate-500">Room 423</span></div>{nextClass && <div className="mb-3 rounded-xl border border-[#dddaf2] bg-white p-3"><div className="flex items-center justify-between"><div><p className="text-sm font-bold">{nextClass.subject.name}</p><p className="mt-1 text-[11px] text-slate-500"><Clock3 className="mr-1 inline h-3 w-3" />{formatTime24to12(nextClass.period.startTime)} – {formatTime24to12(nextClass.period.endTime)}</p></div><Badge className="bg-[#e9e7fb] text-[#37336e] hover:bg-[#e9e7fb]">{getPeriodStatus(nextClass.period.startTime, nextClass.period.endTime) === 'active' ? 'Live' : 'Next'}</Badge></div></div>}<div className="space-y-2">{todaySchedule.slice(0, 4).map((item, i) => <div key={i} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0"><div><p className="text-xs font-semibold">{item.subject.shortName}</p><p className="text-[10px] text-slate-400">{formatTime24to12(item.period.startTime)} – {formatTime24to12(item.period.endTime)}</p></div><span className="text-[10px] text-slate-400">{item.subject.teacherName || 'Academic activity'}</span></div>)}</div></CardContent></Card></section>

      <section className="mb-5"><h2 className="mb-3 text-base font-bold">Tools</h2><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">{studentTools.map((tile) => <Link key={tile.href} href={tile.href} className="rounded-2xl bg-white p-3 text-center shadow-sm hover:shadow"><div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#f1effa] text-[#4b4680]"><tile.icon className="h-4 w-4" /></div><span className="text-[10px] font-semibold leading-tight">{tile.label}</span></Link>)}</div></section>

      <section><Link href="/notices"><Card className="student-card"><CardContent className="flex items-center gap-3 p-4"><div className="rounded-xl bg-[#eef4ff] p-3 text-[#4b76b5]"><FileText className="h-5 w-5" /></div><div className="flex-1"><p className="text-sm font-bold">Digital Notice Board</p><p className="text-xs text-slate-500">Department announcements from the Dean</p></div><ChevronRight className="h-4 w-4 text-slate-400" /></CardContent></Card></Link></section>
    </div>
  );
}

function TeacherDashboard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { classes, attendance, students } = useDataContext();
  const [greeting, setGreeting] = useState('Good Evening');
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening');
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const todayRecords = attendance.filter((record) => record.date === today);
  const presentToday = todayRecords.filter((record) => record.status === 'present' || record.status === 'late').length;
  const absentToday = todayRecords.filter((record) => record.status === 'absent').length;
  const nextClass = getTodaySchedule().find((item) => getPeriodStatus(item.period.startTime, item.period.endTime) !== 'done');
  const defaultClass = classes[0] || null;
  // Auth displayName is usually empty for these accounts (provisioned
  // directly in Firebase, no signup form), so fall back to the teacher's
  // real name from the timetable instead of the generic "Faculty".
  const teacherDisplayName = user?.displayName || getTeacherNameByEmail(user?.email) || 'Faculty';

  const classInfo = useMemo(() => {
    if (!defaultClass) return null;
    return {
      id: defaultClass.id,
      name: defaultClass.name,
      time: nextClass ? `${formatTime24to12(nextClass.period.startTime)} – ${formatTime24to12(nextClass.period.endTime)}` : 'Today',
      prof: teacherDisplayName,
      room: 'Room 423',
      geofenceRadius: defaultClass.geofenceRadius,
    };
  }, [defaultClass, nextClass, teacherDisplayName]);

  // Runs when the "Create Scanner" shortcut's QR/code window closes (full
  // duration elapsed, or the teacher ends it early). Students who scanned
  // in time are locked in as Present and the rest of the class as Absent —
  // automatically — so nobody has to re-open Attendance and mark the class
  // by hand afterwards.
  const onQrSessionComplete = async (info: { classId: string; sessionId: string; periodKey: string; date: string }) => {
    if (!firestore) return;
    const course = classes.find(c => c.id === info.classId);
    if (!course) return;
    const targetDate = info.date || new Date().toISOString().split('T')[0];
    const scannedIds = new Set(
      attendance
        .filter(a => a.classId === info.classId && a.date === targetDate && (a as any).periodKey === info.periodKey && (a.status === 'present' || a.status === 'late'))
        .map(a => a.studentId)
    );
    const existingForPeriod = attendance.filter(a => a.classId === info.classId && a.date === targetDate && (a as any).periodKey === info.periodKey);
    const lockId = `${info.classId}_${targetDate}_${info.periodKey}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const lockRef = doc(firestore, 'attendanceSubmissions', lockId);
    const absentStudents = students.filter(student => !scannedIds.has(student.id));
    const notificationRefs = absentStudents.map(() => doc(collection(firestore, 'notifications')));

    try {
      await runTransaction(firestore, async transaction => {
        const lockSnap = await transaction.get(lockRef);
        if (lockSnap.exists()) throw new Error('ATTENDANCE_ALREADY_SUBMITTED');

        const attendanceRefs = students.map(student => {
          const old = existingForPeriod.find(a => a.studentId === student.id);
          return old?.id
            ? doc(firestore, 'attendance', old.id)
            : doc(firestore, 'attendance', `${student.id}_${info.classId}_${targetDate}_${info.periodKey}`.replace(/[^a-zA-Z0-9_-]/g, '_'));
        });
        const existingSnaps = await Promise.all(attendanceRefs.map(ref => transaction.get(ref)));

        transaction.set(lockRef, {
          lockId, classId: info.classId, className: course.name, date: targetDate, periodKey: info.periodKey,
          sessionId: info.sessionId || null, teacherId: user?.uid, submittedAt: serverTimestamp(),
        });

        students.forEach((student, index) => {
          const status = scannedIds.has(student.id) ? 'present' : 'absent';
          const old = existingForPeriod.find(a => a.studentId === student.id);
          const ref = attendanceRefs[index];
          if (old?.id || existingSnaps[index].exists()) {
            transaction.update(ref, {
              status, markedAt: serverTimestamp(), markedBy: user?.uid,
              method: (old as any)?.method === 'qr_scan' || existingSnaps[index].data()?.method === 'qr_scan' ? 'qr_scan' : 'teacher_manual',
            });
          } else {
            transaction.set(ref, {
              studentId: student.id, studentEmail: student.email || '', studentName: student.name,
              classId: info.classId, className: course.name, date: targetDate, periodKey: info.periodKey,
              sessionId: info.sessionId || null, status,
              method: 'teacher_manual', markedBy: user?.uid, markedAt: serverTimestamp(),
            });
          }
        });

        absentStudents.forEach((student, index) => {
          transaction.set(notificationRefs[index], {
            type: 'attendance', title: 'Attendance', body: 'Maintain 75% of attendance is mandatory',
            studentId: student.id, classId: info.classId, uploaderId: user?.uid,
            uploaderName: teacherDisplayName, audience: 'class', createdAt: serverTimestamp(),
          });
        });
      });
      toast({ title: 'Scanner session ended', description: `Attendance auto-marked for ${course.name} — no need to submit again.` });
    } catch (error: any) {
      if (error?.message !== 'ATTENDANCE_ALREADY_SUBMITTED') {
        console.error('Auto-finalize attendance error:', error);
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#f7f7f7] px-4 pb-10 pt-3 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex items-center justify-between md:mb-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Faculty dashboard</p>
            <h1 className="mt-1 text-[24px] font-extrabold tracking-tight text-[#171717]">Hi {teacherDisplayName},</h1>
            <p className="mt-0.5 text-sm font-medium text-slate-600">{greeting}</p>
          </div>
          <Link href="/notifications" className="relative rounded-full bg-white p-3 shadow-sm"><Bell className="h-5 w-5 text-[#17233b]" /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#d94e57]" /></Link>
        </div>

        <Card className="mb-5 overflow-hidden rounded-[24px] border-0 bg-white shadow-sm"><CardContent className="p-0"><Link href="/schedule" className="flex items-center justify-between px-5 py-4 transition hover:bg-slate-50"><div><p className="text-base font-extrabold">View Schedule</p><p className="mt-1 text-xs text-slate-500">Classes, labs and exams for today</p></div><ChevronRight className="h-6 w-6 text-[#18365b]" /></Link><div className="border-t border-slate-100 px-5 py-5">{nextClass ? <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><Badge className="bg-[#dcecf3] text-[#35778f] hover:bg-[#dcecf3]">Upcoming</Badge><span className="text-xs text-slate-400">{format(new Date(), 'EEEE, MMM d')}</span></div><p className="mt-2 text-lg font-extrabold">{nextClass.subject.name}</p><p className="mt-1 text-xs text-slate-500"><Clock3 className="mr-1 inline h-3.5 w-3.5" />{formatTime24to12(nextClass.period.startTime)} – {formatTime24to12(nextClass.period.endTime)} · Room 423</p></div><Button onClick={() => setScannerOpen(true)} disabled={!classInfo} className="rounded-2xl bg-[#193d64] px-5 hover:bg-[#153452]"><ScanLine className="mr-2 h-4 w-4" />Create Scanner</Button></div> : <div className="flex items-center gap-4 rounded-2xl bg-[#f7f7f7] p-5"><div className="rounded-2xl bg-white p-3 shadow-sm"><CalendarDays className="h-7 w-7 text-[#18365b]" /></div><div><p className="text-base font-extrabold">No Classes Today</p><p className="mt-1 text-xs text-slate-500">You can still create an attendance scanner for a selected class.</p></div></div>}</div></CardContent></Card>

        <section className="mb-5"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-extrabold uppercase tracking-wide text-[#252525]">Essentials</h2><Link href="/schedule" className="text-xs font-semibold text-[#18365b]">View all</Link></div><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{teacherEssentials.map((tile) => <Link key={tile.label} href={tile.href} className="group"><Card className="h-full rounded-[22px] border-0 shadow-sm transition group-hover:-translate-y-0.5 group-hover:shadow-md"><CardContent className="p-4 md:p-5"><div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-[15px] ${tile.tone}`}><tile.icon className="h-5 w-5" /></div><p className="text-sm font-extrabold">{tile.label}</p><p className="mt-1 text-[11px] text-slate-400">Tap to open</p></CardContent></Card></Link>)}</div></section>

        <Card className="mb-5 rounded-[22px] border-0 bg-[#f2dddd] shadow-sm"><CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="rounded-[14px] bg-[#df5a70] p-3 text-white"><BriefcaseBusiness className="h-5 w-5" /></div><div><p className="text-sm font-extrabold">Employee Self Service Portal</p><p className="mt-1 text-xs text-slate-600">Leaves, Attendance, Payslips &amp; Expense Requests</p></div></div><Link href="/profile"><Button variant="outline" className="rounded-xl border-white/70 bg-white/60">Open profile <ArrowRight className="ml-2 h-4 w-4" /></Button></Link></CardContent></Card>

        <section className="mb-5 grid gap-3 sm:grid-cols-3"><Card className="rounded-[22px] border-0 bg-white shadow-sm"><CardContent className="p-4"><p className="text-xs text-slate-400">Present today</p><p className="mt-1 text-2xl font-extrabold text-[#3d8b61]">{presentToday}</p></CardContent></Card><Card className="rounded-[22px] border-0 bg-white shadow-sm"><CardContent className="p-4"><p className="text-xs text-slate-400">Absent today</p><p className="mt-1 text-2xl font-extrabold text-[#d45454]">{absentToday}</p></CardContent></Card><Card className="rounded-[22px] border-0 bg-white shadow-sm"><CardContent className="p-4"><p className="text-xs text-slate-400">Classes configured</p><p className="mt-1 text-2xl font-extrabold text-[#18365b]">{classes.length}</p></CardContent></Card></section>

        <section className="mb-5"><h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide">Quick tools</h2><div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{teacherTools.map((tile) => <Link key={tile.href} href={tile.href} className="rounded-2xl bg-white p-3 text-center shadow-sm transition hover:-translate-y-0.5"><div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef1f5] text-[#18365b]"><tile.icon className="h-4 w-4" /></div><span className="text-[10px] font-semibold leading-tight">{tile.label}</span></Link>)}</div></section>

        <div className="grid gap-3 md:grid-cols-2"><Link href="/notices"><Card className="rounded-[22px] border-0 shadow-sm"><CardContent className="flex items-center gap-3 p-4"><div className="rounded-xl bg-[#e9eef5] p-3 text-[#18365b]"><Megaphone className="h-5 w-5" /></div><div className="flex-1"><p className="text-sm font-extrabold">Digital Notice Board</p><p className="text-xs text-slate-500">View official department announcements</p></div><ChevronRight className="h-4 w-4 text-slate-400" /></CardContent></Card></Link></div>
      </div>
      <QrSessionManager classInfo={classInfo} isOpen={scannerOpen} onClose={() => setScannerOpen(false)} onSessionComplete={onQrSessionComplete} />
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useUser();
  const router = useRouter();
  const isTeacher = user?.email?.endsWith('@teacher.com') || user?.email?.endsWith('@faculty.com');
  const isDean = user?.email?.endsWith('@dean.com');
  useEffect(() => { if (user && isDean) router.replace('/admin/dashboard'); }, [user, isDean, router]);
  if (isDean) return null;
  if (isTeacher) return <TeacherDashboard />;
  return <StudentDashboard />;
}
