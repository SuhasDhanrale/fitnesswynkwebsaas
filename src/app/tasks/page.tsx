'use client';

import React, { useState } from 'react';
import { format, isPast, isToday, addDays } from 'date-fns';
import { Plus, Calendar, MoreVertical, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { mockTasks } from '@/data/mockData';
import { Task } from '@/types';
import styles from './page.module.css';
import { TaskModal } from '@/components/modals/TaskModal';

const COLUMNS: { id: Task['status']; label: string }[] = [
  { id: 'TODO', label: 'To Do' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'DONE', label: 'Done' },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  
  // Drag and Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Small delay to allow the drag image to generate before adding styles
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

  const handleDrop = (e: React.DragEvent, status: Task['status']) => {
    e.preventDefault();
    if (!draggedTaskId) return;

    setTasks(prev => prev.map(task => 
      task.id === draggedTaskId ? { ...task, status } : task
    ));
    setDraggedTaskId(null);
  };

  const openNewTaskModal = () => {
    setEditingTask(undefined);
    setIsModalOpen(true);
  };

  const openEditTaskModal = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleSaveTask = (taskData: Partial<Task>) => {
    if (editingTask) {
      setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...taskData } as Task : t));
    } else {
      const newTask: Task = {
        id: crypto.randomUUID(),
        title: taskData.title || '',
        description: taskData.description || '',
        assignee: taskData.assignee || 'Unassigned',
        status: taskData.status || 'TODO',
        priority: taskData.priority || 'MEDIUM',
        dueDate: taskData.dueDate || null,
        timestamp: Date.now(),
      };
      setTasks(prev => [...prev, newTask]);
    }
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
              
              {colTasks.length === 0 ? (
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
