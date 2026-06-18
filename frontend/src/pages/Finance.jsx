import { useState, useEffect } from 'react';
import { financeAPI, membersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { HiPlus, HiDownload, HiTrash, HiSearch, HiCheck, HiX, HiUsers, HiReceiptRefund } from 'react-icons/hi';
import { ReceiptModal } from './FinanceTabPanels';
import { useRef } from 'react';

// ── Multi-select member picker ───────────────────────────────────
const MemberPicker = ({ members, selected, onChange }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const filtered = members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
  const toggle = (id) => onChange(selected.includes(id) ? selected.filter(x=>x!==id) : [...selected, id]);
  const names = members.filter(m => selected.includes(m.id)).map(m => m.name);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className="input-field text-left flex items-center justify-between gap-2 min-h-[46px]">
        <div className="flex-1 min-w-0">
          {!selected.length ? <span className="text-surface-500">Select members...</span>
            : selected.length === 1 ? <span className="text-surface-200">{names[0]}</span>
            : <div className="flex flex-wrap gap-1">
                {names.slice(0,3).map((n,i) => <span key={i} className="badge-green text-xs">{n}</span>)}
                {selected.length > 3 && <span className="badge-gray text-xs">+{selected.length - 3} more</span>}
              </div>}
        </div>
        <div className="flex items-center gap-1">
          {selected.length > 0 && <span className="w-5 h-5 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center">{selected.length}</span>}
          <HiUsers className="text-surface-400" size={16}/>
        </div>
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 glass-card border border-surface-600 rounded-xl overflow-hidden shadow-2xl">
          <div className="p-2 border-b border-surface-700">
            <div className="relative mb-2">
              <HiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-500" size={13}/>
              <input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." className="w-full bg-surface-900 border border-surface-600 rounded-lg pl-7 pr-3 py-1.5 text-sm text-surface-200 focus:outline-none focus:border-primary-500"/>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => onChange(filtered.map(m=>m.id))} className="text-xs text-primary-400 px-2 py-1 rounded hover:bg-primary-500/10">Select All</button>
              <button type="button" onClick={() => onChange([])} className="text-xs text-surface-400 px-2 py-1 rounded hover:bg-surface-700">Clear</button>
              <span className="ml-auto text-xs text-surface-500 self-center">{selected.length} selected</span>
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.map(m => {
              const on = selected.includes(m.id);
              return (
                <button key={m.id} type="button" onClick={() => toggle(m.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${on?'bg-primary-500/15 text-primary-300':'text-surface-300 hover:bg-surface-700/60'}`}>
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${on?'bg-primary-500 border-primary-500':'border-surface-500'}`}>{on&&<HiCheck size={10} className="text-white"/>}</div>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500/50 to-emerald-400/50 flex items-center justify-center text-xs font-bold text-white shrink-0">{m.name.charAt(0)}</div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{m.name}</p><p className="text-xs text-surface-500 capitalize">{m.role?.replace('_',' ')}</p></div>
                </button>
              );
            })}
          </div>
          <div className="p-2 border-t border-surface-700">
            <button type="button" onClick={() => setOpen(false)} className="w-full btn-primary py-1.5 text-sm">Done</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Finance Page ────────────────────────────────────────────
// Tabs removed
const today = new Date().toISOString().split('T')[0];
const categories = ['contribution','food','travel','accommodation','supplies','medical','communication','other'];
const PAYMENT_METHODS = ['cash','bank','online','other'];
const EXPENSE_SOURCES = ['treasury','member'];
const fmt = (n) => Number(n||0).toLocaleString();

const Finance = () => {
  const { isAccountant, isAdmin } = useAuth();

  const [transactions, setTransactions] = useState([]);
  const [members, setMembers] = useState([]);
  const [treasury, setTreasury] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receiptId, setReceiptId] = useState(null);
  const [memberBalance, setMemberBalance] = useState(null);

  const [filters, setFilters] = useState({ type:'', category:'', user_id:'', date_from:'', date_to:'' });
  const [form, setForm] = useState({ user_ids:[], type:'credit', amount:'', description:'', category:'contribution', transaction_date: today, payment_method:'cash', expense_source:'treasury' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txRes, memRes] = await Promise.all([
        financeAPI.getTransactions({ ...filters, limit:50 }),
        membersAPI.getAll({ limit:100 })
      ]);
      setTransactions(txRes.data.transactions);
      setMembers(memRes.data.members);
      if (isAccountant || isAdmin) {
        const tRes = await financeAPI.getTreasury();
        setTreasury(tRes.data);
      }
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [filters]);
  useEffect(() => { membersAPI.getAll({ limit:100 }).then(r => setMembers(r.data.members||[])).catch(()=>{}); }, []);

  useEffect(() => {
    if (filters.user_id) {
      financeAPI.getBalance(filters.user_id)
        .then(r => setMemberBalance(r.data.financials))
        .catch(() => setMemberBalance(null));
    } else {
      setMemberBalance(null);
    }
  }, [filters.user_id]);


  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.user_ids.length) return toast.error('Select at least one member.');
    setSubmitting(true);
    
    const splitAmount = parseFloat(form.amount) / form.user_ids.length;

    try {
      const res = await financeAPI.addTransaction({ user_ids: form.user_ids, type: form.type, amount: splitAmount, description: form.description||undefined, category: form.category, transaction_date: form.transaction_date, payment_method: form.payment_method, expense_source: form.type==='debit' ? form.expense_source : undefined });
      toast.success(res.data.message);
      if (res.data.needs_approval) toast('Expense queued for approval ⏳', { icon: '⏳' });
      setModalOpen(false);
      setForm({ user_ids:[], type:'credit', amount:'', description:'', category:'contribution', transaction_date: today, payment_method:'cash', expense_source:'treasury' });
      fetchData();
    } catch(e) { toast.error(e.response?.data?.error||'Failed.'); }
    finally { setSubmitting(false); }
  };

  const handleExport = async () => {
    try {
      const res = await financeAPI.exportCSV({ date_from: filters.date_from, date_to: filters.date_to });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href=url; a.download='jamat_finance.csv';
      document.body.appendChild(a); a.click(); a.remove();
      toast.success('Downloaded!');
    } catch { toast.error('Export failed.'); }
  };

  const splitPreview = form.user_ids.length && form.amount
    ? (parseFloat(form.amount) / form.user_ids.length).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 })
    : null;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="page-title">💰 Finance</h1>
        <div className="flex gap-2">
          {(isAdmin||isAccountant) && <button onClick={handleExport} className="btn-secondary flex items-center gap-2"><HiDownload/> CSV</button>}
          {(isAdmin||isAccountant) && <button onClick={() => { setForm({ user_ids:[], type:'credit', amount:'', description:'', category:'contribution', transaction_date: today }); setModalOpen(true); }} className="btn-primary flex items-center gap-2"><HiPlus/> Add Transaction</button>}
        </div>
      </div>

      {/* Treasury */}
      {treasury && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card p-4 border-l-4 border-emerald-500"><p className="text-xs text-surface-400">Contributions</p><p className="text-xl font-bold text-emerald-400">₹{fmt(treasury.treasury?.total_contributions)}</p></div>
          <div className="glass-card p-4 border-l-4 border-red-500"><p className="text-xs text-surface-400">Expenses</p><p className="text-xl font-bold text-red-400">₹{fmt(treasury.treasury?.total_expenses)}</p></div>
          <div className="glass-card p-4 border-l-4 border-primary-500"><p className="text-xs text-surface-400">Treasury Balance</p><p className="text-xl font-bold text-primary-400">₹{fmt(treasury.treasury?.treasury_balance)}</p></div>
        </div>
      )}

      {/* Transactions */}
      <div className="space-y-4">
          <div className="glass-card p-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <select value={filters.type} onChange={e=>setFilters({...filters,type:e.target.value})} className="select-field text-sm"><option value="">All Types</option><option value="credit">Credit</option><option value="debit">Debit</option></select>
              <select value={filters.category} onChange={e=>setFilters({...filters,category:e.target.value})} className="select-field text-sm"><option value="">All Categories</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select>
              <select value={filters.user_id} onChange={e=>setFilters({...filters,user_id:e.target.value})} className="select-field text-sm"><option value="">All Members</option>{members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select>
              <input type="date" value={filters.date_from} onChange={e=>setFilters({...filters,date_from:e.target.value})} className="input-field text-sm"/>
              <input type="date" value={filters.date_to} onChange={e=>setFilters({...filters,date_to:e.target.value})} className="input-field text-sm"/>
            </div>
          </div>

          {memberBalance && (
            <div className={`glass-card p-4 border-l-4 ${Number(memberBalance.balance) >= 0 ? 'border-primary-500' : 'border-red-500'} flex items-center justify-between`}>
              <div>
                <p className="text-sm font-semibold text-surface-200">Selected Member Balance</p>
                <div className="flex gap-4 mt-1 text-xs">
                  <span className="text-emerald-400">Contributed: ₹{fmt(memberBalance.total_credit)}</span>
                  <span className="text-red-400">Expenses: ₹{fmt(memberBalance.total_debit)}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-surface-400 mb-0.5">Net Balance</p>
                <p className={`text-xl font-bold ${Number(memberBalance.balance) >= 0 ? 'text-primary-400' : 'text-red-400'}`}>
                  {Number(memberBalance.balance) >= 0 ? '+' : ''}₹{fmt(memberBalance.balance)}
                </p>
              </div>
            </div>
          )}

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-800/50"><tr>
                  <th className="table-header">Date</th><th className="table-header">Member</th><th className="table-header">Type</th><th className="table-header">Amount</th>
                  <th className="table-header hidden md:table-cell">Category</th><th className="table-header hidden lg:table-cell">Description</th>
                  {(isAdmin||isAccountant)&&<th className="table-header text-right">Del</th>}
                </tr></thead>
                <tbody>
                  {loading ? Array.from({length:4}).map((_,i)=><tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-5 skeleton"/></td></tr>)
                    : !transactions.length ? <tr><td colSpan={7} className="text-center py-12 text-surface-500">No transactions found</td></tr>
                    : transactions.map(t => (
                      <tr key={t.id} className="hover:bg-surface-800/30 transition-colors">
                        <td className="table-cell">{new Date(t.transaction_date).toLocaleDateString()}</td>
                        <td className="table-cell font-medium text-surface-200">{t.member_name}</td>
                        <td className="table-cell"><span className={t.type==='credit'?'badge-green':'badge-red'}>{t.type}</span></td>
                        <td className={`table-cell font-semibold ${t.type==='credit'?'text-emerald-400':'text-red-400'}`}>{t.type==='credit'?'+':'-'}₹{fmt(t.amount)}</td>
                        <td className="table-cell hidden md:table-cell capitalize">{t.category}</td>
                        <td className="table-cell hidden lg:table-cell text-surface-500">{t.description||'—'}</td>
                        {(isAdmin||isAccountant)&&<td className="table-cell text-right"><div className="flex items-center justify-end gap-1">{t.type==='credit'&&t.receipt_number&&<button onClick={()=>setReceiptId(t.id)} className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-emerald-400" title="View Receipt">🧾</button>}<button onClick={async()=>{if(confirm('Delete?')){await financeAPI.deleteTransaction(t.id);toast.success('Deleted.');fetchData();}}} className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-red-400"><HiTrash size={14}/></button></div></td>}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      

      {receiptId && <ReceiptModal transactionId={receiptId} onClose={()=>setReceiptId(null)} />}

      {/* Add Transaction Modal */}
      <Modal isOpen={modalOpen} onClose={()=>setModalOpen(false)} title="Add Transaction" size="lg">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-surface-300">Members * <span className="text-surface-500 font-normal text-xs">(one or more)</span></label>
              {form.user_ids.length > 0 && <button type="button" onClick={() => setForm({...form,user_ids:[]})} className="text-xs text-red-400 flex items-center gap-1"><HiX size={12}/> Clear</button>}
            </div>
            <MemberPicker members={members} selected={form.user_ids} onChange={ids=>setForm({...form,user_ids:ids})}/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-surface-300 mb-1">Type *</label>
              <select value={form.type} onChange={e=>setForm({...form,type:e.target.value,category:e.target.value==='credit'?'contribution':'food'})} className="select-field">
                <option value="credit">💰 Credit (Contribution)</option><option value="debit">💸 Debit (Expense)</option>
              </select>
            </div>
            <div><label className="block text-sm font-medium text-surface-300 mb-1">Total Amount (₹) *</label>
              <input type="number" step="0.01" min="0.01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} className="input-field" required placeholder="0.00"/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-surface-300 mb-1">Category</label>
              <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="select-field">{categories.map(c=><option key={c} value={c}>{c}</option>)}</select>
            </div>
            <div><label className="block text-sm font-medium text-surface-300 mb-1">Date</label>
              <input type="date" value={form.transaction_date} onChange={e=>setForm({...form,transaction_date:e.target.value})} className="input-field"/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-surface-300 mb-1">Payment Method</label>
              <select value={form.payment_method} onChange={e=>setForm({...form,payment_method:e.target.value})} className="select-field">{PAYMENT_METHODS.map(m=><option key={m} value={m} className="capitalize">{m}</option>)}</select>
            </div>
            {form.type==='debit' && <div><label className="block text-sm font-medium text-surface-300 mb-1">Expense Source</label>
              <select value={form.expense_source} onChange={e=>setForm({...form,expense_source:e.target.value})} className="select-field">
                <option value="treasury">🏦 From Treasury</option>
                <option value="member">👤 From Member Account</option>
              </select>
            </div>}
          </div>
          <div><label className="block text-sm font-medium text-surface-300 mb-1">Description</label>
            <input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="input-field" placeholder="Optional..."/>
          </div>
          {splitPreview && form.user_ids.length > 1 && (
            <div className={`p-4 rounded-xl border ${form.type==='credit'?'bg-emerald-500/10 border-emerald-500/30':'bg-red-500/10 border-red-500/30'}`}>
              <div className="flex justify-between text-sm"><span className="text-surface-400">Total: <strong className="text-surface-200">₹{parseFloat(form.amount||0).toLocaleString()}</strong></span><span className="text-surface-400">Members: <strong className="text-surface-200">{form.user_ids.length}</strong></span>
                <span className="text-surface-400">Each: <strong className={form.type==='credit'?'text-emerald-400':'text-red-400'}>₹{splitPreview}</strong></span>
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <button type="submit" disabled={submitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {submitting?<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:null}
              {submitting?'Saving...':form.user_ids.length>1?`Record ${form.user_ids.length} Transactions`:'Record Transaction'}
            </button>
            <button type="button" onClick={()=>setModalOpen(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Finance;
