export const dynamic = 'force-dynamic';

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { sql } from '@/lib/db';
import { parseSmartText } from '@/lib/parser';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const AUTHORIZED_OWNER_PHONE = process.env.AUTHORIZED_OWNER_PHONE;
const APP_SECRET = process.env.WHATSAPP_APP_SECRET;

type MemberRow = {
  id: string;
  name: string;
  phone_number: string;
  plan_name: string;
  batch: string;
  expiry_date: string | number;
};

async function sendWhatsAppMessage(to: string, text: string) {
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    console.error('WhatsApp credentials not set in environment.');
    return;
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: text },
      }),
    });

    if (!res.ok) {
      const errData = await res.json();
      console.error('Meta API Error:', JSON.stringify(errData));
    }
  } catch (error) {
    console.error('Failed to send WhatsApp reply:', error);
  }
}

function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (process.env.NODE_ENV === 'development' && !APP_SECRET) return true;
  if (!APP_SECRET || !signatureHeader?.startsWith('sha256=')) return false;

  const expected = `sha256=${crypto
    .createHmac('sha256', APP_SECRET)
    .update(rawBody)
    .digest('hex')}`;
  const actual = signatureHeader;
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  return expectedBuffer.length === actualBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified successfully.');
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    if (!verifyWebhookSignature(rawBody, req.headers.get('x-hub-signature-256'))) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);

    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ error: 'Invalid object type' }, { status: 400 });
    }

    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message || message.type !== 'text') {
      return NextResponse.json({ success: true, message: 'Non-text message ignored' });
    }

    const from = message.from;
    const textBody = message.text.body;

    if (AUTHORIZED_OWNER_PHONE && from !== AUTHORIZED_OWNER_PHONE) {
      console.warn(`Unauthorized message attempt from ${from}`);
      return NextResponse.json({ error: 'Unauthorized sender' }, { status: 401 });
    }

    const parsed = parseSmartText(textBody, true);

    if (!parsed.name) {
      await sendWhatsAppMessage(
        from,
        'Could not recognize a member name. Try: Add Rahul 9876543210 paid 1500 for 1 month'
      );
      return NextResponse.json({ success: true, info: 'Failed to extract name' });
    }

    const amount = parsed.amount ? parseFloat(parsed.amount) : 0;
    const duration = parsed.duration || '1 Month';
    const paymentMode = parsed.paymentMode || 'UPI';

    const startDate = Date.now();
    let durationMs = 30 * 24 * 60 * 60 * 1000;
    if (duration === '3 Months') durationMs = 90 * 24 * 60 * 60 * 1000;
    if (duration === '6 Months') durationMs = 180 * 24 * 60 * 60 * 1000;
    if (duration === '1 Year') durationMs = 365 * 24 * 60 * 60 * 1000;
    const expiryDate = startDate + durationMs;

    if (parsed.phone) {
      const existingMembers = await sql`
        select id from public.members
        where phone_number = ${parsed.phone}
        limit 1
      `;

      if (existingMembers[0]) {
        await sendWhatsAppMessage(
          from,
          `Phone number ${parsed.phone} is already registered to an existing member.`
        );
        return NextResponse.json({ success: true, info: 'Member already exists' });
      }

      const memberId = uuidv4();
      const statements = [
        sql`
          insert into public.members (
            id, name, phone_number, plan_name, batch, start_date, expiry_date,
            duration_label, notes, due_amount
          ) values (
            ${memberId}::uuid, ${parsed.name}, ${parsed.phone}, ${'Regular'}, ${'6-7 AM'},
            ${startDate}, ${expiryDate}, ${duration}, ${'Added via WhatsApp Bot'}, 0
          )
        `,
      ];

      if (amount > 0) {
        statements.push(sql`
          insert into public.payments (
            id, member_id, member_name, amount, payment_mode, plan_name, batch,
            start_date, end_date, notes, timestamp
          ) values (
            ${uuidv4()}::uuid, ${memberId}::uuid, ${parsed.name}, ${amount}, ${paymentMode},
            ${'Regular'}, ${'6-7 AM'}, ${startDate}, ${expiryDate},
            ${'Initial payment logged via WhatsApp Bot'}, ${startDate}
          )
        `);
      }

      await sql.transaction(statements);

      await sendWhatsAppMessage(
        from,
        `Added new member ${parsed.name}. Phone: ${parsed.phone}. Plan: ${duration}. Paid: INR ${amount} (${paymentMode}). Expiry: ${new Date(expiryDate).toLocaleDateString('en-IN')}`
      );
    } else {
      const matchedMembers = await sql`
        select id, name, phone_number, plan_name, batch, expiry_date
        from public.members
        where name ilike ${`%${parsed.name}%`}
      ` as MemberRow[];

      if (matchedMembers.length === 0) {
        await sendWhatsAppMessage(
          from,
          `No member found matching name "${parsed.name}". Please check the spelling or add them first.`
        );
        return NextResponse.json({ success: true, info: 'No member matched' });
      }

      if (matchedMembers.length > 1) {
        const namesList = matchedMembers
          .map((m, idx) => `${idx + 1}. ${m.name} (${m.phone_number})`)
          .join('\n');
        await sendWhatsAppMessage(
          from,
          `Found multiple members matching "${parsed.name}":\n\n${namesList}\n\nPlease include the phone number.`
        );
        return NextResponse.json({ success: true, info: 'Multiple matches found' });
      }

      const member = matchedMembers[0];
      const now = Date.now();
      const newExpiry = Math.max(Number(member.expiry_date), now) + durationMs;

      await sql.transaction([
        sql`
          insert into public.payments (
            id, member_id, member_name, amount, payment_mode, plan_name, batch,
            start_date, end_date, notes, timestamp
          ) values (
            ${uuidv4()}::uuid, ${member.id}::uuid, ${member.name}, ${amount}, ${paymentMode},
            ${member.plan_name}, ${member.batch}, ${now}, ${newExpiry},
            ${'Payment logged via WhatsApp Bot'}, ${now}
          )
        `,
        sql`
          update public.members
          set expiry_date = ${newExpiry}, duration_label = ${duration}, due_amount = 0
          where id = ${member.id}::uuid
        `,
      ]);

      await sendWhatsAppMessage(
        from,
        `Renewed ${member.name}. Logged INR ${amount} (${paymentMode}). Plan extended by ${duration}. New expiry: ${new Date(newExpiry).toLocaleDateString('en-IN')}`
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Fatal webhook error:', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
