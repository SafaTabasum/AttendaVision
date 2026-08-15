'use client';

import { Search, Users } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { StudentPage, SectionCard } from '@/components/student/student-page';

export default function ClubsPage() {
  const [query, setQuery] = useState('');
  return (
    <StudentPage title="Campus Clubs">
      <div className="relative mb-4"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><Input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search clubs" className="rounded-xl border-0 bg-white pl-9 shadow-sm"/></div>
      <SectionCard>
        <div className="flex flex-col items-center justify-center py-14 text-center"><Users className="h-10 w-10 text-slate-300"/><p className="mt-4 text-base font-bold text-slate-600">No campus clubs published</p><p className="mt-1 max-w-md text-sm text-slate-400">Official club information will appear here when the college provides real club records.</p></div>
      </SectionCard>
    </StudentPage>
  );
}
