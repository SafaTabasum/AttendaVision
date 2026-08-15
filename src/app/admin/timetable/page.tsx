'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, Filter } from 'lucide-react';
import { TIMETABLE, PERIOD_TIMES, DAY_NAMES, SUBJECTS } from '@/lib/timetable';
import { DeanPage } from '../dean-ui';

export default function Timetable(){
  const [teacher,setTeacher]=useState('all'); const [day,setDay]=useState('all');
  const teachers=Array.from(new Set(Object.values(SUBJECTS).filter(s=>s.teacherName).map(s=>s.teacherName)));
  const days=Object.keys(TIMETABLE);
  const visibleDays=day==='all'?days:days.filter(d=>d===day);
  return <DeanPage title="Department Timetable" subtitle="II-A · Academic Year 2026–27 · Odd Semester · Effective 03-08-2026 · Room 423">
    <div className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-3"><div className="flex items-center gap-2 text-sm font-semibold text-slate-500"><Filter className="h-4 w-4"/>Filter timetable</div><select value={day} onChange={e=>setDay(e.target.value)} className="h-10 rounded-md border px-3 text-sm"><option value="all">All days</option>{days.map(d=><option key={d} value={d}>{DAY_NAMES[d]}</option>)}</select><select value={teacher} onChange={e=>setTeacher(e.target.value)} className="h-10 rounded-md border px-3 text-sm"><option value="all">All teachers</option>{teachers.map(t=><option key={t}>{t}</option>)}</select></div>
    <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm"><table className="min-w-[1100px] w-full text-sm"><thead><tr className="bg-[#f4f2fb] text-left text-xs"><th className="p-4">Day</th>{PERIOD_TIMES.map((p,i)=><th className="p-4" key={i}>{p.startTime}<br/>{p.endTime}</th>)}</tr></thead><tbody>{visibleDays.map(d=><tr className="border-t" key={d}><td className="p-4 font-black">{DAY_NAMES[d]}</td>{TIMETABLE[d].map((code,i)=>{const s=code?SUBJECTS[code]:null;const show=s && (teacher==='all'||s.teacherName===teacher);return <td className="p-3 align-top" key={i}>{show?<div className="rounded-xl bg-[#faf9ff] p-3"><b className="text-[#37336e]">{s.shortName}</b><p className="mt-1 text-xs text-slate-500">{s.teacherName||'Department'}</p><p className="mt-1 text-[11px] text-slate-400">Room 423</p></div>:code===null?<span className="text-xs text-slate-300">Lunch</span>:<span className="text-xs text-slate-300">—</span>}</td>})}</tr>)}</tbody></table></div>
    <div className="rounded-2xl border bg-white p-5"><div className="flex gap-2"><CalendarDays className="h-5 w-5 text-[#5b51a3]"/><div><b>Timetable source</b><p className="text-sm text-slate-500">Configured from the II-A timetable supplied for AttendaVision. Teacher and student schedule views use the same subject data.</p></div></div></div>
  </DeanPage>
}
