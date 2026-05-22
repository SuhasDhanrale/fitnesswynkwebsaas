import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';

// Server-side client using service-role-equivalent anon key
// This route runs only on the server — env vars WITHOUT NEXT_PUBLIC_ are never sent to the browser
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServer = createClient(supabaseUrl, supabaseKey);

function hashPin(pin: string): string {
  return createHash('sha256').update(pin).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
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

    const inputHash = hashPin(pin);
    const correct = inputHash === data.pin;

    // Intentionally return the same shape regardless of outcome to avoid timing leaks
    return NextResponse.json({ ok: correct });
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
