import { useState, useEffect, useRef } from 'react';
import { financeAPI, mealsAPI, membersAPI, mealSplitAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { HiCheck, HiCheckCircle, HiCurrencyRupee, HiUsers, HiCalculator } from 'react-icons/hi';
import { MdSplitscreen } from 'react-icons/md';

const today = () => new Date().toISOString().split('T')[0];
const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MEAL_TYPES = ['suhoor','breakfast','lunch','dinner','snack'];
const MEAL_EMOJI = { suhoor:'🌙', breakfast:'🌅', lunch:'☀️', dinner:'🌃', snack:'🍎' };

// ── Daily Expenses Tab ───────────────────────────────────────────
export const DailyTab = () => {
  const [date, setDate] = useState(today());
  const [data, setData] = useState(null);
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [dr, mr] = await Promise.all([
          financeAPI.getDailyExpenses(date),
          mealsAPI.get(date)
        ]);
        setData(dr.data);
        setMeals(mr.data.meals || []);
      } catch { toast.error('Failed to load.'); }
      finally { setLoading(false); }
    };
    load();
  }, [date]);

  const s = data?.summary || {};
  const mealTotal = meals.reduce((a, m) => a + Number(m.estimated_cost || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field w-44" />
        <span className="text-surface-400 text-sm">{new Date(date).toLocaleDateString('en', { weekday:'long', day:'numeric', month:'long' })}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:'Credits', val:`₹${fmt(s.day_credits)}`, color:'emerald' },
          { label:'Debits', val:`₹${fmt(s.day_debits)}`, color:'red' },
          { label:'Net', val:`₹${fmt(Number(s.day_credits||0)-Number(s.day_debits||0))}`, color:'blue' },
          { label:'Meal Costs', val:`₹${fmt(mealTotal)}`, color:'amber' },
        ].map(c => (
          <div key={c.label} className={`glass-card p-4 border-l-4 border-${c.color}-500`}>
            <p className="text-xs text-surface-400">{c.label}</p>
            <p className={`text-lg font-bold text-${c.color}-400`}>{c.val}</p>
          </div>
        ))}
      </div>

      {meals.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="text-sm font-semibold text-surface-300 mb-3">🍽️ Meal Costs</h3>
          <div className="space-y-2">
            {meals.map(m => (
              <div key={m.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-surface-800/50">
                <span className="text-sm text-surface-300">{MEAL_EMOJI[m.meal_type]} <span className="capitalize">{m.meal_type}</span>{m.menu && <span className="text-surface-500 ml-2 text-xs">{m.menu}</span>}</span>
                <span className="text-sm font-semibold text-amber-400">{m.estimated_cost ? `₹${fmt(m.estimated_cost)}` : '—'}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t border-surface-700 font-bold text-sm">
              <span className="text-surface-300">Total Meal Cost</span>
              <span className="text-amber-300">₹{fmt(mealTotal)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-surface-700/50">
          <h3 className="text-sm font-semibold text-surface-300">📋 Transactions — {data?.transactions?.length || 0} entries</h3>
        </div>
        {loading ? <div className="p-6 text-center text-surface-500">Loading...</div> :
          !data?.transactions?.length ? <div className="p-8 text-center text-surface-500">No transactions on this date</div> :
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-800/50"><tr>
                <th className="table-header">Member</th>
                <th className="table-header">Type</th>
                <th className="table-header">Amount</th>
                <th className="table-header hidden md:table-cell">Category</th>
                <th className="table-header hidden lg:table-cell">Description</th>
              </tr></thead>
              <tbody>
                {data.transactions.map(t => (
                  <tr key={t.id} className="hover:bg-surface-800/30 transition-colors">
                    <td className="table-cell font-medium text-surface-200">{t.member_name}</td>
                    <td className="table-cell"><span className={t.type==='credit'?'badge-green':'badge-red'}>{t.type}</span></td>
                    <td className={`table-cell font-semibold ${t.type==='credit'?'text-emerald-400':'text-red-400'}`}>{t.type==='credit'?'+':'-'}₹{fmt(t.amount)}</td>
                    <td className="table-cell hidden md:table-cell capitalize">{t.category}</td>
                    <td className="table-cell hidden lg:table-cell text-surface-500">{t.description||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  );
};

// ── Member Checklist ─────────────────────────────────────────────
const CheckList = ({ members, selected, onChange }) => {
  const all = selected.length === members.length && members.length > 0;
  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="text-xs text-surface-400">Who consumed?</span>
        <button type="button" onClick={() => onChange(all ? [] : members.map(m => m.id))} className="text-xs text-primary-400">{all?'Deselect All':`Select All (${members.length})`}</button>
      </div>
      <div className="max-h-44 overflow-y-auto rounded-xl border border-surface-700 divide-y divide-surface-700/30">
        {members.map(m => {
          const on = selected.includes(m.id);
          return (
            <button key={m.id} type="button" onClick={() => onChange(on ? selected.filter(x=>x!==m.id) : [...selected, m.id])}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left ${on?'bg-primary-500/15':''}`}>
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${on?'bg-primary-500 border-primary-500':'border-surface-500'}`}>{on&&<HiCheck size={9} className="text-white"/>}</div>
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500/50 to-emerald-400/50 flex items-center justify-center text-xs font-bold text-white">{m.name.charAt(0)}</div>
              <span className={`text-sm ${on?'text-primary-300':'text-surface-200'}`}>{m.name}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-surface-500 mt-1">{selected.length} selected</p>
    </div>
  );
};

// ── Meal Split Tab ───────────────────────────────────────────────
export const MealSplitTab = () => {
  const { isAccountant } = useAuth();
  const [method, setMethod] = useState('by_day');
  const [date, setDate] = useState(today());
  const [mealType, setMealType] = useState('lunch');
  const [members, setMembers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [mealsOnDate, setMealsOnDate] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => { membersAPI.getAll({ limit:100, status:'active' }).then(r => setMembers(r.data.members||[])).catch(()=>{}); }, []);
  useEffect(() => {
    setResult(null); setDone(false);
    const mt = method==='by_meal_type' ? mealType : undefined;
    mealSplitAPI.getMeals(date, mt).then(r => setMealsOnDate(r.data.meals||[])).catch(()=>setMealsOnDate([]));
  }, [date, method, mealType]);

  const calculate = async () => {
    if (!selected.length) return toast.error('Select at least one consumer.');
    setLoading(true); setResult(null); setDone(false);
    try {
      const r = await mealSplitAPI.calculate({ method, date, consumer_ids: selected, ...(method==='by_meal_type'&&{meal_type:mealType}) });
      setResult(r.data);
    } catch(e) { toast.error(e.response?.data?.error||'Failed.'); }
    finally { setLoading(false); }
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const r = await mealSplitAPI.generate({ method, date, consumer_ids: selected, ...(method==='by_meal_type'&&{meal_type:mealType}) });
      toast.success(r.data.message); setDone(true);
    } catch(e) { toast.error(e.response?.data?.error||'Failed.'); }
    finally { setGenerating(false); }
  };

  const totalCost = mealsOnDate.reduce((a,m)=>a+Number(m.estimated_cost||0),0);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="glass-card p-4">
          <p className="text-sm font-semibold text-surface-300 mb-3">Split Method</p>
          <div className="grid grid-cols-2 gap-3">
            {[{v:'by_day',e:'📅',t:'By Day',d:'All meals on date ÷ consumers'},{v:'by_meal_type',e:'🍽️',t:'By Meal Type',d:'One meal type ÷ consumers'}].map(m=>(
              <button key={m.v} onClick={()=>{setMethod(m.v);setResult(null);setDone(false);}}
                className={`p-3 rounded-xl border-2 text-left transition-all ${method===m.v?'border-primary-500 bg-primary-500/15':'border-surface-700 hover:border-surface-500'}`}>
                <div className="text-xl mb-1">{m.e}</div>
                <p className={`text-sm font-medium ${method===m.v?'text-primary-300':'text-surface-200'}`}>{m.t}</p>
                <p className="text-xs text-surface-500 mt-0.5">{m.d}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card p-4 space-y-3">
          <div className={`grid gap-3 ${method==='by_meal_type'?'grid-cols-2':'grid-cols-1'}`}>
            <div><label className="text-xs text-surface-400 block mb-1">Date</label><input type="date" value={date} onChange={e=>{setDate(e.target.value);setResult(null);setDone(false);}} className="input-field"/></div>
            {method==='by_meal_type'&&<div><label className="text-xs text-surface-400 block mb-1">Meal Type</label><select value={mealType} onChange={e=>{setMealType(e.target.value);setResult(null);setDone(false);}} className="select-field">{MEAL_TYPES.map(t=><option key={t} value={t}>{MEAL_EMOJI[t]} {t}</option>)}</select></div>}
          </div>
          {mealsOnDate.length>0 ? (
            <div className="space-y-1.5">
              {mealsOnDate.map(m=>(
                <div key={m.id} className="flex justify-between px-3 py-2 rounded-lg bg-surface-800/50 text-sm">
                  <span className="text-surface-300">{MEAL_EMOJI[m.meal_type]} <span className="capitalize">{m.meal_type}</span>{m.menu&&<span className="text-surface-500 ml-2 text-xs">{m.menu}</span>}</span>
                  <span className="font-semibold text-amber-400">₹{fmt(m.estimated_cost)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-1.5 border-t border-surface-700 text-sm font-bold">
                <span className="text-surface-300">Total</span><span className="text-amber-300">₹{fmt(totalCost)}</span>
              </div>
            </div>
          ) : <p className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">No meals with cost found. Add estimated costs in Meals page first.</p>}
        </div>

        <div className="glass-card p-4"><CheckList members={members} selected={selected} onChange={setSelected}/></div>

        <button onClick={calculate} disabled={loading||!mealsOnDate.length||!selected.length}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50">
          {loading?<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<HiCalculator/>}
          {loading?'Calculating...':'Calculate Per-Person Share'}
        </button>
      </div>

      <div>
        {!result ? (
          <div className="glass-card p-12 flex flex-col items-center justify-center h-64 text-center">
            <div className="text-4xl mb-3">🧮</div>
            <p className="text-surface-400">Configure and calculate to see results</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="glass-card p-5">
              <h3 className="text-lg font-bold text-surface-100 mb-4">📊 Split Result</h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[{l:'Total Cost',v:`₹${fmt(result.totalCost)}`,c:'amber'},{l:'Consumers',v:result.numConsumers,c:'blue'},{l:'Per Person',v:`₹${fmt(result.perPerson)}`,c:'emerald'}].map(s=>(
                  <div key={s.l} className={`p-3 rounded-xl bg-${s.c}-500/10 border border-${s.c}-500/20 text-center`}>
                    <p className="text-xs text-surface-400 mb-1">{s.l}</p>
                    <p className={`text-lg font-bold text-${s.c}-400`}>{s.v}</p>
                  </div>
                ))}
              </div>
              <div className="p-3 rounded-xl bg-surface-800/60 text-center text-sm font-mono text-surface-300">
                ₹{fmt(result.totalCost)} ÷ {result.numConsumers} = <span className="text-emerald-400 font-bold">₹{fmt(result.perPerson)}</span> each
              </div>
            </div>

            <div className="glass-card overflow-hidden">
              <div className="p-3 border-b border-surface-700/50 text-sm font-semibold text-surface-200">Per-Person Breakdown</div>
              {result.consumers.map((c,i)=>(
                <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-surface-700/20">
                  <span className="text-xs text-surface-600 w-5">{i+1}</span>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500/50 to-emerald-400/50 flex items-center justify-center text-xs font-bold text-white">{c.name.charAt(0)}</div>
                  <span className="flex-1 text-sm text-surface-200">{c.name}</span>
                  <span className="text-sm font-bold text-red-400">-₹{fmt(c.share)}</span>
                </div>
              ))}
            </div>

            {isAccountant && !done && (
              <button onClick={generate} disabled={generating}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-600 to-emerald-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                {generating?<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<HiCurrencyRupee size={18}/>}
                {generating ? 'Creating...' : `Create ${result.numConsumers} Debit Transactions`}
              </button>
            )}
            {done && (
              <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-3">
                <HiCheckCircle className="text-emerald-400 text-xl"/>
                <p className="text-sm text-emerald-300 font-medium">Transactions created! ₹{fmt(result.perPerson)} per person recorded.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Balances Tab ─────────────────────────────────────────────────
export const BalancesTab = () => {
  const { user, isAdmin, isAccountant } = useAuth();
  const [balances, setBalances] = useState([]);
  const [myData, setMyData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (isAdmin || isAccountant) {
          const r = await financeAPI.getBalances();
          setBalances(r.data.members || []);
        }
        const r2 = await financeAPI.getBalance(user.id);
        setMyData(r2.data);
      } catch { toast.error('Failed to load balances.'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const f = myData?.financials;

  return (
    <div className="space-y-5">
      {/* My Balance Card */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-surface-400 mb-4 flex items-center gap-2"><HiCurrencyRupee/> My Balance</h3>
        {loading ? <div className="h-16 skeleton"/> : f ? (
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
              <p className="text-xs text-surface-400 mb-1">Total Contributed</p>
              <p className="text-xl font-bold text-emerald-400">₹{fmt(f.total_credit)}</p>
            </div>
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
              <p className="text-xs text-surface-400 mb-1">Total Expenses</p>
              <p className="text-xl font-bold text-red-400">₹{fmt(f.total_debit)}</p>
            </div>
            <div className={`p-4 rounded-xl text-center ${Number(f.balance)>=0?'bg-primary-500/10 border border-primary-500/20':'bg-red-500/10 border border-red-500/20'}`}>
              <p className="text-xs text-surface-400 mb-1">Balance</p>
              <p className={`text-xl font-bold ${Number(f.balance)>=0?'text-primary-400':'text-red-400'}`}>
                {Number(f.balance)>=0?'+':''}₹{fmt(f.balance)}
              </p>
            </div>
          </div>
        ) : <p className="text-surface-500">No transactions yet.</p>}
      </div>

      {/* All Members Balances (admin/accountant only) */}
      {(isAdmin || isAccountant) && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-surface-700/50 flex items-center gap-2">
            <HiUsers className="text-primary-400"/>
            <h3 className="font-semibold text-surface-200">All Members Balances</h3>
          </div>
          {loading ? (
            Array.from({length:4}).map((_,i)=><div key={i} className="px-4 py-3"><div className="h-6 skeleton"/></div>)
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-800/50"><tr>
                  <th className="table-header">Member</th>
                  <th className="table-header">Contributed</th>
                  <th className="table-header">Expenses</th>
                  <th className="table-header">Balance</th>
                  <th className="table-header hidden md:table-cell">Transactions</th>
                </tr></thead>
                <tbody>
                  {balances.map(m=>(
                    <tr key={m.id} className="hover:bg-surface-800/30 transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500/50 to-emerald-400/50 flex items-center justify-center text-xs font-bold text-white">{m.name.charAt(0)}</div>
                          <div><p className="text-sm font-medium text-surface-200">{m.name}</p><p className="text-xs text-surface-500 capitalize">{m.role?.replace('_',' ')}</p></div>
                        </div>
                      </td>
                      <td className="table-cell text-emerald-400 font-medium">₹{fmt(m.total_credit)}</td>
                      <td className="table-cell text-red-400 font-medium">₹{fmt(m.total_debit)}</td>
                      <td className="table-cell">
                        <span className={`font-bold ${Number(m.balance)>=0?'text-primary-400':'text-red-400'}`}>
                          {Number(m.balance)>=0?'+':''}₹{fmt(m.balance)}
                        </span>
                      </td>
                      <td className="table-cell hidden md:table-cell text-surface-500">{m.tx_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Approvals Tab ────────────────────────────────────────────────
export const ApprovalsTab = ({ onRefresh }) => {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  const load = async () => {
    setLoading(true);
    try { const r = await financeAPI.getApprovals(); setApprovals(r.data.approvals||[]); }
    catch { toast.error('Failed to load approvals.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const act = async (id, action) => {
    setProcessing(id);
    try {
      const r = await financeAPI.processApproval(id, { action });
      toast.success(r.data.message);
      load(); if (onRefresh) onRefresh();
    } catch(e) { toast.error(e.response?.data?.error||'Failed.'); }
    finally { setProcessing(null); }
  };

  if (loading) return <div className="p-8 text-center text-surface-500">Loading approvals...</div>;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="font-semibold text-surface-200">Pending Expense Approvals</h3>
        {approvals.length > 0 && <span className="px-2.5 py-1 rounded-full bg-amber-500 text-white text-xs font-bold">{approvals.length}</span>}
      </div>
      {!approvals.length ? (
        <div className="glass-card p-12 text-center"><div className="text-4xl mb-3">✅</div><p className="text-surface-400">No pending approvals</p></div>
      ) : approvals.map(a => (
        <div key={a.id} className="glass-card p-5 border-l-4 border-amber-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="badge-yellow">Pending Approval</span>
                <span className="text-xs text-surface-500">{new Date(a.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-surface-200 font-medium">{a.member_name} — <span className="text-red-400 font-bold">₹{fmt(a.amount)}</span></p>
              <p className="text-sm text-surface-400 mt-1">{a.description||'No description'} · <span className="capitalize">{a.category}</span> · by {a.requested_by_name}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => act(a.id,'approve')} disabled={processing===a.id} className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-sm font-medium">✓ Approve</button>
              <button onClick={() => act(a.id,'reject')} disabled={processing===a.id} className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 text-sm font-medium">✗ Reject</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Planned Expenses Tab ──────────────────────────────────────────
export const PlannedTab = () => {
  const [planned, setPlanned] = useState([]);
  const [form, setForm] = useState({ title:'', amount:'', planned_date:'', category:'other', notes:'' });
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const CATS = ['food','travel','stationery','medical','utility','other'];
  const load = () => financeAPI.getPlanned().then(r => setPlanned(r.data.planned||[])).catch(()=>{});
  useEffect(() => { load(); }, []);
  const submit = async (e) => {
    e.preventDefault(); setAdding(true);
    try { await financeAPI.addPlanned(form); toast.success('Added.'); setForm({ title:'', amount:'', planned_date:'', category:'other', notes:'' }); setShowForm(false); load(); }
    catch(e) { toast.error(e.response?.data?.error||'Failed.'); }
    finally { setAdding(false); }
  };
  const mark = async (id, status) => {
    try { await financeAPI.updatePlanned(id, { status }); load(); toast.success('Updated.'); } catch { toast.error('Failed.'); }
  };
  const total = planned.reduce((a,p)=>a+Number(p.amount||0),0);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h3 className="font-semibold text-surface-200">Upcoming Planned Expenses</h3><p className="text-xs text-surface-500">Total: <span className="text-amber-400 font-medium">₹{fmt(total)}</span></p></div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">+ Add Planned</button>
      </div>
      {showForm && (
        <form onSubmit={submit} className="glass-card p-5 space-y-3 border border-primary-500/20">
          <h4 className="text-sm font-semibold text-primary-300">New Planned Expense</h4>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-surface-400 block mb-1">Title *</label><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="input-field" required/></div>
            <div><label className="text-xs text-surface-400 block mb-1">Amount (₹) *</label><input type="number" min="1" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} className="input-field" required/></div>
            <div><label className="text-xs text-surface-400 block mb-1">Date *</label><input type="date" value={form.planned_date} onChange={e=>setForm({...form,planned_date:e.target.value})} className="input-field" required/></div>
            <div><label className="text-xs text-surface-400 block mb-1">Category</label><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="select-field">{CATS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
          </div>
          <input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className="input-field" placeholder="Notes (optional)"/>
          <div className="flex gap-2"><button type="submit" disabled={adding} className="btn-primary text-sm">{adding?'Adding...':'Add'}</button><button type="button" onClick={()=>setShowForm(false)} className="btn-secondary text-sm">Cancel</button></div>
        </form>
      )}
      {!planned.length ? <div className="glass-card p-10 text-center"><div className="text-4xl mb-3">📋</div><p className="text-surface-400">No planned expenses yet</p></div>
        : planned.map(p => (
          <div key={p.id} className="glass-card p-4 flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="font-medium text-surface-200">{p.title} <span className="badge-yellow capitalize text-xs ml-2">{p.category}</span></p>
              <div className="flex items-center gap-4 text-sm mt-1">
                <span className="text-amber-400 font-bold">₹{fmt(p.amount)}</span>
                <span className="text-surface-400">📅 {new Date(p.planned_date).toLocaleDateString()}</span>
              </div>
              {p.notes && <p className="text-xs text-surface-500 mt-1">{p.notes}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={()=>mark(p.id,'completed')} className="px-3 py-1.5 rounded-lg text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">Done</button>
              <button onClick={()=>mark(p.id,'cancelled')} className="px-3 py-1.5 rounded-lg text-xs bg-red-500/15 text-red-400 border border-red-500/20">Cancel</button>
            </div>
          </div>
        ))}
    </div>
  );
};

// ── Receipt Modal ─────────────────────────────────────────────────
export const ReceiptModal = ({ transactionId, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    financeAPI.getReceipt(transactionId).then(r=>setData(r.data)).catch(()=>toast.error('Receipt not found.')).finally(()=>setLoading(false));
  }, [transactionId]);
  const print = () => {
    const w = window.open('','_blank');
    w.document.write(`<html><head><title>Receipt</title><style>body{font-family:Arial;padding:30px;max-width:380px;margin:0 auto}.row{display:flex;justify-content:space-between;margin:8px 0;font-size:14px}.amt{font-size:28px;text-align:center;margin:20px 0;font-weight:bold;border:2px solid #333;padding:12px;border-radius:8px}.ft{text-align:center;margin-top:20px;font-size:11px;color:#888;border-top:1px dashed #ccc;padding-top:10px}h1{text-align:center}</style></head><body><h1>🕌 ${data?.jamat_name}</h1><h3 style="text-align:center;color:#555">Contribution Receipt</h3><div class="row"><span>Receipt No:</span><strong>${data?.receipt?.receipt_number}</strong></div><div class="row"><span>Date:</span><span>${new Date(data?.receipt?.transaction_date).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</span></div><div class="row"><span>Member:</span><strong>${data?.receipt?.member_name}</strong></div><div class="row"><span>Category:</span><span style="text-transform:capitalize">${data?.receipt?.category}</span></div><div class="row"><span>Payment:</span><span style="text-transform:capitalize">${data?.receipt?.payment_method||'cash'}</span></div><div class="amt">₹ ${Number(data?.receipt?.amount||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</div><div class="ft">Recorded by: ${data?.receipt?.created_by_name}<br/>Computer-generated receipt</div></body></html>`);
    w.document.close(); w.print();
  };
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="glass-card w-full max-w-sm p-6" onClick={e=>e.stopPropagation()}>
        {loading ? <div className="text-center py-8 text-surface-400">Loading...</div> : !data ? <div className="text-center py-8 text-red-400">Receipt not found</div> : (
          <>
            <div className="text-center mb-5"><div className="text-3xl mb-1">🕌</div><h3 className="text-lg font-bold text-surface-100">{data.jamat_name}</h3><p className="text-xs text-surface-500">Contribution Receipt</p></div>
            <div className="space-y-2 mb-4">
              {[['Receipt No', data.receipt.receipt_number||'—'],['Date', new Date(data.receipt.transaction_date).toLocaleDateString('en-IN')],['Member', data.receipt.member_name],['Payment', data.receipt.payment_method||'cash'],['Category', data.receipt.category],['Notes', data.receipt.description||'—']].map(([k,v])=>(
                <div key={k} className="flex justify-between py-1.5 border-b border-surface-700/30 text-sm">
                  <span className="text-surface-400">{k}</span><span className="text-surface-200 font-medium capitalize">{v}</span>
                </div>
              ))}
            </div>
            <div className="py-4 mb-4 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/30 text-center">
              <p className="text-xs text-surface-400 mb-1">Amount</p>
              <p className="text-3xl font-bold text-emerald-400">₹{Number(data.receipt.amount).toLocaleString('en-IN',{minimumFractionDigits:2})}</p>
            </div>
            <div className="flex gap-3"><button onClick={print} className="btn-primary flex-1">🖨️ Print Receipt</button><button onClick={onClose} className="btn-secondary">Close</button></div>
          </>
        )}
      </div>
    </div>
  );
};
