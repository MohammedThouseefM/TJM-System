import { useState, useEffect } from 'react';
import { routesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { HiPlus, HiPencil, HiTrash, HiLocationMarker } from 'react-icons/hi';

const RoutePlanning = () => {
  const { isRoutePlanner } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ destination: '', date_from: '', date_to: '', purpose: '', activities: '', status: 'planned', notes: '' });

  const fetchRoutes = async () => {
    try { setLoading(true); const res = await routesAPI.getAll({ status: filter, limit: 50 }); setRoutes(res.data.routes); }
    catch (err) { toast.error('Failed to load routes.'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchRoutes(); }, [filter]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await routesAPI.update(editing.id, form); toast.success('Route updated.'); }
      else { await routesAPI.create(form); toast.success('Route added.'); }
      setModalOpen(false); setEditing(null); fetchRoutes();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
  };

  const handleEdit = (r) => {
    setEditing(r);
    setForm({ destination: r.destination, date_from: r.date_from?.split('T')[0] || '', date_to: r.date_to?.split('T')[0] || '', purpose: r.purpose || '', activities: r.activities || '', status: r.status, notes: r.notes || '' });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this route?')) return;
    try { await routesAPI.delete(id); toast.success('Deleted.'); fetchRoutes(); } catch { toast.error('Failed.'); }
  };

  const statusColor = { completed: 'badge-green', planned: 'badge-blue', in_progress: 'badge-yellow', cancelled: 'badge-red' };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="page-title">Route Planning</h1>
        <div className="flex gap-3">
          <select value={filter} onChange={e => setFilter(e.target.value)} className="select-field w-40">
            <option value="">All Status</option>
            <option value="planned">Planned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          {isRoutePlanner && (
            <button onClick={() => { setEditing(null); setForm({ destination:'', date_from:'', date_to:'', purpose:'', activities:'', status:'planned', notes:'' }); setModalOpen(true); }}
              className="btn-primary flex items-center gap-2"><HiPlus /> Add Route</button>
          )}
        </div>
      </div>

      {/* Routes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? Array.from({length: 6}).map((_, i) => <div key={i} className="h-48 skeleton" />) :
          routes.length === 0 ? <div className="col-span-full text-center py-20 text-surface-500">No routes found</div> :
          routes.map(r => (
            <div key={r.id} className="glass-card-hover p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 text-primary-400"><HiLocationMarker size={20} /><h3 className="font-semibold text-lg text-surface-100">{r.destination}</h3></div>
                <span className={statusColor[r.status]}>{r.status.replace('_', ' ')}</span>
              </div>
              <div className="text-sm text-surface-400 space-y-1 flex-1">
                <p>📅 {new Date(r.date_from).toLocaleDateString()} {r.date_to ? `→ ${new Date(r.date_to).toLocaleDateString()}` : ''}</p>
                {r.purpose && <p>🎯 {r.purpose}</p>}
                {r.activities && <p className="text-xs text-surface-500">📋 {r.activities.substring(0, 100)}...</p>}
                {r.notes && <p className="text-xs text-surface-600 mt-2 italic">{r.notes.substring(0, 80)}</p>}
              </div>
              {isRoutePlanner && (
                <div className="flex gap-2 mt-4 pt-3 border-t border-surface-700/30">
                  <button onClick={() => handleEdit(r)} className="btn-secondary text-xs py-1.5 px-3 flex-1 flex items-center justify-center gap-1"><HiPencil /> Edit</button>
                  <button onClick={() => handleDelete(r.id)} className="btn-danger text-xs py-1.5 px-3 flex items-center justify-center gap-1"><HiTrash /> Delete</button>
                </div>
              )}
            </div>
          ))
        }
      </div>

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Route' : 'Add Route'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="block text-sm font-medium text-surface-300 mb-1">Destination *</label><input value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} className="input-field" required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-surface-300 mb-1">From Date *</label><input type="date" value={form.date_from} onChange={e => setForm({...form, date_from: e.target.value})} className="input-field" required /></div>
            <div><label className="block text-sm font-medium text-surface-300 mb-1">To Date</label><input type="date" value={form.date_to} onChange={e => setForm({...form, date_to: e.target.value})} className="input-field" /></div>
          </div>
          <div><label className="block text-sm font-medium text-surface-300 mb-1">Purpose</label><input value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})} className="input-field" /></div>
          <div><label className="block text-sm font-medium text-surface-300 mb-1">Activities</label><textarea value={form.activities} onChange={e => setForm({...form, activities: e.target.value})} className="input-field" rows={3} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-surface-300 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="select-field">
                <option value="planned">Planned</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div><label className="block text-sm font-medium text-surface-300 mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="input-field" rows={2} /></div>
          <div className="flex gap-3 pt-2"><button type="submit" className="btn-primary flex-1">{editing ? 'Update' : 'Add Route'}</button><button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button></div>
        </form>
      </Modal>
    </div>
  );
};

export default RoutePlanning;
