'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { Trash2, Wallet, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { LogPaymentModal } from '@/components/modals/LogPaymentModal';
import { PaymentDetailModal } from '@/components/modals/PaymentDetailModal';
import { AddExpenseModal } from '@/components/modals/AddExpenseModal';
import { usePayments, useExpenses, useFinanceStats } from '@/hooks/useFinanceData';
import { Payment } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/components/ui/Toast';
import styles from './page.module.css';

export default function Finances() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'payments' | 'expenses'>('payments');
  const [logPaymentOpen, setLogPaymentOpen] = useState(false);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paySearch, setPaySearch] = useState('');
  const [expenseSearch, setExpenseSearch] = useState('');
  const [deleteConfirmIds, setDeleteConfirmIds] = useState<Set<string>>(new Set());

  const { data: statsData, isLoading: statsLoading } = useFinanceStats();
  const { data: paymentsData, isLoading: paymentsLoading } = usePayments(0, 100, paySearch);
  const { data: expensesData, isLoading: expensesLoading } = useExpenses(0, 100, expenseSearch);

  const payments = paymentsData?.data ?? [];
  const expenses = expensesData?.data ?? [];

  const handleDeleteExpense = async (id: string) => {
    if (deleteConfirmIds.has(id)) {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) {
        showToast('Failed to delete expense', 'error');
      } else {
        showToast('Expense deleted', 'success');
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
        queryClient.invalidateQueries({ queryKey: ['finance_stats'] });
        queryClient.invalidateQueries({ queryKey: ['finance_summary'] });
      }
      setDeleteConfirmIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    } else {
      setDeleteConfirmIds(prev => new Set(prev).add(id));
      setTimeout(() => setDeleteConfirmIds(prev => { const s = new Set(prev); s.delete(id); return s; }), 3000);
    }
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['payments'] });
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
    queryClient.invalidateQueries({ queryKey: ['finance_stats'] });
    queryClient.invalidateQueries({ queryKey: ['finance_summary'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
  };

  return (
    <>
      <div className={styles.container}>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${activeTab === 'payments' ? styles.active : ''}`} onClick={() => setActiveTab('payments')}>Payments</button>
          <button className={`${styles.tab} ${activeTab === 'expenses' ? styles.active : ''}`} onClick={() => setActiveTab('expenses')}>Expenses</button>
        </div>

        {activeTab === 'payments' && (
          <div className={styles.tabContent}>
            {statsLoading ? (
              <div className={styles.statsRow}>
                {[1, 2, 3].map(i => <Skeleton key={i} height="80px" borderRadius="8px" />)}
              </div>
            ) : (
              <div className={styles.statsRow}>
                <div className={styles.statCard} style={{ background: 'var(--color-primary-light)' }}>
                  <div className={styles.statValue}>₹{(statsData?.this_month_income ?? 0).toLocaleString('en-IN')}</div>
                  <div className={styles.statLabel}>This Month</div>
                </div>
                <div className={styles.statCard} style={{ background: 'var(--color-surface-variant)' }}>
                  <div className={styles.statValue}>₹{(statsData?.last_month_income ?? 0).toLocaleString('en-IN')}</div>
                  <div className={styles.statLabel}>Last Month</div>
                </div>
                <div className={styles.statCard} style={{ background: 'var(--color-surface-variant)' }}>
                  <div className={styles.statValue}>₹{(statsData?.all_time_income ?? 0).toLocaleString('en-IN')}</div>
                  <div className={styles.statLabel}>Total All Time</div>
                </div>
              </div>
            )}

            <div className={styles.searchRow}>
              <input className={styles.searchInput} placeholder="Search by member..." value={paySearch} onChange={e => setPaySearch(e.target.value)} />
              {paySearch && (
                <span className={styles.totalChip}>
                  Showing: {payments.length} results
                </span>
              )}
            </div>

            {paymentsLoading ? (
              <div className={styles.list}>
                {[1, 2, 3].map(i => <Skeleton key={i} height="60px" style={{ marginBottom: '8px' }} borderRadius="8px" />)}
              </div>
            ) : payments.length === 0 ? (
              <EmptyState icon={Wallet} title="No payments found" description="Payments you log will appear here." />
            ) : (
              <div className={styles.list}>
                {payments.map(p => (
                  <div key={p.id} className={styles.listRow} onClick={() => setSelectedPayment(p)}>
                    <div>
                      <div className={styles.rowMain}>{p.memberName}</div>
                      <div className={styles.rowSub}>{format(p.timestamp, 'dd MMM, hh:mm a')} · {p.paymentMode}</div>
                    </div>
                    <div className={styles.rowAmount}>₹{p.amount.toLocaleString('en-IN')}</div>
                  </div>
                ))}
              </div>
            )}

            <Button variant="primary" icon="Plus" onClick={() => setLogPaymentOpen(true)}>Log Payment</Button>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className={styles.tabContent}>
            {statsLoading ? (
              <div className={styles.statsRow}>
                {[1, 2, 3].map(i => <Skeleton key={i} height="80px" borderRadius="8px" />)}
              </div>
            ) : (
              <div className={styles.statsRow}>
                <div className={styles.statCard} style={{ background: 'var(--color-surface-variant)' }}>
                  <div className={styles.statValue}>₹{(statsData?.all_time_expenses ?? 0).toLocaleString('en-IN')}</div>
                  <div className={styles.statLabel}>Total (All)</div>
                </div>
                <div className={styles.statCard} style={{ background: 'var(--color-active-bg)' }}>
                  <div className={styles.statValue}>₹{(statsData?.this_month_expenses ?? 0).toLocaleString('en-IN')}</div>
                  <div className={styles.statLabel}>This Month</div>
                </div>
                <div className={styles.statCard} style={{ background: 'var(--color-warning-bg)' }}>
                  <div className={styles.statValue}>₹{(statsData?.last_month_expenses ?? 0).toLocaleString('en-IN')}</div>
                  <div className={styles.statLabel}>Last Month</div>
                </div>
              </div>
            )}

            <input className={styles.searchInput} placeholder="Search expenses..." value={expenseSearch} onChange={e => setExpenseSearch(e.target.value)} />

            {expensesLoading ? (
              <div className={styles.list}>
                {[1, 2, 3].map(i => <Skeleton key={i} height="60px" style={{ marginBottom: '8px' }} borderRadius="8px" />)}
              </div>
            ) : expenses.length === 0 ? (
              <EmptyState icon={Receipt} title="No expenses found" description="Expenses you log will appear here." />
            ) : (
              <div className={styles.list}>
                {expenses.map(e => (
                  <div key={e.id} className={styles.expenseCard}>
                    <div style={{ flex: 1 }}>
                      <div className={styles.rowMain}>{e.title}</div>
                      <div className={styles.rowSub}>{format(e.date, 'dd MMM yyyy')}{e.notes && ` · ${e.notes}`}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className={styles.expenseAmount}>₹{e.amount.toLocaleString('en-IN')}</span>
                      <button
                        onClick={() => handleDeleteExpense(e.id)}
                        className={`${styles.deleteBtn} ${deleteConfirmIds.has(e.id) ? styles.confirmDelete : ''}`}
                        title={deleteConfirmIds.has(e.id) ? 'Tap again to confirm' : 'Delete'}
                      >
                        {deleteConfirmIds.has(e.id) ? 'Sure?' : <Trash2 size={16} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button variant="primary" icon="Plus" onClick={() => setAddExpenseOpen(true)}>Add Expense</Button>
          </div>
        )}
      </div>

      <LogPaymentModal isOpen={logPaymentOpen} onClose={() => { setLogPaymentOpen(false); invalidateAll(); }} />
      <AddExpenseModal isOpen={addExpenseOpen} onClose={() => { setAddExpenseOpen(false); invalidateAll(); }} />
      <PaymentDetailModal isOpen={!!selectedPayment} onClose={() => setSelectedPayment(null)} payment={selectedPayment} />
    </>
  );
}
