import { useState, useEffect } from 'react';
import { membersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { HiPlus, HiSearch, HiPencil, HiTrash, HiFilter } from 'react-icons/hi';

const Members = () => {
  const { isAdmin } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'member', status: 'active' });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  const fetchMembers = async (page = 1) => {
    try {
      setLoading(true);
      const res = await membersAPI.getAll({ search, role: roleFilter, page, limit: 15 });
      setMembers(res.data.members);
      setPagination(res.data.pagination);
    } catch (err) { toast.error('Failed to load members.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMembers(); }, [search, roleFilter]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await membersAPI.update(editing.id, { name: form.name, phone: form.phone, role: form.role, status: form.status });
        toast.success('Member updated.');
      } else {
        await membersAPI.create(form);
        toast.success('Member added.');
      }
      setModalOpen(false); setEditing(null);
      setForm({ name: '', email: '', password: '', phone: '', role: 'member', status: 'active' });
      fetchMembers();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save.'); }
  };

  const handleEdit = (m) => {
    setEditing(m);
    setForm({ name: m.name, email: m.email, password: '', phone: m.phone || '', role: m.role, status: m.status });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure?')) return;
    try { await membersAPI.delete(id); toast.success('Member deleted.'); fetchMembers(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed to delete.'); }
  };

  const roleBadge = (role) => {
    const map = { admin: 'badge-purple', member: 'badge-blue', accountant: 'badge-yellow', route_planner: 'badge-green' };
    return <span className={map[role] || 'badge-gray'}>{role.replace('_', ' ')}</span>;
  };

  const statusBadge = (s) => {
    const map = { active: 'badge-green', inactive: 'badge-red', leave: 'badge-yellow' };
    return <span className={map[s] || 'badge-gray'}>{s}</span>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="page-title">Members</h1>
        {isAdmin && (
          <button onClick={() => { setEditing(null); setForm({ name:'', email:'', password:'', phone:'', role:'member', status:'active' }); setModalOpen(true); }}
            className="btn-primary flex items-center gap-2"><HiPlus /> Add Member</button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
          <input placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="select-field w-full sm:w-48">
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="member">Member</option>
          <option value="accountant">Accountant</option>
          <option value="route_planner">Route Planner</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-800/50">
              <tr>
                <th className="table-header">Name</th>
                <th className="table-header hidden md:table-cell">Email</th>
                <th className="table-header hidden sm:table-cell">Phone</th>
                <th className="table-header">Role</th>
                <th className="table-header hidden lg:table-cell">Status</th>
                <th className="table-header hidden lg:table-cell">Joined</th>
                {isAdmin && <th className="table-header text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({length: 5}).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-4"><div className="h-6 skeleton" /></td></tr>
                ))
              ) : members.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-surface-500">No members found</td></tr>
              ) : members.map(m => (
                <tr key={m.id} className="hover:bg-surface-800/30 transition-colors">
                  <td className="table-cell font-medium text-surface-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500/50 to-emerald-400/50 flex items-center justify-center text-xs font-bold text-white">
                        {m.name.charAt(0)}
                      </div>
                      {m.name}
                    </div>
                  </td>
                  <td className="table-cell hidden md:table-cell">{m.email}</td>
                  <td className="table-cell hidden sm:table-cell">{m.phone || '—'}</td>
                  <td className="table-cell">{roleBadge(m.role)}</td>
                  <td className="table-cell hidden lg:table-cell">{statusBadge(m.status)}</td>
                  <td className="table-cell hidden lg:table-cell">{m.joining_date ? new Date(m.joining_date).toLocaleDateString() : '—'}</td>
                  {isAdmin && (
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(m)} className="p-2 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-blue-400 transition-colors"><HiPencil /></button>
                        <button onClick={() => handleDelete(m.id)} className="p-2 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-red-400 transition-colors"><HiTrash /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t border-surface-700/50">
            {Array.from({ length: pagination.totalPages }, (_, i) => (
              <button key={i} onClick={() => fetchMembers(i + 1)}
                className={`px-3 py-1 rounded-lg text-sm ${pagination.page === i + 1 ? 'bg-primary-500 text-white' : 'text-surface-400 hover:bg-surface-700'}`}>
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Member' : 'Add Member'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">Name *</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-field" required />
          </div>
          {!editing && (
            <>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">Password *</label>
                <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="input-field" required minLength={6} />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">Phone</label>
            <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">Role</label>
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="select-field">
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="accountant">Accountant</option>
                <option value="route_planner">Route Planner</option>
              </select>
            </div>
            {editing && (
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="select-field">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="leave">Leave</option>
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">{editing ? 'Update' : 'Add Member'}</button>
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Members;
