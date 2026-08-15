'use client';

import { Receipt, WalletCards } from 'lucide-react';
import { StudentPage, SectionCard } from '@/components/student/student-page';

export default function FeesPage() {
  return (
    <StudentPage title="Fee Payments">
      <div className="rounded-2xl bg-[#37336e] p-5 text-white">
        <WalletCards className="mb-4 h-6 w-6" />
        <p className="text-lg font-extrabold">Verified fee records</p>
        <p className="mt-1 text-sm text-white/70">Only verified fee information from the college system will appear here.</p>
      </div>
      <SectionCard title="Recent transactions" icon={Receipt}>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Receipt className="h-10 w-10 text-slate-300" />
          <p className="mt-4 text-base font-bold text-slate-600">No fee records available</p>
          <p className="mt-1 max-w-sm text-sm text-slate-400">There are no verified fee transactions available for this account yet.</p>
        </div>
      </SectionCard>
    </StudentPage>
  );
}
