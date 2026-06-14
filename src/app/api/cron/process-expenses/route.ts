import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { addMonths } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Authenticate Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (
      process.env.NODE_ENV !== 'development' &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseServer = createClient(supabaseUrl, supabaseKey);

    const now = Date.now();

    // Fetch due scheduled expenses
    const { data: dueExpenses, error: fetchError } = await supabaseServer
      .from('scheduled_expenses')
      .select('*')
      .eq('active', true)
      .lte('next_due_date', now);

    if (fetchError) throw fetchError;
    if (!dueExpenses || dueExpenses.length === 0) {
      return NextResponse.json({ success: true, message: 'No expenses due' });
    }

    let processedCount = 0;

    for (const schedule of dueExpenses) {
      // 1. Insert actual expense record
      const expenseId = uuidv4();
      const { error: insertError } = await supabaseServer
        .from('expenses')
        .insert({
          id: expenseId,
          title: schedule.title,
          amount: schedule.amount,
          category: schedule.category || 'Scheduled',
          notes: schedule.notes || 'Auto-generated from scheduled expense',
          date: now,
        });

      if (insertError) {
        console.error(`Failed to generate expense for schedule ${schedule.id}:`, insertError);
        continue;
      }

      // 2. Update next_due_date
      // For simplicity, we just add 1 month to the current due date using date-fns
      const nextDate = addMonths(new Date(Number(schedule.next_due_date)), 1).getTime();

      const { error: updateError } = await supabaseServer
        .from('scheduled_expenses')
        .update({ next_due_date: nextDate })
        .eq('id', schedule.id);

      if (updateError) {
        console.error(`Failed to update next_due_date for schedule ${schedule.id}:`, updateError);
      } else {
        processedCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Processed ${processedCount} scheduled expenses.` 
    });

  } catch (err: unknown) {
    console.error('CRON Error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Internal Server Error', details: msg }, { status: 500 });
  }
}
