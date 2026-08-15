'use client';

import { useUser, useAuth } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { ChevronRight, LogOut, Plus, Settings, UserRound, BriefcaseBusiness, BookOpen, GraduationCap, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { StudentPage, SectionCard } from '@/components/student/student-page';
import { Button } from '@/components/ui/button';
import { getTeacherNameByEmail } from '@/lib/timetable';

function TeacherProfile() {
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const logout = () => { auth.signOut(); router.push('/login'); };
  // Auth displayName is usually empty for these accounts, so fall back to
  // the teacher's real name from the timetable instead of "Faculty Member".
  const displayName = user?.displayName || getTeacherNameByEmail(user?.email) || 'Faculty Member';
  const sections = [
    ['Experience', BriefcaseBusiness],
    ['Research Projects', BookOpen],
    ['Paper Publications', FileText],
    ['Workshops', GraduationCap],
    ['Education', GraduationCap],
  ] as const;
  return <div className="min-h-[calc(100vh-56px)] bg-white px-4 pb-10 md:px-8"><div className="mx-auto max-w-4xl"><div className="relative mb-7 overflow-hidden rounded-b-[28px] bg-[#2d6e67] pt-20"><div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 70% 60%, white 1px, transparent 1px)', backgroundSize: '26px 26px' }} /><div className="relative mx-auto flex h-28 w-28 translate-y-12 items-center justify-center rounded-[24px] bg-white text-5xl font-extrabold text-[#183d5d] shadow-md">{displayName.charAt(0)}</div></div><div className="pb-5 text-center"><p className="text-xl font-extrabold">{displayName}</p><p className="mt-1 text-sm font-semibold uppercase tracking-wide text-slate-600">Assistant Professor · Department of Information Technology</p><p className="mt-2 text-xs text-slate-400">{user?.email || ''}</p></div><div className="divide-y-4 divide-slate-100 rounded-2xl bg-white">{sections.map(([label, Icon]) => <div key={label} className="flex items-center justify-between px-5 py-5"><div className="flex items-center gap-3"><Icon className="h-5 w-5 text-[#183d5d]" /><p className="text-base font-semibold">{label}</p></div><Button size="icon" variant="outline" className="h-9 w-9 rounded-lg border-[#3f3fb4] text-[#3f3fb4]"><Plus className="h-4 w-4" /></Button></div>)}</div><div className="mt-5 flex flex-wrap gap-2"><Link href="/settings"><Button variant="outline" className="rounded-xl"><Settings className="mr-2 h-4 w-4" />Settings</Button></Link><Button variant="outline" className="rounded-xl text-[#d95878]" onClick={logout}><LogOut className="mr-2 h-4 w-4" />Logout</Button></div></div></div>;
}

function StudentProfile() {
  const {user}=useUser(); const auth=useAuth(); const router=useRouter(); const logout=()=>{auth.signOut();router.push('/login')};
  return <StudentPage title="Account"><div className="mb-4 rounded-2xl bg-[#37336e] p-5 text-white"><div className="flex items-center gap-3"><Avatar className="h-16 w-16 ring-2 ring-white/20"><AvatarImage src={user?.photoURL||undefined}/><AvatarFallback className="bg-white text-[#37336e]">{user?.displayName?.charAt(0)||'S'}</AvatarFallback></Avatar><div><p className="text-lg font-extrabold">{user?.displayName||'Student'}</p><p className="text-xs text-white/70">IT · II-A · Room 423</p><p className="mt-1 text-[10px] text-white/60">{user?.email||''}</p></div></div></div><SectionCard><div className="space-y-1">{[['/attendance','Attendance'],['/settings','Settings']].map(([h,l])=><Link key={h} href={h} className="flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-slate-50"><UserRound className="h-4 w-4 text-[#4b4680]"/><span className="flex-1 text-sm font-semibold">{l}</span><ChevronRight className="h-4 w-4 text-slate-300"/></Link>)}<button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left text-sm font-semibold text-[#d95878] hover:bg-slate-50"><LogOut className="h-4 w-4"/>Logout</button></div></SectionCard></StudentPage>
}

export default function ProfilePage(){ const {user}=useUser(); const teacher=user?.email?.endsWith('@teacher.com')||user?.email?.endsWith('@faculty.com'); return teacher ? <TeacherProfile/> : <StudentProfile/>; }
