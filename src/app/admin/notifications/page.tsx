'use client';

import { useState } from 'react';
import { Send, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { DeanPage } from '../dean-ui';
import { useDataContext } from '@/context/data-context';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

const audienceOptions = [
  { value: 'all_students', label: 'All students' },
  { value: 'year', label: 'Specific year' },
  { value: 'class', label: 'Specific class' },
  { value: 'section', label: 'Specific section' },
  { value: 'teachers', label: 'Teachers' },
  { value: 'department', label: 'Entire department' },
] as const;

export default function NoticeBoard() {
  const { addNotification } = useDataContext();
  const { user } = useUser();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<(typeof audienceOptions)[number]['value']>('department');
  const [isSending, setIsSending] = useState(false);

  const send = async () => {
    if (!title.trim() || !body.trim()) return;
    setIsSending(true);
    try {
      await addNotification({
        type: 'general',
        title: title.trim(),
        body: body.trim(),
        uploaderId: user?.uid || '',
        uploaderName: user?.displayName || 'Dean',
        audience,
      });
      toast({ title: 'Notice published', description: 'The announcement is now available on the Digital Notice Board.' });
      setTitle('');
      setBody('');
    } catch {
      toast({ variant: 'destructive', title: 'Could not publish notice', description: 'Please try again.' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <DeanPage title="Notice Board" subtitle="Publish official department announcements for students and teachers.">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 font-black text-[#171827]"><Bell className="h-5 w-5 text-[#5b51a3]" /> Create notice</div>
          <label className="mt-5 block text-sm font-semibold">Audience</label>
          <select value={audience} onChange={e => setAudience(e.target.value as typeof audience)} className="mt-2 h-11 w-full rounded-md border border-slate-200 bg-white px-3">
            {audienceOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <Input className="mt-4" value={title} onChange={e => setTitle(e.target.value)} placeholder="Notice title" />
          <Textarea className="mt-4 min-h-32" value={body} onChange={e => setBody(e.target.value)} placeholder="Write the official department announcement..." />
          <Button className="mt-4 bg-[#37336e] hover:bg-[#2f2a60]" disabled={isSending || !title.trim() || !body.trim()} onClick={send}>
            <Send className="mr-2 h-4 w-4" />{isSending ? 'Publishing...' : 'Publish notice'}
          </Button>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-black">How it works</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Only the Dean can publish official notices. Students and teachers can read published notices from the Digital Notice Board.</p>
          <div className="mt-5 rounded-xl bg-[#f5f3fc] p-4 text-sm text-[#37336e]">If no notice has been published, the Digital Notice Board stays empty.</div>
        </div>
      </div>
    </DeanPage>
  );
}
