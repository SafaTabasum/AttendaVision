'use client';

import { useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { DeanPage } from '../dean-ui';
import { collection } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';

export default function CalendarPage(){
  const firestore=useFirestore();
  const [d,setD]=useState(new Date().toISOString().split('T')[0]);
  const queryRef=useMemoFirebase(()=>firestore?collection(firestore,'academicCalendar'):null,[firestore]);
  const {data}=useCollection<any>(queryRef);
  const events=useMemo(()=>[...(data||[])].sort((a:any,b:any)=>String(a.date||'').localeCompare(String(b.date||''))),[data]);
  const selected=events.filter((e:any)=>e.date===d);
  return <DeanPage title="Academic Calendar" subtitle="Only official dates stored by the department are shown.">
    <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      <div className="rounded-2xl border bg-white p-5 shadow-sm"><label className="text-sm font-bold">Select date</label><input type="date" value={d} onChange={e=>setD(e.target.value)} className="mt-2 h-11 w-full rounded-md border px-3"/><div className="mt-6 flex items-center gap-2 font-black"><CalendarDays className="h-5 w-5 text-[#5b51a3]"/>Selected date</div><p className="mt-2 text-2xl font-black">{d}</p></div>
      <div className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-black">Official academic dates</h2><div className="mt-4 space-y-3">{events.length?events.map((event:any)=><div className="flex items-center justify-between rounded-xl bg-[#fafafe] p-4" key={event.id}><div><b>{event.title||'Academic event'}</b><p className="text-xs text-slate-400">{event.date||'—'}{event.description?` · ${event.description}`:''}</p></div><span className="rounded-full bg-[#f0eefb] px-3 py-1 text-xs font-bold text-[#37336e]">{event.type||'Academic'}</span></div>):<div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed text-sm text-slate-400">No academic calendar dates have been published.</div>}</div>{events.length>0&&<div className="mt-4 rounded-xl bg-[#f5f2ff] p-4 text-sm text-slate-600">{selected.length?`${selected.length} event${selected.length===1?'':'s'} on the selected date.`:'No academic event is recorded for the selected date.'}</div>}</div>
    </div>
  </DeanPage>
}
