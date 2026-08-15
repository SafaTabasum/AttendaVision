'use client';

import type { ReactNode } from 'react';
import { FirebaseClientProvider, useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import TopNav from './top-nav';
import { Loader2 } from 'lucide-react';
import { DataProvider } from '@/context/data-context';
import BottomNav from './bottom-nav';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

function AuthGuard({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  
  const isTeacher = user?.email?.endsWith('@teacher.com') || user?.email?.endsWith('@faculty.com');
  const isDean = user?.email?.endsWith('@dean.com');
  const isStudent = !isTeacher && !isDean;

  useEffect(() => {
    if (isUserLoading) return;

    const isLoginPage = pathname === '/login';

    if (!user && !isLoginPage) {
      router.push('/login');
    }
    
    if (user) {
      if (isLoginPage) {
        if (isDean) {
          router.push('/admin/dashboard');
        } else {
          router.push('/dashboard');
        }
      } else if (isDean && !pathname.startsWith('/admin')) {
         if (pathname === '/dashboard') {
            router.push('/admin/dashboard');
         }
      } else if (!isDean && pathname.startsWith('/admin')) {
          router.push('/dashboard');
      } else if (isStudent && pathname === '/history') {
          router.push('/dashboard');
      }
    }
  }, [user, isUserLoading, router, pathname, isDean, isStudent]);

  if (isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  // Allow access to login page for non-authenticated users
  if (pathname === '/login') {
    return <>{children}</>;
  }
  
  // If user is not loaded and not on login, show loader or nothing
  if (!user) {
     return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
     );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <TopNav />
      <main className={cn(
        "flex-1",
        (isStudent || isTeacher || isDean) && isMobile && "pb-20"
      )}>
        {children}
      </main>
      {(isStudent || isTeacher || isDean) && isMobile && <BottomNav />}
    </div>
  );
}


export default function MainLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            console.log('Service Worker registration successful with scope: ', registration.scope);
          },
          (err) => {
            console.log('Service Worker registration failed: ', err);
          }
        );
      });
    }
  }, []);

  return (
    <FirebaseClientProvider>
      <DataProvider>
        <AuthGuard>{children}</AuthGuard>
      </DataProvider>
    </FirebaseClientProvider>
  );
}
