import { NextResponse } from 'next/server';

/**
 * Returns the public IP address seen by the Vercel/Next.js server.
 * This is an additional audit signal only; it is never used as proof of identity.
 */
export async function GET(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
  return NextResponse.json({ ip });
}
