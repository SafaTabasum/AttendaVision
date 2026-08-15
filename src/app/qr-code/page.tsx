'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page is no longer directly accessible via the menu.
// Redirect to the dashboard.
export default function QrCodePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return null;
}
