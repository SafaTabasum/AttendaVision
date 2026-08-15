'use client';

import Link from 'next/link';
import {
  GraduationCap,
  LayoutDashboard,
  Camera,
  History,
  User,
  Settings,
  LogOut,
  Menu,
  Shield,
  BookOpen,
  Users,
  Folder,
  MessagesSquare,
  Smartphone,
  KeyRound,
  CalendarDays,
  ScanLine,
  ClipboardCheck,
  Bell,
  HelpCircle,
  Landmark,
  MoreHorizontal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useAuth, useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';

const teacherNavItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/schedule', icon: CalendarDays, label: 'Schedule' },
  { href: '/attendance', icon: Camera, label: 'Take Attendance' },
  { href: '/scan', icon: ScanLine, label: 'Scanner' },
  { href: '/requests', icon: ClipboardCheck, label: 'Requests' },
  { href: '/resources', icon: Folder, label: 'Resources' },
];

const studentNavItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/resources', icon: Folder, label: 'Resources' },
  { href: '/grievances', icon: MessagesSquare, label: 'My Grievances' },
];

const deanNavItems = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard'},
  { href: '/admin/students', icon: Users, label: 'Students'},
  { href: '/admin/teachers', icon: GraduationCap, label: 'Teachers'},
  { href: '/admin/classes', icon: BookOpen, label: 'Classes'},
  { href: '/admin/attendance', icon: ClipboardCheck, label: 'Attendance'},
  { href: '/admin/reports', icon: Folder, label: 'Reports'},
  { href: '/admin/grievances', icon: MessagesSquare, label: 'Grievances'},
  { href: '/admin/timetable', icon: CalendarDays, label: 'Timetable'},
  { href: '/admin/calendar', icon: CalendarDays, label: 'Academic Calendar'},
  { href: '/admin/resources', icon: Folder, label: 'Resources'},
  { href: '/admin/campus', icon: Landmark, label: 'Campus'},
  { href: '/admin/notifications', icon: Bell, label: 'Notice Board'},
  { href: '/admin/audit', icon: History, label: 'Audit Log'},
  { href: '/profile', icon: User, label: 'Profile'},
  { href: '/settings', icon: Settings, label: 'Settings'},
];
const deanPrimaryNav = deanNavItems.slice(0, 5);
const deanMoreNav = deanNavItems.slice(5);

export default function TopNav() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    auth.signOut();
    router.push('/login');
  };

  if (isUserLoading) {
    return (
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6"></header>
    );
  }

  const isTeacher = user?.email?.endsWith('@teacher.com') || user?.email?.endsWith('@faculty.com');
  const isDean = user?.email?.endsWith('@dean.com');
  const isStudent = !isTeacher && !isDean;
  
  let navItems;
  if (isDean) {
    navItems = deanNavItems;
  } else if (isTeacher) {
    navItems = teacherNavItems;
  } else {
    navItems = studentNavItems;
  }


  const getBaseHref = () => {
    if (isDean) return '/admin/dashboard';
    return '/dashboard';
  }

  const studentMenuDrawer = (
    <SheetContent side="left" className="w-[300px] border-0 bg-[#06486b] p-0 text-white">
      <div className="flex h-full flex-col">
        <div className="border-b border-white/10 p-5">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-white/20"><AvatarImage src={user?.photoURL || undefined} /><AvatarFallback className="bg-white text-[#37336e]">{user?.displayName?.charAt(0) || 'S'}</AvatarFallback></Avatar>
            <div><p className="font-bold">{user?.displayName || 'Student'}</p><p className="text-xs text-white/60">IT · II-A · Room 423</p></div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-4 text-sm">
          {[
            ['/dashboard','Home'],['/schedule','Schedule'],['/attendance','Attendance'],['/events','Campus Events'],['/clubs','Campus Clubs'],['/calendar','Academic Calendar'],['/notices','Digital Notice Board'],['/learning','Learning Management'],['/feedback','Feedback'],['/profile','Account']
          ].map(([href,label]) => <Link key={href} href={href} className="block rounded-xl px-4 py-3 text-white/85 transition hover:bg-white/10 hover:text-white">{label}</Link>)}
        </nav>
        <div className="border-t border-white/10 p-4"><Button variant="ghost" className="w-full justify-start text-white hover:bg-white/10 hover:text-white" onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" />Logout</Button></div>
      </div>
    </SheetContent>
  );

  const defaultMenuDrawer = (
      <SheetContent side="left">
        <nav className="grid gap-6 text-lg font-medium">
          <Link
            href={getBaseHref()}
            className="flex items-center gap-2 text-lg font-semibold"
          >
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="text-nowrap">AttendaVision</span>
          </Link>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`transition-colors hover:text-foreground ${pathname.startsWith(item.href) ? 'text-foreground' : 'text-muted-foreground'
                }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
  );

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-100 bg-[#f7f8fb]/95 px-4 backdrop-blur md:h-16 md:px-6">
      <Link
        href={getBaseHref()}
        className="flex items-center gap-2 text-lg font-semibold md:text-base"
      >
        <GraduationCap className="h-6 w-6 text-primary" />
        <span className="text-nowrap">AttendaVision</span>
      </Link>
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 rounded-xl border-0 bg-white text-[#37336e] shadow-sm md:hidden"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        {isStudent ? studentMenuDrawer : defaultMenuDrawer}
      </Sheet>
      {isDean ? (
        <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex">
          {deanPrimaryNav.map((item) => (
            <Link key={item.href} href={item.href} className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition ${pathname.startsWith(item.href) ? 'bg-[#eeeafd] text-[#37336e]' : 'text-slate-600 hover:bg-white hover:text-[#37336e]'}`}>
              {item.label}
            </Link>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-1 rounded-xl text-sm font-medium text-slate-600 hover:bg-white hover:text-[#37336e]">
                <MoreHorizontal className="h-4 w-4" /> More
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {deanMoreNav.map((item) => (
                <Link key={item.href} href={item.href}><DropdownMenuItem><item.icon className="mr-2 h-4 w-4" />{item.label}</DropdownMenuItem></Link>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      ) : null}
      <div className="flex w-full items-center justify-end gap-4 md:ml-auto md:gap-2 lg:gap-4">
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <Avatar>
                  <AvatarImage src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} data-ai-hint="user avatar" />
                  <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user.displayName || 'My Account'}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link href="/profile">
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
              </Link>
              {!isTeacher && (
                <Link href={isDean ? '/admin/grievances' : '/grievances'}>
                  <DropdownMenuItem>
                    <MessagesSquare className="mr-2 h-4 w-4" />
                    <span>{isDean ? 'Department Grievances' : 'My Grievances'}</span>
                  </DropdownMenuItem>
                </Link>
              )}
              <Link href="/settings">
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
