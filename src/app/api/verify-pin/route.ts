import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { consumeRateLimitAttempt, getRateLimitStatus } from '@/lib/rateLimit';
import { sql } from '@/lib/db';
import { setSessionCookie } from '@/lib/session';

const PIN_MAX_FAILED_ATTEMPTS = 3;
const PIN_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown';
    const rateLimitKey = `verify-pin:${ip}`;
    const rateLimit = getRateLimitStatus(rateLimitKey, PIN_MAX_FAILED_ATTEMPTS, PIN_WINDOW_MS);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { ok: false, error: 'Too many failed attempts. Try again tomorrow.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.resetInSeconds),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    const { pin } = await req.json();

    if (!pin || typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ ok: false, error: 'Invalid PIN format' }, { status: 400 });
    }

    const rows = await sql`select pin from public.app_pin where id = 1 limit 1`;
    const hash = rows[0]?.pin as string | undefined;

    if (!hash) {
      return NextResponse.json({ ok: false, error: 'PIN record not found' }, { status: 500 });
    }

    const correct = await bcrypt.compare(pin, hash);
    if (correct) {
      setSessionCookie();
      return NextResponse.json(
        { ok: true },
        { headers: { 'X-RateLimit-Remaining': String(rateLimit.remaining) } }
      );
    }

    const failedLimit = consumeRateLimitAttempt(rateLimitKey, PIN_MAX_FAILED_ATTEMPTS, PIN_WINDOW_MS);
    return NextResponse.json(
      { ok: false },
      { headers: { 'X-RateLimit-Remaining': String(failedLimit.remaining) } }
    );
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
