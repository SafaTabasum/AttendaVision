'use client';

import { Bell } from 'lucide-react';
import { useUser } from '@/firebase';
import { StudentPage, SectionCard } from '@/components/student/student-page';
import { useDataContext } from '@/context/data-context';
import { format } from 'date-fns';

export default function NotificationsPage() {
  const { notifications } = useDataContext();
  const { user } = useUser();
  const items = notifications.filter((notification) =>
    notification.type === 'general' ||
    (notification.type === 'attendance' && notification.studentId === user?.uid)
  );

  return (
    <StudentPage title="Notifications">
      {items.length === 0 ? (
        <SectionCard>
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <Bell className="h-10 w-10 text-slate-300" />
            <p className="mt-4 text-base font-bold text-slate-600">No notifications yet</p>
            <p className="mt-1 text-sm text-slate-400">Official Dean announcements will appear here when they are published.</p>
          </div>
        </SectionCard>
      ) : (
        <div className="space-y-2">
          {items.map((notification) => {
            const date = notification.createdAt?.toDate ? notification.createdAt.toDate() : notification.createdAt ? new Date(notification.createdAt) : null;
            return (
              <SectionCard key={notification.id}>
                <div className="flex gap-3">
                  <div className="rounded-xl bg-[#fff0f3] p-3 text-[#d95878]"><Bell className="h-4 w-4" /></div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">{notification.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{notification.body}</p>
                    {date && <p className="mt-2 text-[10px] text-slate-400">{format(date, 'PPP, p')}</p>}
                  </div>
                </div>
              </SectionCard>
            );
          })}
        </div>
      )}
    </StudentPage>
  );
}
