import { isSameMonth, addDays, addWeeks, addMonths, addYears, startOfDay } from 'date-fns';
import { Member } from '../types';

export const isExpired = (member: Member) => Date.now() > member.expiryDate;

export const daysRemaining = (member: Member) => Math.floor((member.expiryDate - Date.now()) / 86400000);

export const isExpiringSoon = (member: Member) => {
  const now = Date.now();
  return member.expiryDate > now && member.expiryDate < now + 7 * 86400000;
};

export const calcEndDate = (startMs: number, duration?: string): number => {
  if (!duration) return addMonths(new Date(startMs), 1).getTime();
  const parts = duration.trim().split(' ');
  if (parts.length < 2) return addMonths(new Date(startMs), 1).getTime();
  
  const amt = parseInt(parts[0]);
  const unit = parts[1].toLowerCase();
  const d = new Date(startMs);
  
  if (unit.startsWith('day')) return addDays(d, amt).getTime();
  if (unit.startsWith('week')) return addWeeks(d, amt).getTime();
  if (unit.startsWith('year')) return addYears(d, amt).getTime();
  
  return addMonths(d, amt).getTime(); // default months
};

export const getTodayMidnight = () => startOfDay(new Date()).getTime();

export { isSameMonth };
