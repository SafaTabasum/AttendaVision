'use client';

import { CalendarDays, Send, Users } from 'lucide-react';
import { useState } from 'react';
import { DeanPage } from '../dean-ui';
import { useDataContext } from '@/context/data-context';
import { useUser } from '@/firebase';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function Campus() {
  const { campusEvents, addCampusEvent } = useDataContext();
  const { user } = useUser();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Academic');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  const publish = async () => {
    if (!title.trim() || !date || !location.trim()) return;
    setIsPublishing(true);
    try {
      await addCampusEvent({
        title: title.trim(),
        category,
        date,
        location: location.trim(),
        description: description.trim(),
        createdBy: user?.uid || '',
        createdByName: user?.displayName || 'Dean',
      });
      toast({ title: 'Campus event published', description: 'Students and teachers can now see the event.' });
      setTitle('');
      setDate('');
      setLocation('');
      setDescription('');
    } catch {
      toast({ variant: 'destructive', title: 'Could not publish event', description: 'Please try again.' });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <DeanPage title="Campus Events" subtitle="Only the Dean can publish official campus events. Students and teachers can only view published events.">
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 font-black"><CalendarDays className="h-5 w-5 text-[#5b51a3]" /> Publish campus event</div>
          <Input className="mt-5" value={title} onChange={e => setTitle(e.target.value)} placeholder="Event title" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <select value={category} onChange={e => setCategory(e.target.value)} className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm"><option>Academic</option><option>Co-Curricular</option><option>Sports</option><option>Workshop</option><option>Other</option></select>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <Input className="mt-4" value={location} onChange={e => setLocation(e.target.value)} placeholder="Location" />
          <Textarea className="mt-4 min-h-28" value={description} onChange={e => setDescription(e.target.value)} placeholder="Event details for students and teachers..." />
          <Button className="mt-4 bg-[#37336e] hover:bg-[#2f2a60]" disabled={isPublishing || !title.trim() || !date || !location.trim()} onClick={publish}><Send className="mr-2 h-4 w-4" />{isPublishing ? 'Publishing...' : 'Publish event'}</Button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between"><div><h2 className="font-black">Published events</h2><p className="text-xs text-slate-400">Only Dean-published events are shown.</p></div><Users className="h-5 w-5 text-[#5b51a3]" /></div>
          {campusEvents.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-10 text-center"><CalendarDays className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 font-semibold text-slate-600">No events published</p><p className="mt-1 text-sm text-slate-400">The list stays empty until the Dean publishes an event.</p></div>
          ) : (
            <div className="mt-5 space-y-3">{campusEvents.map(event => <div key={event.id} className="rounded-xl bg-[#fafafe] p-4"><p className="font-bold">{event.title}</p><p className="mt-1 text-xs text-slate-500">{event.category} · {format(new Date(event.date), 'PPP')} · {event.location}</p>{event.description && <p className="mt-2 text-sm text-slate-600">{event.description}</p>}</div>)}</div>
          )}
        </div>
      </div>
    </DeanPage>
  );
}
