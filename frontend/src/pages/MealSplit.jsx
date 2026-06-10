import { useState, useEffect } from 'react';
import { mealSplitAPI, membersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  HiCalculator, HiCheck, HiUsers, HiCurrencyRupee,
  HiRefresh, HiInformationCircle, HiCheckCircle
} from 'react-icons/hi';
import { MdFoodBank, MdSplitscreen } from 'react-icons/md';

const MEAL_TYPES = ['suhoor', 'breakfast', 'lunch', 'dinner', 'snack'];
const TYPE_EMOJI = { suhoor: '🌙', breakfast: '🌅', lunch: '☀️', dinner: '🌃', snack: '🍎' };

// ── Member Checkbox List ─────────────────────────────────────────
const MemberCheckList = ({ members, selected, onChange, label }) => {
  const allSelected = members.length > 0 && selected.length === members.length;

  const toggle = (id) =>
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);

  const toggleAll = () =>
    onChange(allSelected ? [] : members.map(m => m.id));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-surface-300">{label}</label>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
        >
          <HiCheckCircle size={14} />
          {allSelected ? 'Deselect All' : `Select All (${members.length})`}
        </button>
      </div>
      <div className="max-h-52 overflow-y-auto rounded-xl border border-surface-700 divide-y divide-surface-700/50">
        {members.length === 0 ? (
          <p className="text-sm text-surface-500 text-center py-6">No members found</p>
        ) : (
          members.map(m => {
            const isChecked = selected.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggle(m.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  isChecked ? 'bg-primary-500/15' : 'hover:bg-surface-800/60'
                }`}
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                  isChecked ? 'bg-primary-500 border-primary-500' : 'border-surface-500'
                }`}>
                  {isChecked && <HiCheck size={10} className="text-white" />}
                </div>
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500/50 to-emerald-400/50 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {m.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isChecked ? 'text-primary-300' : 'text-surface-200'}`}>
                    {m.name}
                  </p>
                  <p className="text-xs text-surface-500 capitalize">{m.role?.replace('_', ' ')}</p>
                </div>
              </button>
            );
          })
        )}
      </div>
      <p className="text-xs text-surface-500 mt-1.5">{selected.length} member{selected.length !== 1 ? 's' : ''} selected</p>
    </div>
  );
};

// ── Main Page ────────────────────────────────────────────────────
const MealSplit = () => {
  const { isAccountant } = useAuth();

  const today = new Date().toISOString().split('T')[0];
  const [method, setMethod] = useState('by_day');
  const [date, setDate] = useState(today);
  const [mealType, setMealType] = useState('lunch');
  const [members, setMembers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [mealsOnDate, setMealsOnDate] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [description, setDescription] = useState('');

  // Load members once
  useEffect(() => {
    membersAPI.getAll({ limit: 100, status: 'active' }).then(r => {
      setMembers(r.data.members || []);
    }).catch(console.error);
  }, []);

  // Load meals for chosen date (preview)
  useEffect(() => {
    if (!date) return;
    setResult(null);
    setGenerated(false);
    const mt = method === 'by_meal_type' ? mealType : undefined;
    mealSplitAPI.getMeals(date, mt).then(r => {
      setMealsOnDate(r.data.meals || []);
    }).catch(() => setMealsOnDate([]));
  }, [date, method, mealType]);

  const handleCalculate = async () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one consumer.');
      return;
    }
    setLoading(true);
    setResult(null);
    setGenerated(false);
    try {
      const payload = {
        method,
        date,
        consumer_ids: selectedIds,
        ...(method === 'by_meal_type' && { meal_type: mealType }),
      };
      const res = await mealSplitAPI.calculate(payload);
      setResult(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Calculation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!result) return;
    setGenerating(true);
    try {
      const payload = {
        method,
        date,
        consumer_ids: selectedIds,
        description,
        ...(method === 'by_meal_type' && { meal_type: mealType }),
      };
      const res = await mealSplitAPI.generate(payload);
      toast.success(res.data.message);
      setGenerated(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate transactions.');
    } finally {
      setGenerating(false);
    }
  };

  const totalCostOfShown = mealsOnDate.reduce((s, m) => s + Number(m.estimated_cost || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="page-title flex items-center gap-3">
          <MdSplitscreen className="text-primary-400" /> Meal Cost Splitting
        </h1>
        <p className="text-surface-400 mt-1">
          Auto-calculate & record per-person meal expenses from your meal plan.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ── Left: Configuration ── */}
        <div className="space-y-5">

          {/* Method Selection */}
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-surface-300 mb-3 flex items-center gap-2">
              <HiCalculator /> Split Method
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => { setMethod('by_day'); setResult(null); setGenerated(false); }}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  method === 'by_day'
                    ? 'border-primary-500 bg-primary-500/15'
                    : 'border-surface-700 hover:border-surface-500'
                }`}
              >
                <div className="text-2xl mb-1">📅</div>
                <p className={`font-semibold text-sm ${method === 'by_day' ? 'text-primary-300' : 'text-surface-200'}`}>
                  By Day
                </p>
                <p className="text-xs text-surface-500 mt-1 leading-relaxed">
                  Total cost of ALL meals on selected date ÷ number of consumers
                </p>
              </button>

              <button
                onClick={() => { setMethod('by_meal_type'); setResult(null); setGenerated(false); }}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  method === 'by_meal_type'
                    ? 'border-primary-500 bg-primary-500/15'
                    : 'border-surface-700 hover:border-surface-500'
                }`}
              >
                <div className="text-2xl mb-1">🍽️</div>
                <p className={`font-semibold text-sm ${method === 'by_meal_type' ? 'text-primary-300' : 'text-surface-200'}`}>
                  By Meal Type
                </p>
                <p className="text-xs text-surface-500 mt-1 leading-relaxed">
                  Cost of ONE meal type (e.g. lunch) ÷ who ate that meal
                </p>
              </button>
            </div>
          </div>

          {/* Date & Meal Type */}
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-surface-300 mb-3 flex items-center gap-2">
              <MdFoodBank /> Select Date & Meal
            </h2>
            <div className={`grid gap-4 ${method === 'by_meal_type' ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <div>
                <label className="block text-xs text-surface-400 mb-1.5">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => { setDate(e.target.value); setResult(null); setGenerated(false); }}
                  className="input-field"
                />
              </div>
              {method === 'by_meal_type' && (
                <div>
                  <label className="block text-xs text-surface-400 mb-1.5">Meal Type</label>
                  <select
                    value={mealType}
                    onChange={e => { setMealType(e.target.value); setResult(null); setGenerated(false); }}
                    className="select-field"
                  >
                    {MEAL_TYPES.map(t => (
                      <option key={t} value={t}>{TYPE_EMOJI[t]} {t}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Meals preview for selected date */}
            {mealsOnDate.length > 0 ? (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-surface-400 font-medium">
                  Meals with cost on {new Date(date).toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'short' })}:
                </p>
                {mealsOnDate.map((m, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-800/60">
                    <span className="text-sm text-surface-300">
                      {TYPE_EMOJI[m.meal_type]} <span className="capitalize">{m.meal_type}</span>
                      {m.menu && <span className="text-surface-500 ml-1">— {m.menu}</span>}
                    </span>
                    <span className="text-sm font-semibold text-amber-400">₹{Number(m.estimated_cost).toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-1 border-t border-surface-700 text-sm font-bold">
                  <span className="text-surface-300">Total Cost</span>
                  <span className="text-amber-300">₹{totalCostOfShown.toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-2">
                <HiInformationCircle className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300">
                  No meals with estimated cost found for this date/type.
                  Go to <strong>Meals</strong> page and add estimated costs first.
                </p>
              </div>
            )}
          </div>

          {/* Consumer Selection */}
          <div className="glass-card p-5">
            <MemberCheckList
              members={members}
              selected={selectedIds}
              onChange={setSelectedIds}
              label={`🧑‍🤝‍🧑 Who consumed ${method === 'by_meal_type' ? mealType : 'meals on this day'}?`}
            />
          </div>

          {/* Description */}
          <div className="glass-card p-5">
            <label className="block text-xs text-surface-400 mb-1.5">Transaction Description (optional)</label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={method === 'by_meal_type' ? `Meal split - ${mealType} on ${date}` : `Meal split - all meals on ${date}`}
              className="input-field text-sm"
            />
          </div>

          {/* Calculate Button */}
          <button
            onClick={handleCalculate}
            disabled={loading || mealsOnDate.length === 0 || selectedIds.length === 0}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <HiCalculator size={20} />
            }
            {loading ? 'Calculating...' : 'Calculate Per-Person Share'}
          </button>
        </div>

        {/* ── Right: Result ── */}
        <div className="space-y-5">
          {!result && !loading && (
            <div className="glass-card p-10 flex flex-col items-center justify-center text-center h-64">
              <div className="text-5xl mb-4">🧮</div>
              <p className="text-surface-400 font-medium">Configure and calculate to see results</p>
              <p className="text-surface-600 text-sm mt-1">Select a method, date, and consumers, then click Calculate</p>
            </div>
          )}

          {result && (
            <>
              {/* Summary Card */}
              <div className="glass-card p-6">
                <h2 className="text-lg font-bold text-surface-100 mb-4 flex items-center gap-2">
                  📊 Split Result
                </h2>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                    <p className="text-xs text-surface-400 mb-1">Total Cost</p>
                    <p className="text-xl font-bold text-amber-400">₹{Number(result.totalCost).toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                    <p className="text-xs text-surface-400 mb-1">Consumers</p>
                    <p className="text-xl font-bold text-blue-400">{result.numConsumers}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <p className="text-xs text-surface-400 mb-1">Per Person</p>
                    <p className="text-xl font-bold text-emerald-400">₹{Number(result.perPerson).toLocaleString()}</p>
                  </div>
                </div>

                {/* Formula display */}
                <div className="p-3 rounded-xl bg-surface-800/60 border border-surface-700/50 text-center mb-4">
                  <p className="text-xs text-surface-500">Formula</p>
                  <p className="text-sm font-mono text-surface-300 mt-1">
                    ₹{Number(result.totalCost).toLocaleString()}
                    <span className="text-surface-500 mx-2">÷</span>
                    {result.numConsumers} persons
                    <span className="text-surface-500 mx-2">=</span>
                    <span className="text-emerald-400 font-bold">₹{Number(result.perPerson).toLocaleString()}</span>
                    <span className="text-surface-500 ml-1">each</span>
                  </p>
                </div>

                {/* Method badge */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge-blue capitalize">{result.method.replace('_', ' ')}</span>
                  <span className="text-xs text-surface-500">— {result.label}</span>
                </div>
              </div>

              {/* Per-person table */}
              <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-surface-700/50">
                  <h3 className="font-semibold text-surface-200 flex items-center gap-2">
                    <HiUsers /> Per-Person Breakdown
                  </h3>
                </div>
                <div className="divide-y divide-surface-700/30">
                  {result.consumers.map((c, i) => (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="text-xs text-surface-600 w-5 text-center">{i + 1}</span>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500/50 to-emerald-400/50 flex items-center justify-center text-xs font-bold text-white">
                        {c.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-surface-200">{c.name}</p>
                        <p className="text-xs text-surface-500 capitalize">{c.role?.replace('_', ' ')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-400">-₹{Number(c.share).toLocaleString()}</p>
                        <p className="text-xs text-surface-500">debit</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-surface-800/40 flex justify-between items-center">
                  <span className="text-sm text-surface-400">Total debited</span>
                  <span className="text-sm font-bold text-red-400">
                    ₹{(result.perPerson * result.numConsumers).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Generate Button */}
              {isAccountant && !generated && (
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-600 to-emerald-500 text-white font-semibold flex items-center justify-center gap-2 hover:from-primary-500 hover:to-emerald-400 transition-all disabled:opacity-50"
                >
                  {generating
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <HiCurrencyRupee size={20} />
                  }
                  {generating
                    ? 'Generating...'
                    : `Create ${result.numConsumers} Debit Transaction${result.numConsumers > 1 ? 's' : ''}`
                  }
                </button>
              )}

              {generated && (
                <div className="p-5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-3">
                  <HiCheckCircle className="text-emerald-400 text-2xl shrink-0" />
                  <div>
                    <p className="font-semibold text-emerald-300">Transactions Created!</p>
                    <p className="text-sm text-emerald-400/80 mt-0.5">
                      ₹{result.perPerson} debit recorded for each of the {result.numConsumers} members. View them in the Finance page.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MealSplit;
