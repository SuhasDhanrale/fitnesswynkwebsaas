import { v4 as uuidv4 } from 'uuid';
import { Member, Payment, Attendance, Expense, Enquiry, Announcement, GymSettings } from '../types';

const now = Date.now();
const d = (days: number) => days * 86400000;

// Fixed IDs for cross-referencing
const ids = {
  m1: uuidv4(), m2: uuidv4(), m3: uuidv4(), m4: uuidv4(), m5: uuidv4(),
  m6: uuidv4(), m7: uuidv4(), m8: uuidv4(), m9: uuidv4(), m10: uuidv4(),
};

export const mockSettings: GymSettings = {
  gymName: 'FitnessWynk Gym',
  upiId: 'fitnesswynk@upi',
  qrCodeUrl: '',
  availablePlans: ['Monthly Cardio', 'Weight Training', 'CrossFit', 'Yearly Pro'],
  batches: ['6-7 AM', '7-8 AM', '8-9 AM', '5-6 PM', '6-7 PM', '7-8 PM'],
  durations: ['1 Month', '3 Months', '6 Months', '1 Year', '45 Days'],
};

export const mockMembers: Member[] = [
  // ACTIVE — healthy
  { id: ids.m1, name: 'Rahul Sharma', phoneNumber: '9876543210', planName: 'Monthly Cardio', batch: '6-7 AM', startDate: now - d(15), expiryDate: now + d(15), durationLabel: '1 Month', notes: 'Prefers morning sessions', dueAmount: 0 },
  { id: ids.m2, name: 'Sneha Gupta', phoneNumber: '6543210987', planName: 'Yearly Pro', batch: '6-7 PM', startDate: now - d(2), expiryDate: now + d(363), durationLabel: '1 Year', notes: 'New joiner, referred by Rahul', dueAmount: 0 },
  { id: ids.m3, name: 'Amit Kumar', phoneNumber: '7654321098', planName: 'CrossFit', batch: '7-8 AM', startDate: now - d(80), expiryDate: now + d(10), durationLabel: '3 Months', notes: '', dueAmount: 0 },
  { id: ids.m4, name: 'Divya Nair', phoneNumber: '8123456789', planName: 'Weight Training', batch: '8-9 AM', startDate: now - d(10), expiryDate: now + d(20), durationLabel: '1 Month', notes: 'Physiotherapy background', dueAmount: 0 },
  { id: ids.m5, name: 'Karan Mehta', phoneNumber: '9988776655', planName: 'Monthly Cardio', batch: '5-6 PM', startDate: now - d(5), expiryDate: now + d(25), durationLabel: '1 Month', notes: '', dueAmount: 0 },

  // EXPIRING SOON (< 7 days)
  { id: ids.m6, name: 'Vikram Singh', phoneNumber: '5432109876', planName: 'Monthly Cardio', batch: '7-8 PM', startDate: now - d(28), expiryDate: now + d(2), durationLabel: '1 Month', notes: 'Expiring in 2 days', dueAmount: 0 },
  { id: ids.m7, name: 'Pooja Rao', phoneNumber: '7788990011', planName: 'Weight Training', batch: '6-7 AM', startDate: now - d(84), expiryDate: now + d(6), durationLabel: '3 Months', notes: '', dueAmount: 200 },

  // EXPIRED
  { id: ids.m8, name: 'Priya Patel', phoneNumber: '8765432109', planName: 'Weight Training', batch: '5-6 PM', startDate: now - d(40), expiryDate: now - d(10), durationLabel: '1 Month', notes: 'Wants to renew next week', dueAmount: 500 },
  { id: ids.m9, name: 'Rohit Verma', phoneNumber: '9012345678', planName: 'CrossFit', batch: '6-7 PM', startDate: now - d(50), expiryDate: now - d(5), durationLabel: '45 Days', notes: 'Previously a 6-month member', dueAmount: 0 },
  { id: ids.m10, name: 'Anjali Desai', phoneNumber: '9123456780', planName: 'Monthly Cardio', batch: '8-9 AM', startDate: now - d(35), expiryDate: now - d(5), durationLabel: '1 Month', notes: '', dueAmount: 1000 },
];

// Payments spread across current and previous month
const thisMonth = new Date();
const lastMonth = new Date(); lastMonth.setMonth(lastMonth.getMonth() - 1);

const pay = (memberId: string, memberName: string, amount: number, mode: 'Cash' | 'UPI', planName: string, batch: string, daysAgo: number, lastMo = false): Payment => {
  const base = lastMo ? lastMonth.getTime() : thisMonth.getTime();
  const ts = base - d(daysAgo);
  return {
    id: uuidv4(), memberId, memberName, amount, paymentMode: mode, planName, batch,
    startDate: ts, endDate: ts + d(30), notes: '', timestamp: ts,
  };
};

export const mockPayments: Payment[] = [
  // This month
  pay(ids.m1, 'Rahul Sharma', 1500, 'UPI', 'Monthly Cardio', '6-7 AM', 15),
  pay(ids.m2, 'Sneha Gupta', 12000, 'Cash', 'Yearly Pro', '6-7 PM', 2),
  pay(ids.m4, 'Divya Nair', 2000, 'UPI', 'Weight Training', '8-9 AM', 10),
  pay(ids.m5, 'Karan Mehta', 1500, 'Cash', 'Monthly Cardio', '5-6 PM', 5),
  pay(ids.m7, 'Pooja Rao', 5500, 'UPI', 'Weight Training', '6-7 AM', 84),
  // Last month
  pay(ids.m3, 'Amit Kumar', 4500, 'Cash', 'CrossFit', '7-8 AM', 5, true),
  pay(ids.m8, 'Priya Patel', 2000, 'UPI', 'Weight Training', '5-6 PM', 10, true),
  pay(ids.m9, 'Rohit Verma', 3000, 'Cash', 'CrossFit', '6-7 PM', 15, true),
  pay(ids.m6, 'Vikram Singh', 1500, 'UPI', 'Monthly Cardio', '7-8 PM', 3, true),
  pay(ids.m10, 'Anjali Desai', 1500, 'Cash', 'Monthly Cardio', '8-9 AM', 8, true),
];

export const mockAttendance: Attendance[] = [
  { id: uuidv4(), memberId: ids.m1, memberName: 'Rahul Sharma', date: new Date().setHours(0, 0, 0, 0), isPresent: true },
  { id: uuidv4(), memberId: ids.m2, memberName: 'Sneha Gupta', date: new Date().setHours(0, 0, 0, 0), isPresent: true },
  { id: uuidv4(), memberId: ids.m4, memberName: 'Divya Nair', date: new Date().setHours(0, 0, 0, 0), isPresent: true },
];

export const mockExpenses: Expense[] = [
  { id: uuidv4(), title: 'Electricity Bill', amount: 2500, date: now - d(5), notes: 'May bill', category: 'Utilities' },
  { id: uuidv4(), title: 'Equipment Maintenance', amount: 5000, date: now - d(12), notes: 'Treadmill belt replacement', category: 'Maintenance' },
  { id: uuidv4(), title: 'Rent', amount: 18000, date: now - d(1), notes: 'Monthly gym rent', category: 'Rent' },
  { id: uuidv4(), title: 'Cleaning Supplies', amount: 800, date: now - d(8), notes: 'Disinfectant and mops', category: 'Supplies' },
  { id: uuidv4(), title: 'Internet & WiFi', amount: 1200, date: now - d(3), notes: 'Broadband plan renewal', category: 'Utilities' },
];

export const mockEnquiries: Enquiry[] = [
  { id: uuidv4(), name: 'Ankit Sharma', phoneNumber: '9001122334', planOfInterest: 'CrossFit', notes: 'Will join next month, student', isConverted: false, timestamp: now - d(2) },
  { id: uuidv4(), name: 'Meena Joshi', phoneNumber: '8800990011', planOfInterest: 'Weight Training', notes: 'Wants evening batch only', isConverted: false, timestamp: now - d(5) },
  { id: uuidv4(), name: 'Sneha Gupta', phoneNumber: '6543210987', planOfInterest: 'Yearly Pro', notes: 'Converted to Yearly Pro membership', isConverted: true, timestamp: now - d(4) },
];

export const mockAnnouncements: Announcement[] = [
  { id: uuidv4(), title: 'Gym Closed Tomorrow', message: 'Dear Members, the gym will remain closed tomorrow due to scheduled maintenance. Sorry for the inconvenience.', targetGroup: 'All' },
];
