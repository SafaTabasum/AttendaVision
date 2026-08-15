
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page is no longer used for the teacher role.
// Redirect to the dashboard.
export default function StudentsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return null;
}
