import { Dispatch } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AppAction, AppState } from '../context/AppContext';
import { Member, Payment } from '../types';

export const addMember = (
  dispatch: Dispatch<AppAction>,
  data: Omit<Member, 'id'> & { initialPayment: number }
) => {
  const { initialPayment, ...memberData } = data;
  const member: Member = { id: uuidv4(), ...memberData };

  dispatch({ type: 'ADD_MEMBER', payload: member });

  if (initialPayment > 0) {
    const payment: Payment = {
      id: uuidv4(),
      memberId: member.id,
      memberName: member.name,
      amount: initialPayment,
      paymentMode: 'Cash',
      planName: member.planName,
      batch: member.batch,
      startDate: member.startDate,
      endDate: member.expiryDate,
      notes: 'Initial payment',
      timestamp: Date.now(),
    };
    dispatch({ type: 'ADD_PAYMENT', payload: payment });
  }
};

export const processPaymentAndRenewal = (
  dispatch: Dispatch<AppAction>,
  state: AppState,
  data: Omit<Payment, 'id' | 'memberName' | 'timestamp'>
) => {
  const member = state.members.find((m) => m.id === data.memberId);
  const memberName = member ? member.name : 'Manual Entry';

  const payment: Payment = {
    ...data,
    id: uuidv4(),
    memberName,
    timestamp: Date.now(),
  };

  dispatch({ type: 'ADD_PAYMENT', payload: payment });

  if (member) {
    dispatch({
      type: 'UPDATE_MEMBER',
      payload: {
        ...member,
        planName: data.planName || member.planName,
        batch: data.batch || member.batch,
        startDate: data.startDate,
        expiryDate: data.endDate,
        dueAmount: 0, // Clear dues on any renewal/payment
      },
    });
  }
};
