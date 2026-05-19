'use client';

import React, { useState } from 'react';
import { format, isSameMonth, subMonths } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { FilterChip } from '@/components/ui/FilterChip';
import { LogPaymentModal } from '@/components/modals/LogPaymentModal';
import { PaymentDetailModal } from '@/components/modals/PaymentDetailModal';
import { AddExpenseModal } from '@/components/modals/AddExpenseModal';
import { Payment } from '@/types';
import styles from './page.module.css';

export default function Finances() {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState<'payments' | 'expenses'>('payments');
  const [logPaymentOpen, setLogPaymentOpen] = useState(false);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paySearch, setPaySearch] = useState('');
  const [expenseSearch, setExpenseSearch] = useState('');
  const [deleteConfirmIds, setDeleteConfirmIds] = useState<Set<string>>(new Set());

  const now = new Date();
  const lastMonth = subMonths(now, 1);

  // Payment stats
  const thisMonthPayments = state.payments.filter(p => isSameMonth(p.timestamp, now));
  const lastMonthPayments = state.payments.filter(p => isSameMonth(p.timestamp, lastMonth));
  const thisMonthTotal = thisMonthPayments.reduce((s, p) => s + p.amount, 0);
  const lastMonthTotal = lastMonthPayments.reduce((s, p) => s + p.amount, 0);
  const allTimeTotal = state.payments.reduce((s, p) => s + p.amount, 0);

  const filteredPayments = [...state.payments]
    .filter(p => p.memberName.toLowerCase().includes(paySearch.toLowerCase()))
    .sort((a, b) => b.timestamp - a.timestamp);

  // Expense stats
  const thisMonthExpenses = state.expenses.filter(e => isSameMonth(e.date, now));
  const lastMonthExpenses = state.expenses.filter(e => isSameMonth(e.date, lastMonth));
  const thisMonthExpTotal = thisMonthExpenses.reduce((s, e) => s + e.amount, 0);
  const lastMonthExpTotal = lastMonthExpenses.reduce((s, e) => s + e.amount, 0);
  const allTimeExpTotal = state.expenses.reduce((s, e) => s + e.amount, 0);

  const filteredExpenses = [...state.expenses]
    .filter(e => e.title.toLowerCase().includes(expenseSearch.toLowerCase()) || e.notes.toLowerCase().includes(expenseSearch.toLowerCase()))
    .sort((a, b) => b.date - a.date);

  const handleDeleteExpense = (id: string) => {
    if (deleteConfirmIds.has(id)) {
      dispatch({ type: 'DELETE_EXPENSE', payload: id });
      setDeleteConfirmIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    } else {
      setDeleteConfirmIds(prev => new Set(prev).add(id));
      setTimeout(() => setDeleteConfirmIds(prev => { const s = new Set(prev); s.delete(id); return s; }), 3000);
    }
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
            <div className={styles.statsRow}>
              <div className={styles.statCard} style={{ background: 'var(--color-primary-light)' }}>
                <div className={styles.statValue}>₹{thisMonthTotal.toLocaleString('en-IN')}</div>
                <div className={styles.statLabel}>This Month</div>
              </div>
              <div className={styles.statCard} style={{ background: 'var(--color-surface-variant)' }}>
                <div className={styles.statValue}>₹{lastMonthTotal.toLocaleString('en-IN')}</div>
                <div className={styles.statLabel}>Last Month</div>
              </div>
              <div className={styles.statCard} style={{ background: 'var(--color-surface-variant)' }}>
                <div className={styles.statValue}>₹{allTimeTotal.toLocaleString('en-IN')}</div>
                <div className={styles.statLabel}>Total All Time</div>
              </div>
            </div>

            <div className={styles.searchRow}>
              <input className={styles.searchInput} placeholder="Search by member..." value={paySearch} onChange={e => setPaySearch(e.target.value)} />
              {paySearch && (
                <span className={styles.totalChip}>
                  Total: ₹{filteredPayments.reduce((s, p) => s + p.amount, 0).toLocaleString('en-IN')}
                </span>
              )}
            </div>

            <div className={styles.list}>
              {filteredPayments.map(p => (
                <div key={p.id} className={styles.listRow} onClick={() => setSelectedPayment(p)}>
                  <div>
                    <div className={styles.rowMain}>{p.memberName}</div>
                    <div className={styles.rowSub}>{format(p.timestamp, 'dd MMM, hh:mm a')} · {p.paymentMode}</div>
                  </div>
                  <div className={styles.rowAmount}>₹{p.amount.toLocaleString('en-IN')}</div>
                </div>
              ))}
            </div>

            <Button variant="primary" icon="Plus" onClick={() => setLogPaymentOpen(true)}>Log Payment</Button>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className={styles.tabContent}>
            <div className={styles.statsRow}>
              <div className={styles.statCard} style={{ background: 'var(--color-surface-variant)' }}>
                <div className={styles.statValue}>₹{allTimeExpTotal.toLocaleString('en-IN')}</div>
                <div className={styles.statLabel}>Total (All)</div>
              </div>
              <div className={styles.statCard} style={{ background: 'var(--color-active-bg)' }}>
                <div className={styles.statValue}>₹{thisMonthExpTotal.toLocaleString('en-IN')}</div>
                <div className={styles.statLabel}>This Month</div>
              </div>
              <div className={styles.statCard} style={{ background: 'var(--color-warning-bg)' }}>
                <div className={styles.statValue}>₹{lastMonthExpTotal.toLocaleString('en-IN')}</div>
                <div className={styles.statLabel}>Last Month</div>
              </div>
            </div>

            <input className={styles.searchInput} placeholder="Search expenses..." value={expenseSearch} onChange={e => setExpenseSearch(e.target.value)} />

            <div className={styles.list}>
              {filteredExpenses.map(e => (
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

            <Button variant="primary" icon="Plus" onClick={() => setAddExpenseOpen(true)}>Add Expense</Button>
          </div>
        )}
      </div>

      <LogPaymentModal isOpen={logPaymentOpen} onClose={() => setLogPaymentOpen(false)} />
      <AddExpenseModal isOpen={addExpenseOpen} onClose={() => setAddExpenseOpen(false)} />
      <PaymentDetailModal isOpen={!!selectedPayment} onClose={() => setSelectedPayment(null)} payment={selectedPayment} />
    </>
  );
}
