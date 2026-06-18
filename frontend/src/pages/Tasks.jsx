import { useState, useEffect, useRef, useCallback } from 'react';
import { tasksAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { HiPlus, HiPencil, HiTrash, HiChevronLeft, HiChevronRight } from 'react-icons/hi';

// Helper: generate array of dates between start and end
const getDateRange = (startDate, numDays = 5) => {
  const dates = [];
  const start = new Date(startDate);
  for (let i = 0; i < numDays; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
};

// Helper: format date for column header
const formatDateHeader = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.toLocaleDateString('en-US', { weekday: 'short' });
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return { day, date };
};

// Helper: check if a date string is today
const isToday = (dateStr) => {
  return dateStr === new Date().toISOString().split('T')[0];
};

const Tasks = () => {
  const { isAdmin } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', category: 'other' });
  const [numDays, setNumDays] = useState(5);
  const scrollRef = useRef(null);

  const cats = ['bayan', 'dawah', 'meal_prep', 'cleaning', 'security', 'finance', 'travel', 'other'];

  // Calculate the start date: today - 1 day (so today is the second column)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  });

  const dates = getDateRange(startDate, numDays);

  const fetchMatrix = useCallback(async () => {
    try {
      setLoading(true);
      const endDate = dates[dates.length - 1];
      const res = await tasksAPI.getMatrix({ start_date: dates[0], end_date: endDate });
      setTasks(res.data.tasks || []);
      setMembers(res.data.members || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [startDate, numDays]);

  useEffect(() => {
    fetchMatrix();
  }, [fetchMatrix]);

  // Responsive: adjust numDays based on screen width
  useEffect(() => {
    const updateDays = () => {
      const w = window.innerWidth;
      if (w < 640) setNumDays(3);
      else if (w < 1024) setNumDays(4);
      else setNumDays(5);
    };
    updateDays();
    window.addEventListener('resize', updateDays);
    return () => window.removeEventListener('resize', updateDays);
  }, []);

  // Navigate dates
  const shiftDates = (direction) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + direction * numDays);
    setStartDate(d.toISOString().split('T')[0]);
  };

  const goToToday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setStartDate(d.toISOString().split('T')[0]);
  };

  // Handle assignment change
  const handleAssign = async (taskId, date, memberId) => {
    try {
      await tasksAPI.assign({
        task_id: taskId,
        assignment_date: date,
        assigned_to: memberId || null
      });

      // Optimistic update
      setTasks(prev => prev.map(t => {
        if (t.id !== taskId) return t;
        const newAssignments = { ...t.assignments };
        const member = members.find(m => m.id === parseInt(memberId));
        newAssignments[date] = {
          assigned_to: memberId ? parseInt(memberId) : null,
          assigned_to_name: member?.name || null,
          status: 'pending'
        };
        return { ...t, assignments: newAssignments };
      }));
    } catch (err) {
      toast.error('Failed to assign');
      fetchMatrix();
    }
  };

  // Save task (create/update)
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await tasksAPI.update(editing.id, form);
        toast.success('Task updated');
      } else {
        await tasksAPI.create({ ...form, task_date: new Date().toISOString().split('T')[0] });
        toast.success('Task created');
      }
      setModalOpen(false);
      setEditing(null);
      fetchMatrix();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  // Delete task
  const handleDelete = async (id) => {
    if (!confirm('Delete this task?')) return;
    try {
      await tasksAPI.delete(id);
      toast.success('Task deleted');
      fetchMatrix();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="text-surface-400 mt-1 text-sm">
            Assign members to tasks across dates
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Date Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => shiftDates(-1)}
              className="p-2.5 rounded-xl bg-surface-800/60 border border-surface-700/50 text-surface-400 hover:text-surface-200 hover:bg-surface-700 transition-all"
              title="Previous days"
            >
              <HiChevronLeft size={18} />
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 rounded-xl bg-surface-800/60 border border-surface-700/50 text-surface-300 hover:text-surface-100 hover:bg-surface-700 transition-all text-sm font-medium"
            >
              Today
            </button>
            <button
              onClick={() => shiftDates(1)}
              className="p-2.5 rounded-xl bg-surface-800/60 border border-surface-700/50 text-surface-400 hover:text-surface-200 hover:bg-surface-700 transition-all"
              title="Next days"
            >
              <HiChevronRight size={18} />
            </button>
          </div>

          {/* Add Task Button */}
          {isAdmin && (
            <button
              onClick={() => {
                setEditing(null);
                setForm({ title: '', description: '', category: 'other' });
                setModalOpen(true);
              }}
              className="btn-primary flex items-center gap-2 whitespace-nowrap"
              id="add-task-btn"
            >
              <HiPlus size={18} />
              <span className="hidden sm:inline">Add Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Task Matrix Grid */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto" ref={scrollRef}>
          <table className="w-full min-w-[600px] border-collapse">
            {/* Column Headers */}
            <thead>
              <tr>
                {/* Tasks column header */}
                <th className="task-matrix-header-cell sticky left-0 z-20 bg-surface-800/95 backdrop-blur-lg min-w-[180px]">
                  <span className="text-sm font-semibold text-surface-200 uppercase tracking-wider">
                    Tasks
                  </span>
                </th>

                {/* Date column headers */}
                {dates.map((dateStr) => {
                  const { day, date } = formatDateHeader(dateStr);
                  const today = isToday(dateStr);
                  return (
                    <th
                      key={dateStr}
                      className={`task-matrix-header-cell text-center min-w-[140px] ${
                        today ? 'bg-primary-500/10 border-b-2 border-primary-500' : ''
                      }`}
                    >
                      <div className={`text-xs font-bold uppercase tracking-wide ${today ? 'text-primary-400' : 'text-surface-400'}`}>
                        {day}
                      </div>
                      <div className={`text-sm font-medium mt-0.5 ${today ? 'text-primary-300' : 'text-surface-300'}`}>
                        {date}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Task Rows */}
            <tbody>
              {loading ? (
                // Skeleton loading
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="border-t border-surface-700/30">
                    <td className="p-4 sticky left-0 bg-surface-800/90">
                      <div className="h-5 w-32 skeleton rounded" />
                    </td>
                    {dates.map((d) => (
                      <td key={d} className="p-3">
                        <div className="h-9 skeleton rounded-lg" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={dates.length + 1} className="text-center py-16 text-surface-500">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-surface-700/50 flex items-center justify-center text-3xl">
                        📋
                      </div>
                      <p className="text-lg font-medium">No tasks yet</p>
                      <p className="text-sm text-surface-600">Click "+ Add Task" to create your first task</p>
                    </div>
                  </td>
                </tr>
              ) : (
                tasks.map((task, idx) => (
                  <tr
                    key={task.id}
                    className={`border-t border-surface-700/30 transition-colors hover:bg-surface-800/40 ${
                      idx % 2 === 0 ? 'bg-surface-900/20' : ''
                    }`}
                  >
                    {/* Task Name + Edit */}
                    <td className="sticky left-0 z-10 bg-surface-800/95 backdrop-blur-lg border-r border-surface-700/40">
                      <div className="flex items-center gap-2 px-4 py-3">
                        {isAdmin && (
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              onClick={() => {
                                setEditing(task);
                                setForm({
                                  title: task.title,
                                  description: task.description || '',
                                  category: task.category
                                });
                                setModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg hover:bg-primary-500/15 text-surface-500 hover:text-primary-400 transition-all"
                              title="Edit task"
                            >
                              <HiPencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(task.id)}
                              className="p-1.5 rounded-lg hover:bg-red-500/15 text-surface-500 hover:text-red-400 transition-all"
                              title="Delete task"
                            >
                              <HiTrash size={14} />
                            </button>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-surface-200 truncate" title={task.title}>
                            {task.title}
                          </p>
                          {task.category && task.category !== 'other' && (
                            <span className="text-[10px] uppercase tracking-wider text-surface-500 font-medium">
                              {task.category.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Assignment Cells (Person Dropdowns) */}
                    {dates.map((dateStr) => {
                      const assignment = task.assignments?.[dateStr];
                      const assignedTo = assignment?.assigned_to || '';
                      const today = isToday(dateStr);
                      return (
                        <td
                          key={dateStr}
                          className={`p-2 ${today ? 'bg-primary-500/5' : ''}`}
                        >
                          <div className="relative">
                            <select
                              value={assignedTo}
                              onChange={(e) => handleAssign(task.id, dateStr, e.target.value)}
                              className={`task-matrix-select ${
                                assignedTo
                                  ? 'bg-primary-500/10 border-primary-500/30 text-primary-300'
                                  : 'bg-surface-800/60 border-surface-600/40 text-surface-500'
                              }`}
                              disabled={!isAdmin}
                              title={assignment?.assigned_to_name || 'Unassigned'}
                            >
                              <option value="">—</option>
                              {members.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name}
                                </option>
                              ))}
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                              <svg className="w-3 h-3 text-surface-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Info */}
        {!loading && tasks.length > 0 && (
          <div className="px-4 py-3 border-t border-surface-700/30 flex items-center justify-between">
            <span className="text-xs text-surface-500">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''} • {dates.length} day{dates.length !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-surface-600">
              Showing {formatDateHeader(dates[0]).date} — {formatDateHeader(dates[dates.length - 1]).date}
            </span>
          </div>
        )}
      </div>

      {/* Add/Edit Task Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Task' : 'Add Task'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Task Name *</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input-field"
              placeholder="e.g., Prepare Bayan"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-field"
              rows={2}
              placeholder="Optional details..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="select-field"
            >
              {cats.map((c) => (
                <option key={c} value={c}>
                  {c.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">
              {editing ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Tasks;
