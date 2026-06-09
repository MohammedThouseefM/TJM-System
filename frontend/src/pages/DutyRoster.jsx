import { useState, useEffect } from 'react';
import { dutiesAPI, membersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { HiPlus, HiRefresh, HiTrash } from 'react-icons/hi';

const DutyRoster = () => {
  const { isAdmin } = useAuth();
  const [duties, setDuties] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [modalOpen, setModalOpen] = useState(false);
  const [rotationModal, setRotationModal] = useState(false);
  const [form, setForm] = useState({ duty_type:'meal', assigned_to:'', duty_date:'', shift:'full_day', notes:'' });
  const [rotation, setRotation] = useState({ start_date:'', end_date:'', duty_types:['meal','cleaning','security'] });
  const types = ['meal','cleaning','security','finance','shopping','other'];

  const fetch = async () => {
    try { setLoading(true);
      const [d, m] = await Promise.all([dutiesAPI.getRoster(date), membersAPI.getAll({ limit:100 })]);
      setDuties(d.data.duties); setMembers(m.data.members);
    } catch(e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, [date]);

  const handleAssign = async (e) => {
    e.preventDefault();
    try { await dutiesAPI.assign({ ...form, duty_date: form.duty_date || date }); toast.success('Assigned.'); setModalOpen(false); fetch(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
  };

  const handleRotation = async (e) => {
    e.preventDefault();
    try { const res = await dutiesAPI.generateRotation(rotation); toast.success(res.data.message); setRotationModal(false); fetch(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
  };

  const toggleStatus = async (id, current) => {
    try { await dutiesAPI.updateStatus(id, current === 'completed' ? 'pending' : 'completed'); fetch(); }
    catch { toast.error('Failed.'); }
  };

  const typeEmoji = { meal:'🍽️', cleaning:'🧹', security:'🛡️', finance:'💰', shopping:'🛒', other:'📋' };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="page-title">Duty Roster</h1>
        <div className="flex gap-3 flex-wrap">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field w-44" />
          {isAdmin && <>
            <button onClick={() => setRotationModal(true)} className="btn-secondary flex items-center gap-2"><HiRefresh /> Auto Rotate</button>
            <button onClick={() => { setForm({ duty_type:'meal', assigned_to:'', duty_date:date, shift:'full_day', notes:'' }); setModalOpen(true); }} className="btn-primary flex items-center gap-2"><HiPlus /> Assign</button>
          </>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? [1,2,3].map(i => <div key={i} className="h-32 skeleton" />) :
          duties.length === 0 ? <div className="col-span-full text-center py-20 text-surface-500 glass-card">No duties assigned for this date</div> :
          duties.map(d => (
            <div key={d.id} className="glass-card-hover p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{typeEmoji[d.duty_type] || '📋'}</span>
                  <div>
                    <h3 className="font-semibold text-surface-200 capitalize">{d.duty_type}</h3>
                    <p className="text-sm text-surface-400">{d.assigned_to_name}</p>
                  </div>
                </div>
                <button onClick={() => toggleStatus(d.id, d.status)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${d.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'}`}>
                  {d.status}
                </button>
              </div>
              <div className="mt-3 text-xs text-surface-500 capitalize">Shift: {d.shift?.replace('_',' ')}</div>
              {d.notes && <p className="text-xs text-surface-600 mt-1">{d.notes}</p>}
              {isAdmin && <button onClick={async () => { if(confirm('Remove?')){ await dutiesAPI.delete(d.id); fetch(); }}} className="mt-3 text-xs text-red-400 hover:text-red-300 flex items-center gap-1"><HiTrash /> Remove</button>}
            </div>
          ))}
      </div>

      {/* Assign Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Assign Duty">
        <form onSubmit={handleAssign} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-surface-300 mb-1">Duty Type *</label><select value={form.duty_type} onChange={e => setForm({...form, duty_type:e.target.value})} className="select-field">{types.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-surface-300 mb-1">Member *</label><select value={form.assigned_to} onChange={e => setForm({...form, assigned_to:e.target.value})} className="select-field" required><option value="">Select</option>{members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-surface-300 mb-1">Date</label><input type="date" value={form.duty_date} onChange={e => setForm({...form, duty_date:e.target.value})} className="input-field" /></div>
            <div><label className="block text-sm font-medium text-surface-300 mb-1">Shift</label><select value={form.shift} onChange={e => setForm({...form, shift:e.target.value})} className="select-field"><option value="full_day">Full Day</option><option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option></select></div>
          </div>
          <div><label className="block text-sm font-medium text-surface-300 mb-1">Notes</label><input value={form.notes} onChange={e => setForm({...form, notes:e.target.value})} className="input-field" /></div>
          <div className="flex gap-3"><button type="submit" className="btn-primary flex-1">Assign</button><button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button></div>
        </form>
      </Modal>

      {/* Rotation Modal */}
      <Modal isOpen={rotationModal} onClose={() => setRotationModal(false)} title="Auto-Generate Rotation">
        <form onSubmit={handleRotation} className="space-y-4">
          <p className="text-sm text-surface-400">Automatically assigns duties to active members in rotation for the given period.</p>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-surface-300 mb-1">Start Date *</label><input type="date" value={rotation.start_date} onChange={e => setRotation({...rotation, start_date:e.target.value})} className="input-field" required /></div>
            <div><label className="block text-sm font-medium text-surface-300 mb-1">End Date *</label><input type="date" value={rotation.end_date} onChange={e => setRotation({...rotation, end_date:e.target.value})} className="input-field" required /></div>
          </div>
          <div className="flex gap-3"><button type="submit" className="btn-primary flex-1">Generate</button><button type="button" onClick={() => setRotationModal(false)} className="btn-secondary">Cancel</button></div>
        </form>
      </Modal>
    </div>
  );
};
export default DutyRoster;
