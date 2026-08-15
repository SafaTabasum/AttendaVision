'use client';

import { CalendarDays, MapPin } from 'lucide-react';
import { StudentPage, SectionCard } from '@/components/student/student-page';
import { useDataContext } from '@/context/data-context';
import { format } from 'date-fns';

export default function EventsPage() {
  const { campusEvents } = useDataContext();

  return (
    <StudentPage title="Campus Events">
      <div className="mb-4 rounded-2xl bg-[#37336e] p-4 text-white">
        <p className="text-xs text-white/70">Stay updated</p>
        <p className="mt-1 text-lg font-bold">Official campus activities</p>
        <p className="mt-1 text-xs text-white/70">Events published by the Dean appear here.</p>
      </div>

      {campusEvents.length === 0 ? (
        <SectionCard>
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <CalendarDays className="h-10 w-10 text-slate-300" />
            <p className="mt-4 text-base font-bold text-slate-600">No campus events yet</p>
            <p className="mt-1 text-sm text-slate-400">New events will appear here when the Dean publishes them.</p>
          </div>
        </SectionCard>
      ) : (
        <div className="space-y-3">
          {campusEvents.map(event => (
            <SectionCard key={event.id}>
              <div className="flex gap-3">
                <div className="rounded-xl bg-[#eee9ff] p-3 text-[#6655b5]"><CalendarDays className="h-5 w-5" /></div>
                <div className="min-w-0">
                  <p className="text-sm font-bold">{event.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{event.category}</p>
                  {event.date && <p className="mt-2 text-xs font-semibold text-[#37336e]">{format(new Date(event.date), 'PPP')}</p>}
                  <p className="mt-2 text-[10px] text-slate-400"><MapPin className="mr-1 inline h-3 w-3" />{event.location}</p>
                  {event.description && <p className="mt-3 text-sm leading-5 text-slate-600">{event.description}</p>}
                </div>
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </StudentPage>
  );
}
