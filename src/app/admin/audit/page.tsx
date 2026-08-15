'use client';

import { useMemo, useState } from 'react';
import { History, Search, ShieldAlert, Smartphone, Globe2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DeanPage } from '../dean-ui';
import { collection } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';

export default function Audit() {
  const firestore = useFirestore();
  const [search, setSearch] = useState('');
  const alertsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'securityAlerts') : null, [firestore]);
  const { data: alerts } = useCollection<any>(alertsQuery);
  const filtered = useMemo(() => (alerts || []).filter((a: any) => {
    const haystack = `${a.studentName || ''} ${a.studentId || ''} ${a.className || ''} ${a.reason || ''} ${a.currentIp || ''}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  }).sort((a: any, b: any) => String(b.createdAt?.seconds || 0).localeCompare(String(a.createdAt?.seconds || 0))), [alerts, search]);

  return <DeanPage title="Security & Audit Log" subtitle="Real security events from attendance attempts. No demo audit records are shown.">
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><Input className="pl-9" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student, class, reason or IP..." /></div>
    </div>

    <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
      <table className="w-full min-w-[1050px] text-sm">
        <thead><tr className="bg-[#fafafe] text-left text-xs text-slate-500"><th className="p-4">Date / Time</th><th className="p-4">Student</th><th className="p-4">Class / Period</th><th className="p-4">Security signal</th><th className="p-4">Network</th><th className="p-4">Result</th></tr></thead>
        <tbody>
          {filtered.map((a: any) => {
            const date = a.createdAt?.toDate ? a.createdAt.toDate() : null;
            return <tr className="border-t" key={a.id}>
              <td className="p-4">{date ? `${date.toLocaleDateString('en-IN')} ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : '—'}</td>
              <td className="p-4 font-semibold">{a.studentName || '—'}<span className="block text-xs text-slate-400">{a.studentId || '—'}</span></td>
              <td className="p-4">{a.className || a.classId || '—'}<span className="block text-xs text-slate-400">{a.periodKey || '—'}</span></td>
              <td className="p-4"><div className="flex items-start gap-2"><ShieldAlert className="mt-0.5 h-4 w-4 text-rose-500"/><span>{a.reason || 'Security event'}</span></div><div className="mt-1 flex gap-3 text-xs text-slate-400">{a.deviceMismatch && <span><Smartphone className="mr-1 inline h-3 w-3"/>Device mismatch</span>}{a.ipChanged && <span><Globe2 className="mr-1 inline h-3 w-3"/>IP changed</span>}</div></td>
              <td className="p-4"><span className="block">Current: {a.currentIp || '—'}</span><span className="text-xs text-slate-400">Trusted: {a.trustedIp || '—'}</span></td>
              <td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${a.deviceMismatch ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{a.deviceMismatch ? 'Attendance rejected' : 'Allowed / flagged'}</span></td>
            </tr>;
          })}
        </tbody>
      </table>
      {!filtered.length && <div className="flex min-h-36 items-center justify-center p-6 text-sm text-slate-400"><History className="mr-2 h-4 w-4"/>No security events recorded.</div>}
    </div>
  </DeanPage>;
}
