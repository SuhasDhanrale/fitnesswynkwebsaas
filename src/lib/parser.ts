export interface ParsedData {
  name?: string;
  phone?: string;
  amount?: string;
  duration?: string;
  paymentMode?: 'Cash' | 'UPI';
}

export const parseSmartText = (input: string, isMemberType = true): ParsedData => {
  if (!input.trim()) return {};

  const data: ParsedData = {};
  const lower = input.toLowerCase();

  // 1. Extract Phone (10 digits starting with 6-9 usually in India, or any 10-digit number)
  const phoneMatch = input.match(/\b[6-9]\d{9}\b/);
  if (phoneMatch) {
    data.phone = phoneMatch[0];
  }

  // 2. Extract Amount (e.g., 500, Rs 500, 1500)
  const amounts = input.match(/\b\d{3,5}\b/g);
  if (amounts) {
    // Filter out duration/phone numbers, get the first likely amount
    const possibleAmounts = amounts
      .map(Number)
      .filter((n) => n >= 100 && n < 100000 && n.toString() !== data.phone);
    if (possibleAmounts.length > 0) {
      data.amount = possibleAmounts[0].toString();
    }
  }

  // 3. Extract Duration
  if (lower.includes('1 month') || lower.includes('one month') || lower.includes('1mo') || lower.includes('1 mo')) {
    data.duration = '1 Month';
  } else if (
    lower.includes('3 month') ||
    lower.includes('three month') ||
    lower.includes('quarterly') ||
    lower.includes('3mo') ||
    lower.includes('3 mo')
  ) {
    data.duration = '3 Months';
  } else if (
    lower.includes('6 month') ||
    lower.includes('six month') ||
    lower.includes('half') ||
    lower.includes('6mo') ||
    lower.includes('6 mo')
  ) {
    data.duration = '6 Months';
  } else if (
    lower.includes('12 month') ||
    lower.includes('year') ||
    lower.includes('annual') ||
    lower.includes('1 year') ||
    lower.includes('1yr') ||
    lower.includes('1 yr')
  ) {
    data.duration = '1 Year';
  }

  // 4. Extract Name (If adding a member or searching)
  if (isMemberType) {
    const words = input.split(/\s+/).map((w) => w.replace(/[^a-zA-Z]/g, ''));
    const ignoreList = [
      'add',
      'member',
      'paid',
      'rs',
      'rupees',
      'for',
      'months',
      'month',
      'name',
      'is',
      'cash',
      'upi',
      'via',
      'gpay',
      'phonepe',
      'paytm',
    ];
    const potentialNames = words.filter(
      (w) => w.length > 2 && !ignoreList.includes(w.toLowerCase())
    );
    if (potentialNames.length > 0) {
      // Join first two if they exist to form full name (e.g. Rahul Sharma)
      data.name = potentialNames.slice(0, 2).join(' ');
    }
  }

  // 5. Payment Mode
  if (lower.includes('upi') || lower.includes('phonepe') || lower.includes('gpay') || lower.includes('paytm')) {
    data.paymentMode = 'UPI';
  } else if (lower.includes('cash')) {
    data.paymentMode = 'Cash';
  }

  return data;
};
