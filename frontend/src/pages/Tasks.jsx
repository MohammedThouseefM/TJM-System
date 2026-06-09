import { useState, useEffect } from 'react';
import { tasksAPI, membersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { HiPlus, HiPencil, HiTrash } from 'react-icons/hi';

const Tasks = () => {
  const { isAdmin } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title:'', description:'', task_date:'', due_time:'', assigned_to:'', category:'other' });
  const cats = ['bayan','dawah','meal_prep','cleaning','security','finance','travel','other'];

  const fetchTasks = async () => {
    try { setLoading(true);
      const [t, m] = await Promise.all([tasksAPI.getAll({ date, limit: 50 }), membersAPI.getAll({ limit: 100 })]);
      setTasks(t.data.tasks); setMembers(m.data.members);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { fetchTasks(); }, [date]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await tasksAPI.update(editing.id, form); } else { await tasksAPI.create({ ...form, task_date: form.task_date || date }); }
      toast.success(editing ? 'Updated.' : 'Created.'); setModalOpen(false); setEditing(null); fetchTasks();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
  };

  const updateStatus = async (id, status) => {
    try { await tasksAPI.updateStatus(id, status); fetchTasks(); } catch { toast.error('Failed.'); }
  };

  const done = tasks.filter(t => t.status === 'completed').length;
  const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
  const sIcon = { pending:'⏳', in_progress:'🔄', completed:'✅' };
  const sCls = { pending:'badge-yellow', in_progress:'badge-blue', completed:'badge-green' };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="page-title">Daily Tasks</h1><p className="text-surface-400 mt-1">{done}/{tasks.length} completed</p></div>
        <div className="flex gap-3">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field w-44" />
          {isAdmin && <button onClick={() => { setEditing(null); setForm({ title:'', description:'', task_date:date, due_time:'', assigned_to:'', category:'other' }); setModalOpen(true); }} className="btn-primary flex items-center gap-2"><HiPlus /> Add</button>}
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="flex justify-between mb-2"><span className="text-sm text-surface-400">Progress</span><span className="text-sm font-medium text-primary-400">{pct}%</span></div>
        <div className="w-full h-3 bg-surface-700 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-primary-600 to-emerald-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} /></div>
      </div>

      <div className="space-y-3">
        {loading ? [1,2,3].map(i => <div key={i} className="h-20 skeleton" />) :
          tasks.length === 0 ? <div className="text-center py-20 text-surface-500 glass-card">No tasks for this date</div> :
          tasks.map(t => (
            <div key={t.id} className={`glass-card-hover p-4 flex flex-col sm:flex-row sm:items-center gap-4 ${t.status==='completed'?'opacity-70':''}`}>
              <button onClick={() => updateStatus(t.id, t.status==='completed'?'pending':t.status==='pending'?'in_progress':'completed')}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${t.status==='completed'?'bg-emerald-500/20 text-emerald-400':'bg-surface-700 text-surface-400 hover:bg-surface-600'}`}>
                {sIcon[t.status]}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className={`font-medium ${t.status==='completed'?'line-through text-surface-500':'text-surface-200'}`}>{t.title}</h3>
                  <span className={sCls[t.status]}>{t.status.replace('_',' ')}</span>
                  <span className="badge-gray capitalize">{t.category.replace('_',' ')}</span>
                </div>
                {t.description && <p className="text-sm text-surface-500 mt-1">{t.description}</p>}
                <div className="flex gap-4 mt-1 text-xs text-surface-500">
                  {t.assigned_to_name && <span>👤 {t.assigned_to_name}</span>}
                  {t.due_time && <span>🕐 {t.due_time}</span>}
                </div>
              </div>
              {isAdmin && <div className="flex gap-2 shrink-0">
                <button onClick={() => { setEditing(t); setForm({ title:t.title, description:t.description||'', task_date:t.task_date?.split('T')[0], due_time:t.due_time||'', assigned_to:t.assigned_to||'', category:t.category }); setModalOpen(true); }} className="p-2 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-blue-400"><HiPencil /></button>
                <button onClick={async () => { if(confirm('Delete?')){ await tasksAPI.delete(t.id); fetchTasks(); }}} className="p-2 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-red-400"><HiTrash /></button>
              </div>}
            </div>
          ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Task' : 'Add Task'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="block text-sm font-medium text-surface-300 mb-1">Title *</label><input value={form.title} onChange={e => setForm({...form, title:e.target.value})} className="input-field" required /></div>
          <div><label className="block text-sm font-medium text-surface-300 mb-1">Description</label><textarea value={form.description} onChange={e => setForm({...form, description:e.target.value})} className="input-field" rows={2} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-surface-300 mb-1">Date</label><input type="date" value={form.task_date} onChange={e => setForm({...form, task_date:e.target.value})} className="input-field" /></div>
            <div><label className="block text-sm font-medium text-surface-300 mb-1">Due Time</label><input type="time" value={form.due_time} onChange={e => setForm({...form, due_time:e.target.value})} className="input-field" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-surface-300 mb-1">Assign To</label><select value={form.assigned_to} onChange={e => setForm({...form, assigned_to:e.target.value})} className="select-field"><option value="">Unassigned</option>{members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-surface-300 mb-1">Category</label><select value={form.category} onChange={e => setForm({...form, category:e.target.value})} className="select-field">{cats.map(c=><option key={c} value={c}>{c.replace('_',' ')}</option>)}</select></div>
          </div>
          <div className="flex gap-3 pt-2"><button type="submit" className="btn-primary flex-1">{editing?'Update':'Create'}</button><button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button></div>
        </form>
      </Modal>
    </div>
  );
};
export default Tasks;
