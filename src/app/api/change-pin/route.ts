import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: max 5 attempts per IP per 15 minutes (shares window with verify-pin)
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseServer = createClient(supabaseUrl, supabaseKey);
    const { currentPin, newPin } = await req.json();

    if (
      !currentPin || typeof currentPin !== 'string' || !/^\d{4}$/.test(currentPin) ||
      !newPin || typeof newPin !== 'string' || !/^\d{4}$/.test(newPin)
    ) {
      return NextResponse.json({ ok: false, error: 'Invalid PIN format' }, { status: 400 });
    }

    // Fetch stored hash
    const { data, error } = await supabaseServer
      .from('app_pin')
      .select('pin')
      .eq('id', 1)
      .single();

    if (error || !data) {
      return NextResponse.json({ ok: false, error: 'PIN record not found' }, { status: 500 });
    }

    // Verify current PIN
    const isValid = await bcrypt.compare(currentPin, data.pin);
    if (!isValid) {
      return NextResponse.json({ ok: false, error: 'Current PIN is incorrect' });
    }

    // Update with new hashed PIN
    const newHashedPin = await bcrypt.hash(newPin, 10);
    const { error: updateError } = await supabaseServer
      .from('app_pin')
      .update({ pin: newHashedPin })
      .eq('id', 1);

    if (updateError) {
      return NextResponse.json({ ok: false, error: 'Failed to update PIN' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
