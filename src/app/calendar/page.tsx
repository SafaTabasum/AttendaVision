import { CalendarDays } from 'lucide-react';
import { StudentPage, SectionCard } from '@/components/student/student-page';

export default function CalendarPage() {
  return (
    <StudentPage title="Academic Calendar">
      <SectionCard>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarDays className="h-11 w-11 text-slate-300" />
          <p className="mt-4 text-base font-bold text-slate-600">Academic calendar not published</p>
          <p className="mt-1 max-w-md text-sm text-slate-400">Official academic dates will appear here when they are provided by the college.</p>
        </div>
      </SectionCard>
    </StudentPage>
  );
}
