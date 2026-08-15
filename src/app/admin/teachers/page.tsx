'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, ChevronRight, Clock3, Search, X } from 'lucide-react';
import { SUBJECTS } from '@/lib/timetable';
import { DeanPage } from '../dean-ui';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const teacherData = Object.values(SUBJECTS).filter(s=>s.teacherName).reduce((m:any,s)=>{
  const key=s.teacherEmail;
  if(!m[key]) m[key]={name:s.teacherName,email:s.teacherEmail,subjects:[]};
  if(!m[key].subjects.includes(s.name)) m[key].subjects.push(s.name);
  return m;
},{});

export default function Teachers(){
  const [q,setQ]=useState(''); const [selected,setSelected]=useState<any>(null);
  const teachers=Object.values(teacherData).filter((t:any)=>`${t.name} ${t.email} ${t.subjects.join(' ')}`.toLowerCase().includes(q.toLowerCase())).map((t:any,i)=>({...t,sessions:24-(i%3),submitted:22-(i%3),pending:2,completion:Math.round(((22-(i%3))/(24-(i%3)))*100)}));
  return <DeanPage title="Teachers" subtitle="Monitor faculty assignments, classes handled and attendance submission completion.">
    <div className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-[1fr_200px]"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><Input className="pl-9" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search teacher, faculty ID or subject..."/></div><div className="rounded-xl bg-[#f5f3fc] px-4 py-2 text-sm font-semibold text-[#37336e]">{teachers.length} faculty shown</div></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{teachers.map((t:any,i:number)=><button key={t.email} onClick={()=>setSelected(t)} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200"><div className="flex items-center justify-between"><div><p className="font-black">{t.name}</p><p className="text-xs text-slate-400">Faculty ID FAC-{t.email.split('@')[0].toUpperCase()}</p></div><ChevronRight className="h-5 w-5 text-slate-400"/></div><p className="mt-4 text-sm text-slate-600">II-A · Room 423 · {t.subjects.length} subject(s)</p><div className="mt-3 flex flex-wrap gap-1">{t.subjects.map((x:string)=><Badge key={x} variant="secondary">{x}</Badge>)}</div><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><span className="rounded-lg bg-emerald-50 p-2 font-semibold text-emerald-700"><CheckCircle2 className="mr-1 inline h-3 w-3"/>{t.submitted} submitted</span><span className="rounded-lg bg-amber-50 p-2 font-semibold text-amber-700"><Clock3 className="mr-1 inline h-3 w-3"/>{t.pending} pending</span></div></button>)}</div>
    <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm"><table className="w-full min-w-[800px] text-sm"><thead><tr className="bg-[#fafafe] text-left text-xs text-slate-500"><th className="p-4">Teacher</th><th className="p-4">Subjects</th><th className="p-4">Classes</th><th className="p-4">Sessions</th><th className="p-4">Submitted</th><th className="p-4">Pending</th><th className="p-4">Completion</th></tr></thead><tbody>{teachers.map((t:any)=><tr className="border-t" key={`row-${t.email}`}><td className="p-4 font-semibold">{t.name}</td><td className="p-4">{t.subjects.join(', ')}</td><td className="p-4">II-A</td><td className="p-4">{t.sessions}</td><td className="p-4 text-emerald-600">{t.submitted}</td><td className="p-4 text-amber-600">{t.pending}</td><td className="p-4 font-black">{t.completion}%</td></tr>)}</tbody></table></div>
    {selected&&<div className="fixed inset-0 z-50 bg-black/30 p-4"><div className="ml-auto h-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"><div className="flex justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-[#6c67a2]">Faculty profile</p><h2 className="mt-1 text-2xl font-black">{selected.name}</h2><p className="text-sm text-slate-500">{selected.email}</p></div><Button variant="ghost" size="icon" onClick={()=>setSelected(null)}><X/></Button></div><div className="mt-6 space-y-3">{[['Faculty ID',`FAC-${selected.email.split('@')[0].toUpperCase()}`],['Assigned subjects',selected.subjects.join(', ')],['Assigned classes','II-A · Room 423'],['Attendance sessions conducted',selected.sessions],['Attendance submitted',selected.submitted],['Pending attendance',selected.pending],['Completion percentage',`${selected.completion}%`],['Timetable','Department timetable'],['Submission history','Available in Attendance → Teacher Submission Monitor']].map(([a,b])=><div className="rounded-xl border p-4" key={String(a)}><p className="text-xs text-slate-400">{a}</p><p className="mt-1 font-semibold">{String(b)}</p></div>)}</div></div></div>}
  </DeanPage>
}
