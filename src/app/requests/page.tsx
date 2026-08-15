'use client';

import { ClipboardCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function RequestsPage() {
  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#f7f7f7] px-4 py-5 md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Faculty workspace</p>
          <h1 className="mt-1 text-2xl font-extrabold">Requests</h1>
          <p className="mt-1 text-xs text-slate-500">Student grievances are handled by the Dean.</p>
        </div>
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <ClipboardCheck className="h-10 w-10 text-slate-300" />
            <p className="mt-3 font-bold text-slate-600">No requests available</p>
            <p className="mt-1 max-w-md text-xs text-slate-500">There are no faculty requests to display. Student grievances are visible only to the Dean.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
