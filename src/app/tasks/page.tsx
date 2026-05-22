'use client';

import React, { useState } from 'react';
import { format, isPast, isToday, addDays } from 'date-fns';
import { Plus, MoreVertical, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Task } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { queryClient } from '@/lib/queryClient';
import styles from './page.module.css';
import { TaskModal } from '@/components/modals/TaskModal';

const COLUMNS: { id: Task['status']; label: string }[] = [
  { id: 'TODO', label: 'To Do' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'DONE', label: 'Done' },
];

async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('timestamp', { ascending: false });
  if (error) throw error;
  return (data || []).map((t: Record<string, unknown>): Task => ({
    id: t.id as string,
    title: t.title as string,
    description: (t.description as string) || '',
    assignee: (t.assignee as string) || 'Admin',
    status: t.status as Task['status'],
    priority: t.priority as Task['priority'],
    dueDate: t.due_date ? Number(t.due_date) : null,
    timestamp: Number(t.timestamp),
  }));
}

function invalidateTasks() {
  queryClient.invalidateQueries({ queryKey: ['tasks'] });
}

export default function TasksPage() {
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);

  // Drag and Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(id);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      const el = document.getElementById(`task-${id}`);
      if (el) el.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(null);
    const el = document.getElementById(`task-${id}`);
    if (el) el.style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, status: Task['status']) => {
    e.preventDefault();
    if (!draggedTaskId) return;

    // Optimistic update
    queryClient.setQueryData(['tasks'], (old: Task[] | undefined) =>
      (old || []).map(t => t.id === draggedTaskId ? { ...t, status } : t)
    );
    setDraggedTaskId(null);

    // Persist to Supabase
    await supabase.from('tasks').update({ status }).eq('id', draggedTaskId);
    invalidateTasks();
  };

  const openNewTaskModal = () => {
    setEditingTask(undefined);
    setIsModalOpen(true);
  };

  const openEditTaskModal = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    if (editingTask) {
      // Update existing task
      await supabase.from('tasks').update({
        title: taskData.title,
        description: taskData.description,
        assignee: taskData.assignee,
        status: taskData.status,
        priority: taskData.priority,
        due_date: taskData.dueDate ?? null,
      }).eq('id', editingTask.id);
    } else {
      // Insert new task
      await supabase.from('tasks').insert({
        title: taskData.title || '',
        description: taskData.description || '',
        assignee: taskData.assignee || 'Admin',
        status: taskData.status || 'TODO',
        priority: taskData.priority || 'MEDIUM',
        due_date: taskData.dueDate ?? null,
        timestamp: Date.now(),
      });
    }
    invalidateTasks();
    setIsModalOpen(false);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const renderTaskCard = (task: Task) => {
    const isDueSoon = task.dueDate && !isPast(task.dueDate) && task.dueDate < addDays(Date.now(), 2).getTime();
    const isOverdue = task.dueDate && isPast(task.dueDate) && !isToday(task.dueDate) && task.status !== 'DONE';

    return (
      <div 
        id={`task-${task.id}`}
        key={task.id} 
        className={styles.taskCard}
        draggable
        onDragStart={(e) => handleDragStart(e, task.id)}
        onDragEnd={(e) => handleDragEnd(e, task.id)}
        onClick={() => openEditTaskModal(task)}
      >
        <div className={styles.taskHeader}>
          <span className={`${styles.priorityBadge} ${styles['priority' + task.priority]}`}>
            {task.priority}
          </span>
          <button className={styles.moreBtn} onClick={(e) => { e.stopPropagation(); openEditTaskModal(task); }}>
            <MoreVertical size={16} color="var(--color-text-disabled)" />
          </button>
        </div>
        
        <h4 className={styles.taskTitle}>{task.title}</h4>
        {task.description && <p className={styles.taskDesc}>{task.description}</p>}
        
        <div className={styles.taskFooter}>
          <div className={styles.assignee} title={task.assignee}>
            <div className={styles.assigneeAvatar}>{getInitials(task.assignee)}</div>
            <span>{task.assignee.split(' ')[0]}</span>
          </div>
          
          {task.dueDate && (
            <div className={`${styles.dueDate} ${isOverdue ? styles.overdue : isDueSoon ? styles.dueSoon : ''}`}>
              <Clock size={12} />
              <span>{format(task.dueDate, 'MMM dd')}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Tasks</h1>
          <p className={styles.subtitle}>Track daily operations and staff assignments</p>
        </div>
        <Button variant="primary" icon="Plus" onClick={openNewTaskModal}>
          New Task
        </Button>
      </div>

      <div className={styles.board}>
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          
          return (
            <div 
              key={col.id} 
              className={styles.column}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className={styles.columnHeader}>
                <div className={styles.columnTitle}>
                  {col.label} <span className={styles.taskCount}>{colTasks.length}</span>
                </div>
                <Button variant="ghost" onClick={() => { setEditingTask(undefined); setIsModalOpen(true); }} style={{ padding: '4px', minWidth: 'auto', height: 'auto' }}>
                  <Plus size={18} color="var(--color-text-secondary)" />
                </Button>
              </div>
              
              {isLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[1, 2].map(i => <Skeleton key={i} height="100px" borderRadius="12px" />)}
                </div>
              ) : colTasks.length === 0 ? (
                <div className={styles.emptyColumn}>No tasks</div>
              ) : (
                colTasks.map(renderTaskCard)
              )}
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <TaskModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSave={handleSaveTask}
          task={editingTask}
        />
      )}
    </div>
  );
}
