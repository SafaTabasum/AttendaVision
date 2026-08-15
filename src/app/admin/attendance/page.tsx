'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, Download, Filter, UserCheck, XCircle } from 'lucide-react';
import { useDataContext } from '@/context/data-context';
import { collection } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DeanPage } from '../dean-ui';
import { SUBJECTS, TIMETABLE, PERIOD_TIMES } from '@/lib/timetable';
import { exportToCsv } from '@/lib/utils';

const required = 75;
const today = new Date().toISOString().split('T')[0];

export default function AttendanceMonitoring() {
  const { students, attendance } = useDataContext();
  const firestore = useFirestore();
  const submissionsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'attendanceSubmissions') : null, [firestore]);
  const { data: submissions } = useCollection<any>(submissionsQuery);
  const [date, setDate] = useState(today);
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState('all');
  const [tab, setTab] = useState<'students'|'teachers'>('students');
  const [teacherStatus, setTeacherStatus] = useState('all');

  const rows = useMemo(() => students.filter(s => `${s.name} ${s.id}`.toLowerCase().includes(query.toLowerCase())).map((s, i) => {
    const records = attendance.filter(a => a.studentId === s.id && a.date === date && (subject === 'all' || a.classId === subject));
    const all = attendance.filter(a => a.studentId === s.id && (!date || a.date === date));
    const p = records.filter(a => a.status === 'present').length;
    const ab = records.filter(a => a.status === 'absent').length;
    const l = records.filter(a => a.status === 'late').length;
    const pct = all.length ? Math.round(all.filter(a => a.status !== 'absent').length / all.length * 100) : null;
    return { s, i, p, ab, l, pct, risk: pct === null ? null : pct < 65 ? 'High' : pct < required ? 'Medium' : 'Low' };
  }), [students, attendance, date, query, subject]);

  const teacherRows = useMemo(() => (submissions || []).filter((r: any) => !date || r.date === date).map((r: any) => ({
    teacher: r.teacherName || r.teacherEmail || r.teacherId || 'Teacher',
    email: r.teacherEmail || '',
    className: r.className || r.classId || '—',
    subject: r.subjectName || r.subject || r.classId || '—',
    date: r.date || '—',
    period: r.periodKey || '—',
    status: 'submitted',
  })).filter((r: any) => teacherStatus === 'all' || teacherStatus === 'submitted'), [submissions, date, teacherStatus]);

  const exportRows = rows.map(r => ({ student: r.s.name, rollNo: String(r.s.email || '').match(/^(\d+)@/)?.[1] || r.s.id, attendance: r.pct ?? '', present: r.p, absent: r.ab, late: r.l, date }));

  return <DeanPage title="Attendance Monitoring" subtitle="Monitor student attendance and verify teacher attendance submission across the department.">
    <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"><button onClick={()=>setTab('students')} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab==='students'?'bg-[#eeeafd] text-[#37336e]':'text-slate-500'}`}>Student Attendance</button><button onClick={()=>setTab('teachers')} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab==='teachers'?'bg-[#eeeafd] text-[#37336e]':'text-slate-500'}`}>Teacher Submission Monitor</button></div>

    {tab==='students' ? <>
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_180px_220px_auto]"><Input placeholder="Search student name or ID..." value={query} onChange={e=>setQuery(e.target.value)}/><Input type="date" value={date} onChange={e=>setDate(e.target.value)}/><select value={subject} onChange={e=>setSubject(e.target.value)} className="h-10 rounded-md border px-3 text-sm"><option value="all">All subjects / sessions</option>{Object.values(SUBJECTS).filter(s=>s.teacherName).map(s=><option key={s.code} value={s.code}>{s.name}</option>)}</select><Button onClick={()=>exportToCsv('dean-student-attendance.csv',exportRows)}><Download className="mr-2 h-4 w-4"/>CSV</Button></div>
      <div className="grid gap-4 sm:grid-cols-3"><Metric title="Selected date" value={date} icon={CalendarDays}/><Metric title="Present" value={rows.reduce((n,r)=>n+r.p,0)} icon={CheckCircle2}/><Metric title="Absent" value={rows.reduce((n,r)=>n+r.ab,0)} icon={XCircle}/></div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[850px] text-sm"><thead><tr className="bg-[#fafafe] text-left text-xs text-slate-500"><th className="p-4">Student</th><th className="p-4">Roll No.</th><th className="p-4">Attendance %</th><th className="p-4">Present</th><th className="p-4">Absent</th><th className="p-4">Late</th><th className="p-4">Risk</th></tr></thead><tbody>{rows.map(r=><tr className="border-t" key={r.s.id}><td className="p-4 font-semibold">{r.s.name}<span className="block text-xs text-slate-400">ID {r.s.id} · II-A</span></td><td className="p-4">{String(r.i+1).padStart(2,'0')}</td><td className="p-4 font-black">{r.pct}%</td><td className="p-4 text-emerald-600">{r.p}</td><td className="p-4 text-rose-600">{r.ab}</td><td className="p-4 text-amber-600">{r.l}</td><td className="p-4"><Badge className={r.risk==='High'?'bg-rose-100 text-rose-700':r.risk==='Medium'?'bg-amber-100 text-amber-700':'bg-emerald-100 text-emerald-700'}>{r.risk}</Badge></td></tr>)}</tbody></table></div>
      <div className="rounded-2xl border border-violet-100 bg-[#f5f2ff] p-5"><div className="flex items-center gap-2 font-black"><CalendarDays className="h-5 w-5 text-[#5b51a3]"/>Date-based attendance review</div><p className="mt-2 text-sm text-slate-600">Choose any date above. The Dean can use the selected day to review attendance records and then open the relevant student or class view for detailed academic context.</p></div>
    </> : <div id="teacher-monitor" className="space-y-4">
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[220px_220px_1fr]"><Input type="date" value={date} onChange={e=>setDate(e.target.value)}/><select value={teacherStatus} onChange={e=>setTeacherStatus(e.target.value)} className="h-10 rounded-md border px-3 text-sm"><option value="all">All statuses</option><option value="submitted">Submitted</option><option value="pending">Pending</option><option value="not_conducted">Not Conducted</option></select><p className="flex items-center text-sm text-slate-500"><Filter className="mr-2 h-4 w-4"/>Teacher · Class · Subject · Date · Status</p></div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[1000px] text-sm"><thead><tr className="bg-[#fafafe] text-left text-xs text-slate-500"><th className="p-4">Teacher</th><th className="p-4">Class</th><th className="p-4">Subject</th><th className="p-4">Date</th><th className="p-4">Period</th><th className="p-4">Status</th></tr></thead><tbody>{teacherRows.map((r,i)=><tr className="border-t" key={`${r.email}-${r.subject}-${i}`}><td className="p-4 font-semibold">{r.teacher}<span className="block text-xs text-slate-400">{r.email}</span></td><td className="p-4">{r.className}</td><td className="p-4">{r.subject}</td><td className="p-4">{r.date}</td><td className="p-4">{r.period}</td><td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${r.status==='submitted'?'bg-emerald-50 text-emerald-700':r.status==='pending'?'bg-amber-50 text-amber-700':'bg-slate-100 text-slate-600'}`}>{r.status==='submitted'?'Submitted':r.status==='pending'?'Pending':'Not Conducted'}</span></td></tr>)}</tbody></table></div>
      <div className="grid gap-4 md:grid-cols-3"><Metric title="Submitted" value={teacherRows.length} icon={CheckCircle2}/><Metric title="Real submission records" value={(submissions || []).filter((r:any)=>r.date===date).length} icon={Clock3}/><Metric title="Unrecorded sessions" value="—" icon={XCircle}/></div>
    </div>}
  </DeanPage>
}
function Metric({title,value,icon:Icon}:{title:string;value:string|number;icon:any}){return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><Icon className="h-5 w-5 text-[#5b51a3]"/><p className="mt-2 text-xl font-black">{value}</p><p className="text-xs text-slate-400">{title}</p></div>}
