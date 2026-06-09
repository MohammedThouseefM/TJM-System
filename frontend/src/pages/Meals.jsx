import { useState, useEffect } from 'react';
import { mealsAPI, membersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { HiPlus, HiPencil, HiTrash } from 'react-icons/hi';

const Meals = () => {
  const { isAdmin } = useAuth();
  const [meals, setMeals] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ meal_date:'', meal_type:'lunch', menu:'', ingredients:'', estimated_cost:'', cook_id:'', notes:'' });
  const types = ['suhoor','breakfast','lunch','dinner','snack'];
  const typeEmoji = { suhoor:'🌙', breakfast:'🌅', lunch:'☀️', dinner:'🌃', snack:'🍎' };

  const fetch = async () => {
    try { setLoading(true);
      const [ml, mb] = await Promise.all([mealsAPI.get(date), membersAPI.getAll({ limit:100 })]);
      setMeals(ml.data.meals); setMembers(mb.data.members);
    } catch(e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, [date]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await mealsAPI.update(editing.id, form); } else { await mealsAPI.create({ ...form, meal_date: form.meal_date || date }); }
      toast.success(editing ? 'Updated.' : 'Meal planned.'); setModalOpen(false); setEditing(null); fetch();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
  };

  const statusColors = { planned:'badge-blue', preparing:'badge-yellow', served:'badge-green', cancelled:'badge-red' };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="page-title">Meal Management</h1>
        <div className="flex gap-3">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field w-44" />
          {isAdmin && <button onClick={() => { setEditing(null); setForm({ meal_date:date, meal_type:'lunch', menu:'', ingredients:'', estimated_cost:'', cook_id:'', notes:'' }); setModalOpen(true); }} className="btn-primary flex items-center gap-2"><HiPlus /> Plan Meal</button>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? [1,2,3].map(i => <div key={i} className="h-48 skeleton" />) :
          meals.length === 0 ? <div className="col-span-full text-center py-20 text-surface-500 glass-card">No meals planned for this date</div> :
          meals.map(m => (
            <div key={m.id} className="glass-card-hover p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{typeEmoji[m.meal_type]}</span>
                  <div>
                    <h3 className="font-semibold text-surface-200 capitalize">{m.meal_type}</h3>
                    <span className={statusColors[m.status]}>{m.status}</span>
                  </div>
                </div>
                {m.estimated_cost && <span className="text-sm font-medium text-amber-400">₹{m.estimated_cost}</span>}
              </div>
              {m.menu && <p className="text-sm text-surface-300 mb-2">🍽️ {m.menu}</p>}
              {m.ingredients && <p className="text-xs text-surface-500 mb-2">🧄 {m.ingredients}</p>}
              {m.cook_name && <p className="text-xs text-surface-500">👨‍🍳 Cook: {m.cook_name}</p>}
              {m.notes && <p className="text-xs text-surface-600 mt-1 italic">{m.notes}</p>}
              {isAdmin && (
                <div className="flex gap-2 mt-4 pt-3 border-t border-surface-700/30">
                  <button onClick={() => { setEditing(m); setForm({ meal_date:m.meal_date?.split('T')[0], meal_type:m.meal_type, menu:m.menu||'', ingredients:m.ingredients||'', estimated_cost:m.estimated_cost||'', cook_id:m.cook_id||'', notes:m.notes||'', status:m.status }); setModalOpen(true); }}
                    className="btn-secondary text-xs py-1.5 flex-1 flex items-center justify-center gap-1"><HiPencil /> Edit</button>
                  <button onClick={async () => { if(confirm('Delete?')){ await mealsAPI.delete(m.id); fetch(); }}}
                    className="btn-danger text-xs py-1.5 flex items-center justify-center gap-1"><HiTrash /></button>
                </div>
              )}
            </div>
          ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Meal' : 'Plan Meal'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-surface-300 mb-1">Type *</label><select value={form.meal_type} onChange={e => setForm({...form, meal_type:e.target.value})} className="select-field">{types.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-surface-300 mb-1">Date</label><input type="date" value={form.meal_date} onChange={e => setForm({...form, meal_date:e.target.value})} className="input-field" /></div>
          </div>
          <div><label className="block text-sm font-medium text-surface-300 mb-1">Menu</label><input value={form.menu} onChange={e => setForm({...form, menu:e.target.value})} className="input-field" placeholder="e.g., Biryani, Raita, Salad" /></div>
          <div><label className="block text-sm font-medium text-surface-300 mb-1">Ingredients</label><textarea value={form.ingredients} onChange={e => setForm({...form, ingredients:e.target.value})} className="input-field" rows={2} placeholder="List ingredients..." /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-surface-300 mb-1">Est. Cost (₹)</label><input type="number" value={form.estimated_cost} onChange={e => setForm({...form, estimated_cost:e.target.value})} className="input-field" /></div>
            <div><label className="block text-sm font-medium text-surface-300 mb-1">Cook</label><select value={form.cook_id} onChange={e => setForm({...form, cook_id:e.target.value})} className="select-field"><option value="">Unassigned</option>{members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
          </div>
          {editing && <div><label className="block text-sm font-medium text-surface-300 mb-1">Status</label><select value={form.status} onChange={e => setForm({...form, status:e.target.value})} className="select-field"><option value="planned">Planned</option><option value="preparing">Preparing</option><option value="served">Served</option><option value="cancelled">Cancelled</option></select></div>}
          <div><label className="block text-sm font-medium text-surface-300 mb-1">Notes</label><input value={form.notes} onChange={e => setForm({...form, notes:e.target.value})} className="input-field" /></div>
          <div className="flex gap-3"><button type="submit" className="btn-primary flex-1">{editing?'Update':'Plan Meal'}</button><button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button></div>
        </form>
      </Modal>
    </div>
  );
};
export default Meals;
