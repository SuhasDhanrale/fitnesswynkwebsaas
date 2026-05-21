'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Task } from '@/types';
import { format } from 'date-fns';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  task?: Task;
}

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];
const STATUSES = [
  { value: 'TODO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'DONE', label: 'Done' }
];

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSave, task }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [status, setStatus] = useState('TODO');
  const [dueDate, setDueDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (task) {
        setTitle(task.title);
        setDescription(task.description);
        setAssignee(task.assignee);
        setPriority(task.priority);
        setStatus(task.status);
        setDueDate(task.dueDate ? format(task.dueDate, 'yyyy-MM-dd') : '');
      } else {
        // Reset form for new task
        setTitle('');
        setDescription('');
        setAssignee('Admin');
        setPriority('MEDIUM');
        setStatus('TODO');
        setDueDate('');
      }
      setErrors({});
    }
  }, [isOpen, task]);

  const handleSave = () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Title is required';
    if (!assignee.trim()) errs.assignee = 'Assignee is required';
    setErrors(errs);

    if (Object.keys(errs).length > 0) return;

    onSave({
      title: title.trim(),
      description: description.trim(),
      assignee: assignee.trim(),
      priority: priority as Task['priority'],
      status: status as Task['status'],
      dueDate: dueDate ? new Date(dueDate).getTime() : null,
    });
  };

  const isDirty = title.trim().length > 0 && (!task || title !== task.title);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task ? 'Edit Task' : 'New Task'}
      isDirty={isDirty}
      dirtyMessage="You have unsaved changes. Discard and close?"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', width: '100%' }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>Save Task</Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Input 
          label="Task Title" 
          value={title} 
          onChange={e => setTitle(e.target.value)} 
          error={errors.title}
          placeholder="e.g., Call 5 new leads"
          autoFocus
        />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Add details about this task..."
            style={{ 
              width: '100%', 
              padding: '12px', 
              border: '1.5px solid var(--color-border)', 
              borderRadius: 'var(--radius-md)', 
              fontFamily: 'var(--font-body)', 
              fontSize: '14px', 
              resize: 'vertical',
              outline: 'none',
              transition: 'border-color var(--transition-fast)'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Input 
            label="Assignee" 
            value={assignee} 
            onChange={e => setAssignee(e.target.value)} 
            error={errors.assignee}
            placeholder="e.g., Admin, Trainer A"
          />
          <Input 
            label="Due Date (Optional)" 
            type="date" 
            value={dueDate} 
            onChange={e => setDueDate(e.target.value)} 
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Select 
            label="Priority" 
            options={PRIORITIES} 
            value={priority} 
            onChange={e => setPriority(e.target.value)} 
          />
          <Select 
            label="Status" 
            options={STATUSES} 
            value={status} 
            onChange={e => setStatus(e.target.value)} 
          />
        </div>
      </div>
    </Modal>
  );
};
