'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Filter, MessageSquare, Search, ShieldAlert, XCircle } from 'lucide-react';
import { useDataContext } from '@/context/data-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DeanPage } from '../dean-ui';

export default function DeanGrievances() {
  const { grievances, students, updateGrievanceStatus } = useDataContext();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');

  const rows = useMemo(() => grievances.filter(g => {
    const student = students.find(s => s.id === g.studentId);
    const hay = `${student?.name || ''} ${g.subject} ${g.category} ${g.priority}`.toLowerCase();
    return hay.includes(query.toLowerCase()) && (status === 'all' || g.status === status);
  }), [grievances, students, query, status]);

  const statusLabel: Record<string,string> = { open:'Pending', in_progress:'Under Review', resolved:'Resolved', closed:'Rejected' };
  const statusClass: Record<string,string> = { open:'bg-rose-50 text-rose-700', in_progress:'bg-amber-50 text-amber-700', resolved:'bg-emerald-50 text-emerald-700', closed:'bg-slate-100 text-slate-600' };

  return <DeanPage title="Department Grievances" subtitle="Review and update student grievances across the department. Teachers do not have access to this Dean-only view.">
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_200px]"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><Input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search student, subject or category..." className="pl-9"/></div><select value={status} onChange={e=>setStatus(e.target.value)} className="h-10 rounded-md border px-3 text-sm"><option value="all">All statuses</option><option value="open">Pending</option><option value="in_progress">Under Review</option><option value="resolved">Resolved</option><option value="closed">Rejected</option></select></div>
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="w-full min-w-[900px] text-sm"><thead><tr className="bg-[#fafafe] text-left text-xs text-slate-500"><th className="p-4">Student</th><th className="p-4">Class</th><th className="p-4">Category</th><th className="p-4">Date</th><th className="p-4">Priority</th><th className="p-4">Status</th><th className="p-4">Action</th></tr></thead><tbody>{rows.map(g=>{const s=students.find(x=>x.id===g.studentId);return <tr className="border-t" key={g.id}><td className="p-4"><b>{s?.name||'Student'}</b><span className="block text-xs text-slate-400">{g.subject}</span></td><td className="p-4">II-A</td><td className="p-4 capitalize">{g.category}</td><td className="p-4">{String(g.createdAt).slice(0,10)}</td><td className="p-4"><Badge variant={g.priority==='high'?'destructive':'secondary'}>{g.priority}</Badge></td><td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass[g.status]}`}>{statusLabel[g.status]}</span></td><td className="p-4"><div className="flex gap-2">{g.status==='open'&&<Button size="sm" variant="outline" onClick={()=>updateGrievanceStatus(g.id,'in_progress')}><Clock3 className="mr-1 h-3.5 w-3.5"/>Review</Button>}{g.status==='in_progress'&&<Button size="sm" onClick={()=>updateGrievanceStatus(g.id,'resolved','Reviewed by Dean')}><CheckCircle2 className="mr-1 h-3.5 w-3.5"/>Resolve</Button>}{g.status==='open'&&<Button size="sm" variant="ghost" onClick={()=>updateGrievanceStatus(g.id,'closed')}><XCircle className="mr-1 h-3.5 w-3.5"/>Reject</Button>}</div></td></tr>})}</tbody></table>{rows.length===0&&<div className="p-10 text-center text-sm text-slate-500">No grievances match the selected filters.</div>}</div>
    <div className="grid gap-4 md:grid-cols-3"><Mini title="Pending" value={grievances.filter(g=>g.status==='open').length} icon={ShieldAlert}/><Mini title="Under Review" value={grievances.filter(g=>g.status==='in_progress').length} icon={Clock3}/><Mini title="Resolved" value={grievances.filter(g=>g.status==='resolved').length} icon={CheckCircle2}/></div>
  </DeanPage>
}
function Mini({title,value,icon:Icon}:{title:string;value:number;icon:any}){return <div className="rounded-2xl border bg-white p-5 shadow-sm"><Icon className="h-5 w-5 text-[#5b51a3]"/><p className="mt-3 text-2xl font-black">{value}</p><p className="text-sm text-slate-500">{title}</p></div>}
