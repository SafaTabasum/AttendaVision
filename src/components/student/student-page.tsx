'use client';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
export function StudentPage({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <div className="student-mobile-surface min-h-[calc(100vh-56px)] px-4 pb-24 pt-4 md:max-w-5xl md:px-8 md:pb-10"><div className="mb-5 flex items-center gap-3"><Link href="/dashboard" className="rounded-full p-2 text-[#37336e] hover:bg-white"><ArrowLeft className="h-5 w-5" /></Link><h1 className="flex-1 text-xl font-extrabold text-[#171827]">{title}</h1>{action}</div>{children}</div>;
}
export function SectionCard({ title, icon: Icon, children, href }: { title?: string; icon?: any; children: ReactNode; href?: string }) {
  return <Card className="student-card"><CardContent className="p-4">{title && <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-bold">{Icon && <Icon className="h-4 w-4 text-[#4b4680]" />}{title}</div>{href && <Link href={href} className="text-xs font-semibold text-[#4b4680]">View all</Link>}</div>}{children}</CardContent></Card>;
}
export const MiniTile=({href,label,icon:Icon,tone='bg-[#f0eefb] text-[#4b4680]'}:{href:string;label:string;icon:any;tone?:string})=><Link href={href} className="rounded-2xl bg-white p-3 text-center shadow-sm"><div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4"/></div><span className="text-[11px] font-semibold">{label}</span></Link>;
