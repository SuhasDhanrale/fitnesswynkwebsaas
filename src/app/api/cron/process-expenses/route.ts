import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { addMonths } from 'date-fns';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

type ScheduledExpenseRow = {
  id: string;
  title: string;
  amount: string | number;
  category: string | null;
  notes: string | null;
  next_due_date: string | number;
};

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (
      process.env.NODE_ENV !== 'development' &&
      (!cronSecret || authHeader !== `Bearer ${cronSecret}`)
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = Date.now();
    const dueExpenses = await sql`
      select id, title, amount, category, notes, next_due_date
      from public.scheduled_expenses
      where active = true and next_due_date <= ${now}
    ` as ScheduledExpenseRow[];

    if (dueExpenses.length === 0) {
      return NextResponse.json({ success: true, message: 'No expenses due' });
    }

    let processedCount = 0;

    for (const schedule of dueExpenses) {
      const nextDate = addMonths(new Date(Number(schedule.next_due_date)), 1).getTime();

      try {
        await sql.transaction([
          sql`
            insert into public.expenses (id, title, amount, category, notes, date)
            values (
              ${uuidv4()}::uuid,
              ${schedule.title},
              ${Number(schedule.amount)},
              ${schedule.category || 'Scheduled'},
              ${schedule.notes || 'Auto-generated from scheduled expense'},
              ${now}
            )
          `,
          sql`
            update public.scheduled_expenses
            set next_due_date = ${nextDate}
            where id = ${schedule.id}::uuid
          `,
        ]);
        processedCount++;
      } catch (error) {
        console.error(`Failed to process scheduled expense ${schedule.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${processedCount} scheduled expenses.`,
    });
  } catch (err: unknown) {
    console.error('CRON Error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Internal Server Error', details: msg }, { status: 500 });
  }
}
