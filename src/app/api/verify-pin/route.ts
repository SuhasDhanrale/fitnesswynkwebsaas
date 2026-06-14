import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: max 5 attempts per IP per 15 minutes
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
    const { pin } = await req.json();

    if (!pin || typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ ok: false, error: 'Invalid PIN format' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('app_pin')
      .select('pin')
      .eq('id', 1)
      .single();

    if (error || !data) {
      return NextResponse.json({ ok: false, error: 'PIN record not found' }, { status: 500 });
    }

    const correct = await bcrypt.compare(pin, data.pin);

    // Intentionally return the same shape regardless of outcome to avoid timing leaks
    const headers: Record<string, string> = {
      'X-RateLimit-Remaining': String(rateLimit.remaining),
    };
    return NextResponse.json({ ok: correct }, { headers });
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
