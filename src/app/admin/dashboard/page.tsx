'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowRight, BarChart3, Bell, BookOpen, CalendarCheck,
  CalendarDays, CheckCircle2, ClipboardCheck, Clock3, FileBarChart2,
  GraduationCap, History, Library, MessageSquare, Percent, School,
  Sparkles, TrendingDown, TrendingUp, Users, UserCheck, XCircle
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { useDataContext } from '@/context/data-context';
import { DAY_NAMES, SUBJECTS, TIMETABLE, PERIOD_TIMES } from '@/lib/timetable';
import { DeanPage, StatCard } from '../dean-ui';
import { collection } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';

const requiredAttendance = 75;
const today = new Date().toISOString().split('T')[0];

function attendanceStats(records: any[]) {
  const present = records.filter(r => r.status === 'present').length;
  const late = records.filter(r => r.status === 'late').length;
  const absent = records.filter(r => r.status === 'absent').length;
  const total = records.length;
  return { present, late, absent, total, pct: total ? Math.round(((present + late) / total) * 1000) / 10 : null };
}

function trendFromRecords(records: any[], days: number) {
  const now = new Date();
  const result: { day: string; value: number }[] = [];
  for (let offset = days - 1; offset >= 0; offset--) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(now.getDate() - offset);
    const key = d.toISOString().slice(0, 10);
    const stats = attendanceStats(records.filter(r => r.date === key));
    if (stats.total) result.push({ day: d.toLocaleDateString('en-US', { weekday: 'short' }), value: stats.pct as number });
  }
  return result;
}

function monthlyTrend(records: any[]) {
  const byMonth = new Map<string, any[]>();
  records.forEach(r => {
    if (!r.date) return;
    const key = r.date.slice(0, 7);
    const list = byMonth.get(key) || [];
    list.push(r);
    byMonth.set(key, list);
  });
  return [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([key, list]) => ({
    month: new Date(`${key}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short' }),
    value: attendanceStats(list).pct as number,
  }));
}

export default function DeanDashboard() {
  const { students, classes, attendance, grievances, notifications, resources } = useDataContext();
  const firestore = useFirestore();
  const submissionsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'attendanceSubmissions') : null, [firestore]);
  const { data: submissions } = useCollection<any>(submissionsQuery);
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');

  const overall = attendanceStats(attendance);
  const todayRecords = attendance.filter(r => r.date === today);
  const todayStats = attendanceStats(todayRecords);
  const atRisk = useMemo(() => students.map(s => {
    const stats = attendanceStats(attendance.filter(a => a.studentId === s.id));
    return { ...s, ...stats, risk: stats.pct === null ? null : stats.pct < 65 ? 'High' : stats.pct < requiredAttendance ? 'Medium' : 'Low' };
  }).filter(s => s.pct !== null && (s.pct as number) < requiredAttendance).sort((a, b) => (a.pct as number) - (b.pct as number)), [students, attendance]);

  const teacherEmails = [...new Set(Object.values(SUBJECTS).map(s => s.teacherEmail).filter(Boolean))];
  const teacherNames = [...new Set(Object.values(SUBJECTS).map(s => s.teacherName).filter(Boolean))];
  const teacherCount = Math.max(teacherEmails.length, teacherNames.length);
  const totalSubjects = Object.values(SUBJECTS).filter(s => s.teacherName).length;
  const subjectData = Object.entries(SUBJECTS).map(([code, subject]) => {
    const records = attendance.filter(r => (r as any).subjectId === code || (r as any).subjectCode === code || (r as any).subject === code);
    const stats = attendanceStats(records);
    return records.length ? { name: subject.shortName, attendance: stats.pct as number } : null;
  }).filter(Boolean) as { name: string; attendance: number }[];
  const classData = classes.map(c => {
    const stats = attendanceStats(attendance.filter(r => r.classId === c.id));
    return stats.total ? { name: c.name, attendance: stats.pct as number } : null;
  }).filter(Boolean) as { name: string; attendance: number }[];
  const weekly = trendFromRecords(attendance, 7);
  const monthly = monthlyTrend(attendance);
  const pie = todayStats.total ? [
    { name: 'Present', value: Math.round(todayStats.present / todayStats.total * 100) },
    { name: 'Absent', value: Math.round(todayStats.absent / todayStats.total * 100) },
    { name: 'Late', value: Math.round(todayStats.late / todayStats.total * 100) },
  ] : [];
  const todayGroups = [...new Map(todayRecords.map(record => [`${record.classId}-${(record as any).subjectId || 'attendance'}`, record])).values()];
  const teacherRows = (submissions || []).filter((r: any) => r.date === today).map((r: any) => ({
    name: r.teacherName || r.teacherEmail || r.teacherId || 'Teacher',
    records: 1,
    completion: 100,
  }));

  return (
    <DeanPage title="Dean Dashboard" subtitle="Department command center · II-A · Academic Year 2026–27 · Odd Semester">
      {/* Department identity */}
      <section className="rounded-3xl bg-[#403a82] p-6 text-white shadow-sm md:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-white/75"><School className="h-4 w-4"/> Information Technology Department</div>
            <h2 className="mt-2 text-2xl font-black md:text-3xl">Complete 360° Department Overview</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">Monitor students, teachers, classes, attendance, academic activity and department operations from one place.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[520px]">
            {[
              ['Attendance', overall.pct === null ? '—' : `${overall.pct}%`], ['At Risk', atRisk.length], ['Today', todayRecords.length], ['Resources', resources.length]
            ].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-white/10 p-4 backdrop-blur"><p className="text-xs text-white/60">{label}</p><p className="mt-1 text-xl font-black">{value}</p></div>)}
          </div>
        </div>
      </section>

      {/* Core department metrics */}
      <section>
        <div className="mb-3 flex items-center justify-between"><div><h2 className="text-lg font-black">Department at a glance</h2><p className="text-xs text-slate-400">Live academic monitoring metrics</p></div><Link href="/admin/reports" className="text-sm font-bold text-[#37336e]">Open reports <ArrowRight className="inline h-4 w-4"/></Link></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Overall Department Attendance" value={overall.pct === null ? "—" : `${overall.pct}%`} hint="Present + late" icon={Percent}/>
          <StatCard label="Total Students" value={students.length || 0} hint="All department students" icon={Users} tone="blue"/>
          <StatCard label="Total Teachers" value={teacherCount} hint="Faculty listed in timetable" icon={GraduationCap} tone="green"/>
          <StatCard label="Total Classes" value={classes.length} hint="Classes in the department data" icon={School}/>
          <StatCard label="Total Subjects" value={totalSubjects} hint="Theory + laboratory" icon={BookOpen} tone="blue"/>
          <StatCard label="Classes Conducted Today" value={todayGroups.length} hint="Based on recorded attendance" icon={CalendarCheck} tone="green"/>
          <StatCard label="Attendance Records Today" value={todayRecords.length || 0} hint="Submitted records" icon={UserCheck}/>
          <StatCard label="Students Below 75%" value={atRisk.length} hint="Require attention" icon={AlertTriangle} tone="red"/>
        </div>
      </section>

      {/* Analytics */}
      <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between"><div><h2 className="font-black">Attendance trend</h2><p className="text-xs text-slate-400">Department-level trend</p></div><div className="flex rounded-xl bg-[#f5f3fc] p-1">{(['weekly','monthly'] as const).map(v=><button key={v} onClick={()=>setPeriod(v)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${period===v?'bg-white text-[#37336e] shadow-sm':'text-slate-500'}`}>{v==='weekly'?'Weekly':'Monthly'}</button>)}</div></div>
          <div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={period==='weekly'?weekly:monthly}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey={period==='weekly'?'day':'month'}/><YAxis domain={[0,100]}/><Tooltip/><Line type="monotone" dataKey="value" stroke="hsl(var(--chart-1))" strokeWidth={3} dot={{r:4}}/></LineChart></ResponsiveContainer></div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black">Today's attendance overview</h2><p className="text-xs text-slate-400">Present, absent and late</p>{pie.length ? <><div className="mt-2 h-52"><ResponsiveContainer><PieChart><Pie data={pie} dataKey="value" innerRadius={55} outerRadius={78}>{pie.map((_,i)=><Cell key={i} fill={`hsl(var(--chart-${[2,1,4][i]}))`}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div><div className="grid grid-cols-3 gap-2 text-center text-xs"><b>{pie[0].value}%<span className="block font-normal text-slate-400">Present</span></b><b>{pie[1].value}%<span className="block font-normal text-slate-400">Absent</span></b><b>{pie[2].value}%<span className="block font-normal text-slate-400">Late</span></b></div></> : <div className="flex h-64 items-center justify-center text-sm text-slate-400">No attendance records for today.</div>}</div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Subject-wise attendance" subtitle="Current semester"><ResponsiveContainer width="100%" height="100%"><BarChart data={subjectData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis domain={[0,100]}/><Tooltip/><Bar dataKey="attendance" fill="hsl(var(--chart-2))" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Class / section comparison" subtitle="Average attendance"><ResponsiveContainer width="100%" height="100%"><BarChart data={classData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis domain={[0,100]}/><Tooltip/><Bar dataKey="attendance" fill="hsl(var(--chart-1))" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></ChartCard>
      </section>

      {/* Today's attendance */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><h2 className="font-black">Today's Attendance</h2><p className="text-xs text-slate-400">Every scheduled class for today</p></div><Link href="/admin/attendance" className="text-sm font-bold text-[#37336e]">Open attendance monitor <ArrowRight className="inline h-4 w-4"/></Link></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {todayGroups.length ? todayGroups.slice(0, 12).map((record) => {
            const rows = todayRecords.filter(r => r.classId === record.classId && ((r as any).subjectId || 'attendance') === ((record as any).subjectId || 'attendance'));
            const stats = attendanceStats(rows);
            const cls = classes.find(c => c.id === record.classId);
            return <div key={record.id} className="rounded-2xl bg-[#faf9ff] p-4">
              <div className="flex items-center justify-between"><span className="text-xs font-bold text-[#5b51a3]">{record.date}</span><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">Recorded</span></div>
              <h3 className="mt-3 font-black">{(record as any).subjectName || (record as any).subject || 'Attendance session'}</h3><p className="mt-1 text-xs text-slate-500">{cls?.name || record.classId}</p>
              <div className="mt-3 flex gap-4 text-xs"><span className="text-emerald-600">Present {stats.present}</span><span className="text-rose-600">Absent {stats.absent}</span><span className="text-amber-600">Late {stats.late}</span></div>
            </div>;
          }) : <div className="col-span-full flex min-h-28 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-400">No attendance has been recorded today.</div>}
        </div>
      </section>

      {/* Teacher submission monitoring */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between"><div><h2 className="font-black">Teacher Attendance Submission</h2><p className="text-xs text-slate-400">Only real teacher submission locks recorded in Firebase are shown.</p></div><Link href="/admin/attendance#teacher-monitor" className="text-sm font-bold text-[#37336e]">View all <ArrowRight className="inline h-4 w-4"/></Link></div>
        <div className="mt-4 overflow-x-auto">{teacherRows.length ? <table className="w-full min-w-[620px] text-sm"><thead><tr className="bg-[#fafafe] text-left text-xs text-slate-500"><th className="rounded-l-xl p-3">Teacher</th><th className="p-3">Attendance records today</th><th className="rounded-r-xl p-3">Status</th></tr></thead><tbody>{teacherRows.map(t=><tr className="border-t" key={t.name}><td className="p-3 font-semibold">{t.name}</td><td className="p-3">{t.records}</td><td className="p-3"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">Submitted</span></td></tr>)}</tbody></table> : <div className="flex min-h-24 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-400">No teacher attendance submission metadata is available yet.</div>}</div>
      </section>

      {/* Attention + AI */}
      <section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-black">Students Requiring Attention</h2><p className="text-xs text-slate-400">Below the required {requiredAttendance}% attendance.</p></div><Link href="/admin/students" className="text-sm font-bold text-[#37336e]">Students <ArrowRight className="inline h-4 w-4"/></Link></div><div className="mt-4 space-y-2">{atRisk.slice(0,6).map(s=><div key={s.id} className="flex flex-col gap-3 rounded-xl bg-[#fafafe] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold">{s.name}</p><p className="text-xs text-slate-400">II-A · ID {s.id}</p></div><div className="flex items-center gap-4"><div className="text-right"><p className="text-xl font-black">{s.pct}%</p><p className="text-[11px] text-slate-400">Required {requiredAttendance}%</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${s.risk==='High'?'bg-rose-50 text-rose-700':s.risk==='Medium'?'bg-amber-50 text-amber-700':'bg-emerald-50 text-emerald-700'}`}>{s.risk}</span></div></div>)}</div></div>
        <div className="rounded-2xl border border-violet-100 bg-[#f5f2ff] p-5 shadow-sm"><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-[#5b51a3]"/><h2 className="font-black">AI Attendance Analysis</h2></div><p className="mt-2 text-sm leading-6 text-slate-600">Use AI to summarize class trends and identify students whose attendance pattern needs review. AI output is advisory only; the Dean remains the final academic decision-maker.</p><div className="mt-4 grid gap-2"><Link href="/admin/reports" className="rounded-xl bg-white p-3 text-sm font-bold text-[#37336e]">Generate class summary <ArrowRight className="inline h-4 w-4"/></Link><Link href="/admin/students" className="rounded-xl bg-white p-3 text-sm font-bold text-[#37336e]">Review student risk <ArrowRight className="inline h-4 w-4"/></Link></div></div>
      </section>

      {/* Quick administration */}
      <section>
        <h2 className="mb-3 text-lg font-black">Dean tools</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['/admin/reports','Reports',FileBarChart2,'Generate attendance reports'],
            ['/admin/calendar','Academic Calendar',CalendarDays,'Holidays, CIEs and events'],
            ['/admin/resources','Resources',Library,'Teacher-uploaded resources'],
            ['/admin/notifications','Notifications',Bell,'Send department announcements'],
            ['/admin/timetable','Timetable',CalendarCheck,'Department timetable'],
            ['/admin/campus','Campus',School,'Events, clubs and activities'],
            ['/admin/audit','Audit Log',History,'Track important actions'],
            ['/admin/grievances','Grievances',MessageSquare,'Review department grievances'],
          ].map(([href,label,Icon,desc])=> <Link href={String(href)} key={String(href)} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0eefb] text-[#37336e]"><Icon className="h-5 w-5"/></div><div><p className="font-bold">{String(label)}</p><p className="text-xs text-slate-400">{String(desc)}</p></div></div></Link>)}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <InfoCard title="Department snapshot" icon={TrendingUp}><p>Classes with attendance: <b>{classData.length}</b></p><p>Lowest attendance class: <b>{classData.length ? `${Math.min(...classData.map(c => c.attendance))}%` : '—'}</b></p><p>Students at risk: <b>{atRisk.length}</b></p></InfoCard>
        <InfoCard title="Recent activity" icon={History}><p>{notifications.length || 0} department notifications</p><p>{grievances.length || 0} grievances available</p><p>{resources.length || 0} resources uploaded</p></InfoCard>
        <InfoCard title="Authority reminder" icon={CheckCircle2}><p>Dean has department-wide visibility.</p><p>AI is advisory, not a final decision.</p><p>Teacher attendance remains monitored here.</p></InfoCard>
      </section>
    </DeanPage>
  );
}

function ChartCard({title,subtitle,children}:{title:string;subtitle:string;children:React.ReactNode}){return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black">{title}</h2><p className="text-xs text-slate-400">{subtitle}</p><div className="mt-4 h-64">{children}</div></div>}
function InfoCard({title,icon:Icon,children}:{title:string;icon:any;children:React.ReactNode}){return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Icon className="h-5 w-5 text-[#5b51a3]"/><h2 className="font-black">{title}</h2></div><div className="mt-3 space-y-1 text-sm text-slate-600">{children}</div></div>}
