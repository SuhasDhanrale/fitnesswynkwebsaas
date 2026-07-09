import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { checkRateLimit } from '@/lib/rateLimit';
import { sql } from '@/lib/db';
import { assertAppSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    assertAppSession();
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown';
    const rateLimit = checkRateLimit(`verify-pin:${ip}`);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { ok: false, error: `Too many attempts. Try again in ${Math.ceil(rateLimit.resetInSeconds / 60)} minutes.` },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.resetInSeconds),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    const { currentPin, newPin } = await req.json();

    if (
      !currentPin || typeof currentPin !== 'string' || !/^\d{4}$/.test(currentPin) ||
      !newPin || typeof newPin !== 'string' || !/^\d{4}$/.test(newPin)
    ) {
      return NextResponse.json({ ok: false, error: 'Invalid PIN format' }, { status: 400 });
    }

    const rows = await sql`select pin from public.app_pin where id = 1 limit 1`;
    const hash = rows[0]?.pin as string | undefined;

    if (!hash) {
      return NextResponse.json({ ok: false, error: 'PIN record not found' }, { status: 500 });
    }

    const isValid = await bcrypt.compare(currentPin, hash);
    if (!isValid) {
      return NextResponse.json({ ok: false, error: 'Current PIN is incorrect' });
    }

    const newHashedPin = await bcrypt.hash(newPin, 10);
    await sql`update public.app_pin set pin = ${newHashedPin} where id = 1`;

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
