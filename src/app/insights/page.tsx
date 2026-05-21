'use client';

import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';
import { format } from 'date-fns';
import { useFinanceSummary } from '@/hooks/useFinanceData';
import { useAttendanceTrend } from '@/hooks/useAttendance';
import { Skeleton } from '@/components/ui/Skeleton';
import styles from './page.module.css';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

// Retention hook inline (uses get_member_retention RPC)
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

function useMemberRetention() {
  return useQuery({
    queryKey: ['member_retention'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_member_retention');
      if (error) throw error;
      return data as { active: number; expired: number };
    },
  });
}

function usePlanDistribution() {
  return useQuery({
    queryKey: ['plan_distribution'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('plan_name')
        .gt('expiry_date', Date.now());
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((m: Record<string, unknown>) => {
        const plan = String(m.plan_name ?? '');
        if (plan) counts[plan] = (counts[plan] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    },
  });
}

export default function InsightsDashboard() {
  const [timeframe, setTimeframe] = useState<number>(90);

  const { data: financeSummary, isLoading: financeLoading } = useFinanceSummary(timeframe);
  const { data: retention, isLoading: retentionLoading } = useMemberRetention();
  const { data: attendanceTrend, isLoading: attendanceLoading } = useAttendanceTrend(timeframe);
  const { data: plansData, isLoading: plansLoading } = usePlanDistribution();

  const financesData = useMemo(() => {
    return (financeSummary || []).map(m => ({
      name: m.month_label,
      Income: m.income,
      Expenses: m.expenses,
    }));
  }, [financeSummary]);

  const memberStatusData = useMemo(() => [
    { name: 'Active', value: retention?.active ?? 0 },
    { name: 'Expired', value: retention?.expired ?? 0 },
  ], [retention]);

  const attendanceData = useMemo(() => {
    return (attendanceTrend || []).map(a => ({
      name: format(a.date, 'MMM dd'),
      Attendees: a.count,
    }));
  }, [attendanceTrend]);

  const isLoading = financeLoading || retentionLoading || attendanceLoading || plansLoading;

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Skeleton width="200px" height="40px" borderRadius="8px" />
          <div className={styles.dateFilter}>
            {[1, 2, 3].map(i => <Skeleton key={i} width="80px" height="32px" borderRadius="8px" />)}
          </div>
        </div>
        <div className={styles.grid}>
          <Skeleton height="400px" borderRadius="12px" />
          <Skeleton height="400px" borderRadius="12px" />
        </div>
        <div className={styles.gridHalf}>
          <Skeleton height="350px" borderRadius="12px" />
          <Skeleton height="350px" borderRadius="12px" />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Insights & Analytics</h1>
        <div className={styles.dateFilter}>
          <button className={`${styles.filterBtn} ${timeframe === 30 ? styles.active : ''}`} onClick={() => setTimeframe(30)}>30 Days</button>
          <button className={`${styles.filterBtn} ${timeframe === 90 ? styles.active : ''}`} onClick={() => setTimeframe(90)}>Last Quarter</button>
          <button className={`${styles.filterBtn} ${timeframe === 365 ? styles.active : ''}`} onClick={() => setTimeframe(365)}>1 Year</button>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Financial Overview */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Financial Overview</h2>
              <p className={styles.cardSub}>Income vs Expenses over time</p>
            </div>
          </div>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => [`₹${Number(value ?? 0).toLocaleString('en-IN')}`]}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Area type="monotone" dataKey="Income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="Expenses" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpenses)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Member Retention */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Member Retention</h2>
              <p className={styles.cardSub}>Active vs Expired members</p>
            </div>
          </div>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={memberStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  <Cell key="cell-0" fill="#2563eb" />
                  <Cell key="cell-1" fill="#ef4444" />
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className={styles.gridHalf}>
        {/* Daily Attendance */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Daily Attendance</h2>
              <p className={styles.cardSub}>Members present per day</p>
            </div>
          </div>
          <div className={styles.chartContainer}>
            {attendanceLoading ? (
              <Skeleton height="100%" borderRadius="8px" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="Attendees" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Popular Plans */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Popular Plans</h2>
              <p className={styles.cardSub}>Distribution among active members</p>
            </div>
          </div>
          <div className={styles.chartContainer}>
            {plansLoading ? (
              <Skeleton height="100%" borderRadius="8px" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={plansData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {(plansData || []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
