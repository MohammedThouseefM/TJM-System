import { useState, useEffect } from 'react';
import { announcementsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { HiPlus, HiTrash, HiSpeakerphone } from 'react-icons/hi';

const Announcements = () => {
  const { isAdmin } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title:'', message:'', priority:'medium' });

  const fetch = async () => {
    try { setLoading(true); const res = await announcementsAPI.getAll({ limit: 50 }); setAnnouncements(res.data.announcements); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try { await announcementsAPI.create(form); toast.success('Announcement posted.'); setModalOpen(false); setForm({ title:'', message:'', priority:'medium' }); fetch(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
  };

  const priorityColors = { low:'badge-gray', medium:'badge-blue', high:'badge-yellow', urgent:'badge-red' };
  const priorityBorder = { low:'border-l-surface-500', medium:'border-l-blue-500', high:'border-l-amber-500', urgent:'border-l-red-500' };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="page-title">Announcements</h1>
        {isAdmin && <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2"><HiPlus /> New Announcement</button>}
      </div>

      <div className="space-y-4">
        {loading ? [1,2,3].map(i => <div key={i} className="h-32 skeleton" />) :
          announcements.length === 0 ? <div className="text-center py-20 text-surface-500 glass-card">No announcements</div> :
          announcements.map(a => (
            <div key={a.id} className={`glass-card-hover p-5 border-l-4 ${priorityBorder[a.priority]}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <HiSpeakerphone className="text-primary-400 shrink-0" />
                    <h3 className="font-semibold text-lg text-surface-100">{a.title}</h3>
                    <span className={priorityColors[a.priority]}>{a.priority}</span>
                  </div>
                  <p className="text-surface-300 leading-relaxed">{a.message}</p>
                  <p className="text-xs text-surface-600 mt-3">By {a.created_by_name} • {new Date(a.created_at).toLocaleString()}</p>
                </div>
                {isAdmin && (
                  <button onClick={async () => { if(confirm('Remove?')){ await announcementsAPI.delete(a.id); toast.success('Removed.'); fetch(); }}}
                    className="p-2 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-red-400 shrink-0"><HiTrash /></button>
                )}
              </div>
            </div>
          ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New Announcement">
        <form onSubmit={handleAdd} className="space-y-4">
          <div><label className="block text-sm font-medium text-surface-300 mb-1">Title *</label><input value={form.title} onChange={e => setForm({...form, title:e.target.value})} className="input-field" required /></div>
          <div><label className="block text-sm font-medium text-surface-300 mb-1">Message *</label><textarea value={form.message} onChange={e => setForm({...form, message:e.target.value})} className="input-field" rows={4} required /></div>
          <div><label className="block text-sm font-medium text-surface-300 mb-1">Priority</label>
            <select value={form.priority} onChange={e => setForm({...form, priority:e.target.value})} className="select-field">
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="flex gap-3"><button type="submit" className="btn-primary flex-1">Post Announcement</button><button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button></div>
        </form>
      </Modal>
    </div>
  );
};
export default Announcements;
