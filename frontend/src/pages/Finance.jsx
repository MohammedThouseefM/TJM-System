import { useState, useEffect } from 'react';
import { financeAPI, membersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { HiPlus, HiDownload, HiFilter, HiTrash, HiCurrencyRupee } from 'react-icons/hi';

const Finance = () => {
  const { isAccountant, user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [members, setMembers] = useState([]);
  const [treasury, setTreasury] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filters, setFilters] = useState({ type: '', category: '', user_id: '', date_from: '', date_to: '' });
  const [form, setForm] = useState({ user_id: '', type: 'credit', amount: '', description: '', category: 'contribution', transaction_date: new Date().toISOString().split('T')[0] });
  const [tab, setTab] = useState('transactions');

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
    try {
      await financeAPI.addTransaction(form);
      toast.success('Transaction recorded.');
      setModalOpen(false);
      setForm({ user_id: '', type: 'credit', amount: '', description: '', category: 'contribution', transaction_date: new Date().toISOString().split('T')[0] });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this transaction?')) return;
    try { await financeAPI.deleteTransaction(id); toast.success('Deleted.'); fetchData(); }
    catch (err) { toast.error('Failed to delete.'); }
  };

  const handleExport = async () => {
    try {
      const res = await financeAPI.exportCSV({ date_from: filters.date_from, date_to: filters.date_to });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'jamat_finance.csv';
      document.body.appendChild(a); a.click(); a.remove();
      toast.success('CSV downloaded!');
    } catch (err) { toast.error('Export failed.'); }
  };

  const categories = ['contribution', 'food', 'travel', 'accommodation', 'supplies', 'medical', 'communication', 'other'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="page-title">Financial Accounting</h1>
        <div className="flex gap-2">
          {isAccountant && <button onClick={handleExport} className="btn-secondary flex items-center gap-2"><HiDownload /> Export CSV</button>}
          {isAccountant && <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2"><HiPlus /> Add Transaction</button>}
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
          <select value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})} className="select-field text-sm">
            <option value="">All Types</option>
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
          </select>
          <select value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})} className="select-field text-sm">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filters.user_id} onChange={e => setFilters({...filters, user_id: e.target.value})} className="select-field text-sm">
            <option value="">All Members</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <input type="date" value={filters.date_from} onChange={e => setFilters({...filters, date_from: e.target.value})} className="input-field text-sm" placeholder="From" />
          <input type="date" value={filters.date_to} onChange={e => setFilters({...filters, date_to: e.target.value})} className="input-field text-sm" placeholder="To" />
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
                Array.from({length: 5}).map((_, i) => <tr key={i}><td colSpan={7} className="px-4 py-4"><div className="h-6 skeleton" /></td></tr>)
              ) : transactions.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-surface-500">No transactions found</td></tr>
              ) : transactions.map(t => (
                <tr key={t.id} className="hover:bg-surface-800/30 transition-colors">
                  <td className="table-cell">{new Date(t.transaction_date).toLocaleDateString()}</td>
                  <td className="table-cell font-medium text-surface-200">{t.member_name}</td>
                  <td className="table-cell"><span className={t.type === 'credit' ? 'badge-green' : 'badge-red'}>{t.type}</span></td>
                  <td className={`table-cell font-semibold ${t.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {t.type === 'credit' ? '+' : '-'}₹{Number(t.amount).toLocaleString()}
                  </td>
                  <td className="table-cell hidden md:table-cell capitalize">{t.category}</td>
                  <td className="table-cell hidden lg:table-cell text-surface-500">{t.description || '—'}</td>
                  {isAccountant && (
                    <td className="table-cell text-right">
                      <button onClick={() => handleDelete(t.id)} className="p-2 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-red-400"><HiTrash /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Transaction Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Transaction">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">Member *</label>
            <select value={form.user_id} onChange={e => setForm({...form, user_id: e.target.value})} className="select-field" required>
              <option value="">Select member</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">Type *</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="select-field">
                <option value="credit">Credit (Contribution)</option>
                <option value="debit">Debit (Expense)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">Amount (₹) *</label>
              <input type="number" step="0.01" min="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="input-field" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">Category</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="select-field">
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1">Date</label>
              <input type="date" value={form.transaction_date} onChange={e => setForm({...form, transaction_date: e.target.value})} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">Description</label>
            <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input-field" placeholder="Optional description" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">Record Transaction</button>
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Finance;
