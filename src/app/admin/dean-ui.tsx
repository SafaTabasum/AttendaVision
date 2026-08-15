'use client';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, GraduationCap, School, ClipboardCheck, FileBarChart2, MessageSquare, CalendarDays, CalendarRange, Bell, Library, Landmark, History, UserCircle, Settings } from 'lucide-react';

export const deanNav = [
  ['/admin/dashboard','Dashboard',LayoutDashboard],
  ['/admin/students','Students',Users],
  ['/admin/teachers','Teachers',GraduationCap],
  ['/admin/classes','Classes',School],
  ['/admin/attendance','Attendance',ClipboardCheck],
  ['/admin/reports','Reports',FileBarChart2],
  ['/admin/grievances','Grievances',MessageSquare],
  ['/admin/timetable','Timetable',CalendarDays],
  ['/admin/calendar','Academic Calendar',CalendarRange],
  ['/admin/resources','Resources',Library],
  ['/admin/campus','Campus',Landmark],
  ['/admin/notifications','Notifications',Bell],
  ['/admin/audit','Audit Log',History],
  ['/profile','Profile',UserCircle],
  ['/settings','Settings',Settings],
] as const;

// Kept as a compatibility component because the existing admin pages import it.
// Dean navigation now lives in the same global header style as Student/Teacher.
export function DeanSectionNav(){ return null; }

export function DeanPage({title,subtitle,children,action}:{title:string;subtitle?:string;children:ReactNode;action?:ReactNode}){
  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#f7f8fb] px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs text-slate-500">Department Overview</p>
            <h1 className="mt-1 text-[24px] font-extrabold tracking-tight text-[#171827]">{title}</h1>
            {subtitle&&<p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </div>
        {children}
      </div>
    </main>
  );
}

export function StatCard({label,value,hint,icon:Icon,tone='purple'}:{label:string;value:string|number;hint?:string;icon:any;tone?:'purple'|'green'|'red'|'amber'|'blue'}){
  const tones={purple:'bg-[#f0eefb] text-[#37336e]',green:'bg-emerald-50 text-emerald-600',red:'bg-rose-50 text-rose-600',amber:'bg-amber-50 text-amber-600',blue:'bg-blue-50 text-blue-600'};
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div className={cn('flex h-10 w-10 items-center justify-center rounded-xl',tones[tone])}><Icon className="h-5 w-5"/></div><span className="text-xs font-semibold text-slate-400">Department</span></div><div className="mt-4 text-2xl font-black text-[#171827]">{value}</div><div className="text-sm font-semibold text-slate-600">{label}</div>{hint&&<div className="mt-1 text-xs text-slate-400">{hint}</div>}</div>
}
