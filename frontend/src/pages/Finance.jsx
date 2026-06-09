import { useState, useEffect, useRef } from 'react';
import { financeAPI, membersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { HiPlus, HiDownload, HiTrash, HiSearch, HiCheck, HiX, HiUsers } from 'react-icons/hi';

// ── Multi-Member Selector Component ─────────────────────────────
const MemberMultiSelect = ({ members, selected, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id) => {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  };

  const selectAll = () => onChange(filtered.map(m => m.id));
  const clearAll = () => onChange([]);

  const selectedNames = members.filter(m => selected.includes(m.id)).map(m => m.name);

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="input-field text-left flex items-center justify-between gap-2 min-h-[46px]"
      >
        <div className="flex-1 min-w-0">
          {selected.length === 0 ? (
            <span className="text-surface-500">Select members...</span>
          ) : selected.length === 1 ? (
            <span className="text-surface-200">{selectedNames[0]}</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {selectedNames.slice(0, 3).map((name, i) => (
                <span key={i} className="badge-green text-xs">{name}</span>
              ))}
              {selected.length > 3 && (
                <span className="badge-gray text-xs">+{selected.length - 3} more</span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {selected.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center font-bold">
              {selected.length}
            </span>
          )}
          <HiUsers className="text-surface-400" size={16} />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 glass-card border border-surface-600 rounded-xl overflow-hidden shadow-2xl">
          {/* Search & Actions */}
          <div className="p-2 border-b border-surface-700">
            <div className="relative mb-2">
              <HiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-500" size={14} />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search members..."
                className="w-full bg-surface-900 border border-surface-600 rounded-lg pl-8 pr-3 py-1.5 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:border-primary-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-primary-400 hover:text-primary-300 px-2 py-1 rounded hover:bg-primary-500/10 transition-colors"
              >
                Select All ({filtered.length})
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-surface-400 hover:text-surface-300 px-2 py-1 rounded hover:bg-surface-700 transition-colors"
              >
                Clear
              </button>
              <span className="ml-auto text-xs text-surface-500 self-center">
                {selected.length} selected
              </span>
            </div>
          </div>

          {/* Member List */}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-center py-4 text-sm text-surface-500">No members found</p>
            ) : (
              filtered.map(m => {
                const isSelected = selected.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggle(m.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      isSelected
                        ? 'bg-primary-500/15 text-primary-300'
                        : 'text-surface-300 hover:bg-surface-700/60'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                      isSelected ? 'bg-primary-500 border-primary-500' : 'border-surface-500'
                    }`}>
                      {isSelected && <HiCheck size={10} className="text-white" />}
                    </div>
                    {/* Avatar */}
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500/50 to-emerald-400/50 flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {m.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.name}</p>
                      <p className="text-xs text-surface-500 capitalize truncate">{m.role?.replace('_', ' ')}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-surface-700">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full btn-primary py-1.5 text-sm"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Finance Page ────────────────────────────────────────────
const Finance = () => {
  const { isAccountant } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [members, setMembers] = useState([]);
  const [treasury, setTreasury] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({ type: '', category: '', user_id: '', date_from: '', date_to: '' });

  const defaultForm = {
    user_ids: [],          // multi-select
    type: 'credit',
    amount: '',
    description: '',
    category: 'contribution',
    transaction_date: new Date().toISOString().split('T')[0],
  };
  const [form, setForm] = useState(defaultForm);

  const categories = ['contribution', 'food', 'travel', 'accommodation', 'supplies', 'medical', 'communication', 'other'];

  const fetchData = async () => {
    try {
      setLoading(true);
      const [txRes, memRes] = await Promise.all([
        financeAPI.getTransactions({ ...filters, limit: 50 }),
        membersAPI.getAll({ limit: 100 })
      ]);
      setTransactions(txRes.data.transactions);
      setMembers(memRes.data.members);
      if (isAccountant) {
        const tRes = await financeAPI.getTreasury();
        setTreasury(tRes.data);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [filters]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (form.user_ids.length === 0) {
      toast.error('Please select at least one member.');
      return;
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await financeAPI.addTransaction({
        user_ids: form.user_ids,
        type: form.type,
        amount: parseFloat(form.amount),
        description: form.description || undefined,
        category: form.category,
        transaction_date: form.transaction_date,
      });
      toast.success(res.data.message || 'Transactions recorded.');
      setModalOpen(false);
      setForm(defaultForm);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to record transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this transaction?')) return;
    try { await financeAPI.deleteTransaction(id); toast.success('Deleted.'); fetchData(); }
    catch { toast.error('Failed to delete.'); }
  };

  const handleExport = async () => {
    try {
      const res = await financeAPI.exportCSV({ date_from: filters.date_from, date_to: filters.date_to });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'jamat_finance.csv';
      document.body.appendChild(a); a.click(); a.remove();
      toast.success('CSV downloaded!');
    } catch { toast.error('Export failed.'); }
  };

  // Preview: total amount across selected members
  const totalPreview = form.user_ids.length > 0 && form.amount
    ? (parseFloat(form.amount) * form.user_ids.length).toLocaleString('en-IN', { minimumFractionDigits: 2 })
    : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="page-title">Financial Accounting</h1>
        <div className="flex gap-2">
          {isAccountant && (
            <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
              <HiDownload /> Export CSV
            </button>
          )}
          {isAccountant && (
            <button onClick={() => { setForm(defaultForm); setModalOpen(true); }}
              className="btn-primary flex items-center gap-2">
              <HiPlus /> Add Transaction
            </button>
          )}
        </div>
      </div>

      {/* Treasury Summary */}
      {treasury && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card p-5 border-l-4 border-emerald-500">
            <p className="text-sm text-surface-400">Total Contributions</p>
            <p className="text-2xl font-bold text-emerald-400">₹{Number(treasury.treasury?.total_contributions || 0).toLocaleString()}</p>
          </div>
          <div className="glass-card p-5 border-l-4 border-red-500">
            <p className="text-sm text-surface-400">Total Expenses</p>
            <p className="text-2xl font-bold text-red-400">₹{Number(treasury.treasury?.total_expenses || 0).toLocaleString()}</p>
          </div>
          <div className="glass-card p-5 border-l-4 border-primary-500">
            <p className="text-sm text-surface-400">Treasury Balance</p>
            <p className="text-2xl font-bold text-primary-400">₹{Number(treasury.treasury?.treasury_balance || 0).toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <select value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })} className="select-field text-sm">
            <option value="">All Types</option>
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
          </select>
          <select value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })} className="select-field text-sm">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filters.user_id} onChange={e => setFilters({ ...filters, user_id: e.target.value })} className="select-field text-sm">
            <option value="">All Members</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <input type="date" value={filters.date_from} onChange={e => setFilters({ ...filters, date_from: e.target.value })} className="input-field text-sm" />
          <input type="date" value={filters.date_to} onChange={e => setFilters({ ...filters, date_to: e.target.value })} className="input-field text-sm" />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-800/50">
              <tr>
                <th className="table-header">Date</th>
                <th className="table-header">Member</th>
                <th className="table-header">Type</th>
                <th className="table-header">Amount</th>
                <th className="table-header hidden md:table-cell">Category</th>
                <th className="table-header hidden lg:table-cell">Description</th>
                {isAccountant && <th className="table-header text-right">Action</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-4"><div className="h-6 skeleton" /></td></tr>
                ))
              ) : transactions.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-surface-500">No transactions found</td></tr>
              ) : transactions.map(t => (
                <tr key={t.id} className="hover:bg-surface-800/30 transition-colors">
                  <td className="table-cell">{new Date(t.transaction_date).toLocaleDateString()}</td>
                  <td className="table-cell font-medium text-surface-200">{t.member_name}</td>
                  <td className="table-cell">
                    <span className={t.type === 'credit' ? 'badge-green' : 'badge-red'}>{t.type}</span>
                  </td>
                  <td className={`table-cell font-semibold ${t.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {t.type === 'credit' ? '+' : '-'}₹{Number(t.amount).toLocaleString()}
                  </td>
                  <td className="table-cell hidden md:table-cell capitalize">{t.category}</td>
                  <td className="table-cell hidden lg:table-cell text-surface-500">{t.description || '—'}</td>
                  {isAccountant && (
                    <td className="table-cell text-right">
                      <button onClick={() => handleDelete(t.id)}
                        className="p-2 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-red-400 transition-colors">
                        <HiTrash />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Transaction Modal ── */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Transaction" size="lg">
        <form onSubmit={handleAdd} className="space-y-4">

          {/* Multi-Member Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-surface-300">
                Members * <span className="text-surface-500 font-normal">(select one or more)</span>
              </label>
              {form.user_ids.length > 0 && (
                <button type="button" onClick={() => setForm({ ...form, user_ids: [] })}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                  <HiX size={12} /> Clear
                </button>
              )}
            </div>
            <MemberMultiSelect
              members={members}
              selected={form.user_ids}
              onChange={(ids) => setForm({ ...form, user_ids: ids })}
            />
          </div>

          {/* Type & Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Type *</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="select-field">
                <option value="credit">💰 Credit (Contribution)</option>
                <option value="debit">💸 Debit (Expense)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Amount per Member (₹) *</label>
              <input
                type="number" step="0.01" min="0.01"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                className="input-field" placeholder="0.00" required
              />
            </div>
          </div>

          {/* Category & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="select-field">
                {categories.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Date</label>
              <input type="date" value={form.transaction_date}
                onChange={e => setForm({ ...form, transaction_date: e.target.value })}
                className="input-field" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Description</label>
            <input value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="input-field" placeholder="Optional description..." />
          </div>

          {/* Transaction Preview */}
          {form.user_ids.length > 0 && form.amount && (
            <div className={`p-4 rounded-xl border ${form.type === 'credit'
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-red-500/10 border-red-500/30'}`}>
              <p className="text-sm font-medium text-surface-300 mb-2">📋 Transaction Preview</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-surface-400">Members:</span>
                <span className="text-surface-200 font-medium">{form.user_ids.length} member{form.user_ids.length > 1 ? 's' : ''}</span>
                <span className="text-surface-400">Amount each:</span>
                <span className="text-surface-200 font-medium">₹{parseFloat(form.amount || 0).toLocaleString()}</span>
                <span className="text-surface-400">Total {form.type === 'credit' ? 'credited' : 'debited'}:</span>
                <span className={`font-bold ${form.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                  ₹{totalPreview}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={submitting}
              className="btn-primary flex-1 flex items-center justify-center gap-2">
              {submitting
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <HiCheck />}
              {submitting
                ? 'Recording...'
                : `Record ${form.user_ids.length > 1 ? `${form.user_ids.length} Transactions` : 'Transaction'}`}
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

export default Finance;
