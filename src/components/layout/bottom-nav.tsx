'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, CalendarDays, MapPin, User, ScanLine, CheckCircle2, Users, FileBarChart2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';

const studentNavItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/courses', label: 'Courses', icon: BookOpen },
  { href: '/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/events', label: 'Events', icon: MapPin },
  { href: '/profile', label: 'Account', icon: User },
];

const deanNavItems = [
  { href: '/admin/dashboard', label: 'Home', icon: Home },
  { href: '/admin/students', label: 'Students', icon: Users },
  { href: '/admin/attendance', label: 'Attendance', icon: CheckCircle2 },
  { href: '/admin/reports', label: 'Reports', icon: FileBarChart2 },
  { href: '/admin/grievances', label: 'Grievances', icon: MessageSquare },
];

const teacherNavItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/attendance', label: 'Attendance', icon: CheckCircle2 },
  { href: '/profile', label: 'Account', icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const isTeacher = user?.email?.endsWith('@teacher.com') || user?.email?.endsWith('@faculty.com');
  const isDean = user?.email?.endsWith('@dean.com');
  const navItems = isDean ? deanNavItems : isTeacher ? teacherNavItems : studentNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 shadow-[0_-4px_20px_rgba(20,20,40,.05)] backdrop-blur md:hidden">
      <div className="mx-auto grid h-[68px] max-w-[520px] grid-cols-4 px-2">
        {navItems.map((item) => {
          const active = item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={cn('flex flex-col items-center justify-center gap-1 text-[10px] font-semibold', active ? 'text-[#37336e]' : 'text-slate-400')}>
              <span className={cn('flex h-8 w-8 items-center justify-center rounded-xl', active && 'bg-[#f0eefb]')}>
                <item.icon className="h-[18px] w-[18px]" />
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
