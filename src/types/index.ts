// Member (from Member.kt)
export interface Member {
  id: string;            // UUID
  name: string;
  phoneNumber: string;   // Raw 10-digit, e.g. "9876543210"
  planName: string;      // "Monthly Cardio"
  batch: string;         // "6-7 AM"
  startDate: number;     // epoch ms
  expiryDate: number;    // epoch ms — CRITICAL for color coding
  durationLabel: string; // "1 Month", "3 Months"
  notes: string;
  dueAmount: number;     // 0 = fully paid
}

// Payment (from Payment.kt)
export interface Payment {
  id: string;
  memberId: string;
  memberName: string;    // Denormalized
  amount: number;        // INR integer
  paymentMode: 'Cash' | 'UPI';
  planName: string;
  batch: string;
  startDate: number;
  endDate: number;
  notes: string;
  timestamp: number;     // epoch ms
}

// Attendance (from Attendance.kt)
export interface Attendance {
  id: string;
  memberId: string;
  memberName: string;
  date: number;          // Midnight epoch ms (day-normalized)
  isPresent: boolean;
}

// Expense (from Expense data class)
export interface Expense {
  id: string;
  title: string;         // "Rent", "Equipment"
  amount: number;
  date: number;          // epoch ms
  notes: string;
  category: string;      // "General" default
}

// Enquiry (from Enquiry data class)
export interface Enquiry {
  id: string;
  name: string;
  phoneNumber: string;
  planOfInterest: string;
  notes: string;
  isConverted: boolean;
  timestamp: number;
  location?: string;
  source?: string;
}

// Announcement
export interface Announcement {
  id: string;
  title: string;
  message: string;
  targetGroup: 'All' | 'Active' | 'Expired';
}

// GymSettings (from GymSettings data class)
export interface GymSettings {
  gymName: string;           // "FitnessWynk Gym"
  upiId: string;
  qrCodeUrl: string;
  availablePlans: string[];  // ["Monthly Cardio", "Yearly", ...]
  batches: string[];         // ["6-7 AM", "7-8 AM", ...]
  durations: string[];       // ["1 Month", "3 Months", "1 Year"]
  enableSmartEntry: boolean;
}

// Task (for Jira-style tracking)
export interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string;          // Name of the staff/trainer
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate: number | null;    // epoch ms or null
  timestamp: number;         // Created at epoch ms
}
