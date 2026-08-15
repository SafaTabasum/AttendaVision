'use client';

import { BookOpen, Download, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useDataContext } from '@/context/data-context';
import { DeanPage } from '../dean-ui';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

function toDate(value:any){if(value?.toDate)return value.toDate();if(value instanceof Date)return value;const d=new Date(value||'');return Number.isNaN(d.getTime())?null:d}
export default function Resources(){
  const {resources,incrementDownloadCount}=useDataContext(); const [q,setQ]=useState(''); const [subject,setSubject]=useState('all');
  const rows=useMemo(()=>resources.filter(r=>{const hay=`${r.title} ${r.description} ${r.topic} ${r.uploaderId}`.toLowerCase();return hay.includes(q.toLowerCase())&&(subject==='all'||r.topic===subject)}),[resources,q,subject]);
  const subjects=Array.from(new Set(resources.map(r=>r.topic).filter(Boolean)));
  return <DeanPage title="Department Resources" subtitle="View resources uploaded by teachers across the department.">
    <div className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-[1fr_220px]"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><Input className="pl-9" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search resource, subject or teacher..."/></div><select value={subject} onChange={e=>setSubject(e.target.value)} className="h-10 rounded-md border px-3 text-sm"><option value="all">All subjects</option>{subjects.map(s=><option key={s}>{s}</option>)}</select></div>
    {rows.length?<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map(r=>{const d=toDate(r.createdAt);return <div className="rounded-2xl border bg-white p-5 shadow-sm" key={r.id}><div className="flex items-center justify-between"><BookOpen className="h-5 w-5 text-[#5b51a3]"/><Badge variant="secondary">{r.type}</Badge></div><h2 className="mt-4 font-black">{r.title}</h2><p className="mt-1 text-sm text-slate-500">{r.description}</p><div className="mt-4 space-y-1 text-xs text-slate-400"><p>Subject: <b className="text-slate-600">{r.topic}</b></p><p>Teacher: <b className="text-slate-600">{r.uploaderId}</b></p><p>Class: <b className="text-slate-600">II-A</b></p><p>Uploaded: <b className="text-slate-600">{d?d.toLocaleDateString('en-IN'):'—'}</b></p></div><Button variant="outline" className="mt-4 w-full" onClick={()=>incrementDownloadCount(r.id)}><Download className="mr-2 h-4 w-4"/>View / count download</Button></div>})}</div>:<div className="rounded-2xl border-2 border-dashed bg-white p-12 text-center"><BookOpen className="mx-auto h-8 w-8 text-slate-300"/><h3 className="mt-3 font-bold">No resources found</h3><p className="mt-1 text-sm text-slate-400">Try another subject or search term.</p></div>}
  </DeanPage>
}
