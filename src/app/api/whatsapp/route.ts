import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabaseClient';
import { parseSmartText } from '../../../lib/parser';
import { v4 as uuidv4 } from 'uuid';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'fitnesswynk_token_123';
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const AUTHORIZED_OWNER_PHONE = process.env.AUTHORIZED_OWNER_PHONE; // India code + number (e.g., '919876543210')

// Helper function to send reply message back via WhatsApp Cloud API
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
        to: to,
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

// ─── GET: WEBHOOK VERIFICATION ───────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified successfully!');
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

// ─── POST: HANDLER FOR INCOMING MESSAGES ──────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Verify it is a WhatsApp message webhook
    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ error: 'Invalid object type' }, { status: 400 });
    }

    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message || message.type !== 'text') {
      // Ignore non-text messages (or media, etc.)
      return NextResponse.json({ success: true, message: 'Non-text message ignored' });
    }

    const from = message.from; // Sender's phone number
    const textBody = message.text.body; // Message content

    // Basic authorization check: verify it's the owner texting the bot
    if (AUTHORIZED_OWNER_PHONE && from !== AUTHORIZED_OWNER_PHONE) {
      console.warn(`Unauthorized message attempt from ${from}`);
      return NextResponse.json({ error: 'Unauthorized sender' }, { status: 401 });
    }

    // 1. Parse text using our smart parser
    const parsed = parseSmartText(textBody, true);

    if (!parsed.name) {
      await sendWhatsAppMessage(
        from,
        '❌ Could not recognize a member name. Please format like:\n- Add Member: "Add Rahul 9876543210 paid 1500 for 1 month"\n- Renewal: "Rahul paid 1500 Cash"'
      );
      return NextResponse.json({ success: true, info: 'Failed to extract name' });
    }

    const amount = parsed.amount ? parseFloat(parsed.amount) : 0;
    const duration = parsed.duration || '1 Month';
    const paymentMode = parsed.paymentMode || 'UPI';

    // Calculate dates
    const startDate = Date.now();
    let durationMs = 30 * 24 * 60 * 60 * 1000; // Default 1 Month
    if (duration === '3 Months') durationMs = 90 * 24 * 60 * 60 * 1000;
    if (duration === '6 Months') durationMs = 180 * 24 * 60 * 60 * 1000;
    if (duration === '1 Year') durationMs = 365 * 24 * 60 * 60 * 1000;
    const expiryDate = startDate + durationMs;

    // 2. Determine Action Type based on whether phone number exists
    if (parsed.phone) {
      // ─── CASE A: NEW MEMBER REGISTRATION ───
      const memberId = uuidv4();

      // Check if phone number is already registered
      const { data: existingMember } = await supabase
        .from('members')
        .select('id')
        .eq('phone_number', parsed.phone)
        .maybeSingle();

      if (existingMember) {
        await sendWhatsAppMessage(
          from,
          `⚠️ Phone number ${parsed.phone} is already registered to an existing member.`
        );
        return NextResponse.json({ success: true, info: 'Member already exists' });
      }

      // Create new member row in Supabase
      const { error: memberError } = await supabase.from('members').insert({
        id: memberId,
        name: parsed.name,
        phone_number: parsed.phone,
        plan_name: 'Regular', // Default plan if none specified
        batch: '6-7 AM',     // Default batch
        start_date: startDate,
        expiry_date: expiryDate,
        duration_label: duration,
        notes: 'Added via WhatsApp Bot',
        due_amount: 0,
      });

      if (memberError) {
        await sendWhatsAppMessage(from, `❌ Error creating member: ${memberError.message}`);
        return NextResponse.json({ error: memberError.message }, { status: 500 });
      }

      // Log initial payment if amount is specified
      if (amount > 0) {
        await supabase.from('payments').insert({
          id: uuidv4(),
          member_id: memberId,
          member_name: parsed.name,
          amount: amount,
          payment_mode: paymentMode,
          plan_name: 'Regular',
          batch: '6-7 AM',
          start_date: startDate,
          end_date: expiryDate,
          notes: 'Initial payment logged via WhatsApp Bot',
          timestamp: startDate,
        });
      }

      await sendWhatsAppMessage(
        from,
        `✅ Added new member *${parsed.name}*!\n📞 Phone: ${parsed.phone}\n📆 Plan: ${duration}\n💰 Paid: ₹${amount} (${paymentMode})\n🕒 Expiry: ${new Date(
          expiryDate
        ).toLocaleDateString('en-IN')}`
      );
    } else {
      // ─── CASE B: EXISTING MEMBER PAYMENT / RENEWAL ───
      // Search for member by name (case-insensitive fuzzy match)
      const { data: matchedMembers, error: searchError } = await supabase
        .from('members')
        .select('*')
        .ilike('name', `%${parsed.name}%`);

      if (searchError) {
        await sendWhatsAppMessage(from, `❌ Database error searching member: ${searchError.message}`);
        return NextResponse.json({ error: searchError.message }, { status: 500 });
      }

      if (!matchedMembers || matchedMembers.length === 0) {
        await sendWhatsAppMessage(
          from,
          `❌ No member found matching name "${parsed.name}". Please check the spelling or add them first.`
        );
        return NextResponse.json({ success: true, info: 'No member matched' });
      }

      if (matchedMembers.length > 1) {
        // Disambiguation message
        const namesList = matchedMembers.map((m, idx) => `${idx + 1}. ${m.name} (${m.phone_number})`).join('\n');
        await sendWhatsAppMessage(
          from,
          `⚠️ Found multiple members matching "${parsed.name}":\n\n${namesList}\n\nPlease include the phone number in your message to specify which member.`
        );
        return NextResponse.json({ success: true, info: 'Multiple matches found' });
      }

      const member = matchedMembers[0];
      const newExpiry = Math.max(member.expiry_date, Date.now()) + durationMs;

      // Log payment in Supabase
      const { error: payError } = await supabase.from('payments').insert({
        id: uuidv4(),
        member_id: member.id,
        member_name: member.name,
        amount: amount,
        payment_mode: paymentMode,
        plan_name: member.plan_name,
        batch: member.batch,
        start_date: Date.now(),
        end_date: newExpiry,
        notes: 'Payment logged via WhatsApp Bot',
        timestamp: Date.now(),
      });

      if (payError) {
        await sendWhatsAppMessage(from, `❌ Error logging payment: ${payError.message}`);
        return NextResponse.json({ error: payError.message }, { status: 500 });
      }

      // Update Member details and set due amount to 0
      const { error: updateError } = await supabase
        .from('members')
        .update({
          expiry_date: newExpiry,
          duration_label: duration,
          due_amount: 0,
        })
        .eq('id', member.id);

      if (updateError) {
        await sendWhatsAppMessage(from, `❌ Error updating expiry: ${updateError.message}`);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      await sendWhatsAppMessage(
        from,
        `✅ Renewed *${member.name}*!\n💰 Logged ₹${amount} (${paymentMode})\n📆 Plan extended by ${duration}\n🕒 New Expiry: ${new Date(
          newExpiry
        ).toLocaleDateString('en-IN')}`
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Fatal webhook error:', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
