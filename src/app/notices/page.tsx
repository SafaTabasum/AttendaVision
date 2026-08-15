'use client';

import { useDataContext } from '@/context/data-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Bell, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function NoticesPage() {
  const { notifications, classes } = useDataContext();

  const getFormattedDate = (date: any) => {
    if (!date) return '';
    try {
      const d = date.toDate ? date.toDate() : new Date(date);
      return format(d, 'PPP, p');
    } catch { return ''; }
  };

  const items = notifications.filter((notification) => notification.type === 'general');

  return (
    <div className="student-mobile-surface min-h-[calc(100vh-56px)] space-y-4 px-4 pb-24 pt-4 md:max-w-5xl md:px-8">
      <div className="flex items-center gap-3">
        <Bell className="h-7 w-7 text-primary" />
        <h2 className="text-3xl font-bold tracking-tight">Digital Notice Board</h2>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No notices yet</p>
            <p className="text-sm text-muted-foreground">Dean announcements will appear here when they are published.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((notif) => {
            const n:any = notif;
            const course = 'classId' in notif ? classes.find(c => c.id === notif.classId) : undefined;
            return (
              <Card key={n.id} className="border-l-4 border-l-primary">
                <CardHeader className="pb-2 pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <CardTitle className="text-base leading-tight">{n.title}</CardTitle>
                    </div>
                    
                  </div>
                </CardHeader>
                <CardContent className="pb-4 space-y-1">
                  <p className="text-sm text-muted-foreground">{n.body}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                    {course && <span>📚 {course.name}</span>}
                    {notif.uploaderName && <span>👤 {n.uploaderName}</span>}
                    {notif.createdAt && <span>🕐 {getFormattedDate(n.createdAt)}</span>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
