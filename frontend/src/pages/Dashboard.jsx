import { useState, useEffect } from 'react';
import { dashboardAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatsCard from '../components/StatsCard';
import { HiUsers, HiCurrencyRupee, HiClipboardCheck, HiCalendar, HiMap, HiSpeakerphone, HiExclamationCircle, HiCheckCircle, HiOutlineClock } from 'react-icons/hi';
import { MdAssignment, MdArrowForward } from 'react-icons/md';
import { Link } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

const Dashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await dashboardAPI.getData();
        setData(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  if (loading) return (
    <div className="space-y-6 animate-fade-in">
      <div className="h-10 w-64 skeleton" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-32 skeleton" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-80 skeleton" />
        <div className="h-80 skeleton" />
      </div>
    </div>
  );

  const d = data || {};

  const chartData = {
    labels: (d.expenseTrend || []).map(t => new Date(t.date).toLocaleDateString('en', { weekday: 'short', day: 'numeric' })),
    datasets: [
      { label: 'Expenses', data: (d.expenseTrend || []).map(t => t.expenses), backgroundColor: 'rgba(239, 68, 68, 0.5)', borderColor: '#ef4444', borderWidth: 2, borderRadius: 8 },
      { label: 'Income', data: (d.expenseTrend || []).map(t => t.income), backgroundColor: 'rgba(38, 153, 100, 0.5)', borderColor: '#269964', borderWidth: 2, borderRadius: 8 },
    ]
  };

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#94a3b8' } } },
    scales: {
      x: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } },
      y: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Assalamu Alaikum, {user?.name} 👋</h1>
          <p className="text-surface-400 mt-1">{new Date().toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <Link to="/finance" className="btn-primary flex items-center gap-2 px-6 shadow-lg shadow-primary-500/20">
          <HiCurrencyRupee /> Quick Finance Entry
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={<HiUsers />} label="Active Members" value={d.activeMembers || 0} color="primary" />
        <StatsCard icon={<HiClipboardCheck />} label="Today's Tasks" value={`${d.tasks?.completed || 0}/${d.tasks?.total || 0}`} subtext={`${d.tasks?.pending || 0} pending`} color="blue" />
        <StatsCard icon={<HiCurrencyRupee />} label="Today's Expenses" value={`₹${Number(d.finance?.today_debits || 0).toLocaleString()}`} color="amber" />
        <StatsCard icon={<HiCurrencyRupee />} label="Treasury Balance" value={`₹${Number(d.finance?.treasury_balance || 0).toLocaleString()}`} subtext={d.finance?.pending_approvals > 0 ? `${d.finance.pending_approvals} pending approvals` : 'All cleared'} color="emerald" />
      </div>

      {/* Charts & Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Expense Chart */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-surface-200 mb-4">📊 7-Day Financial Trend</h2>
            <div className="h-64">
              {d.expenseTrend?.length > 0 ? <Bar data={chartData} options={chartOptions} /> : <p className="text-surface-500 text-center mt-20">No data yet</p>}
            </div>
          </div>

          {/* Low Balance Alert */}
          {d.lowBalanceMembers?.length > 0 && (
            <div className="glass-card p-5 border border-red-500/30 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
              <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2"><HiExclamationCircle /> Low Member Balances</h3>
              <p className="text-xs text-surface-400 mb-3">These members have balances below ₹{d.lowBalanceThreshold}</p>
              <div className="space-y-2">
                {d.lowBalanceMembers.map((m, i) => (
                  <div key={i} className="flex items-center justify-between py-1 border-b border-surface-700/50 last:border-0">
                    <span className="text-sm text-surface-200">{m.name}</span>
                    <span className="text-sm font-bold text-red-400">₹{Number(m.balance||0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Planned Expenses */}
          {d.plannedExpenses?.length > 0 && (
            <div className="glass-card p-5 border border-amber-500/20 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
              <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2"><HiOutlineClock /> Upcoming Expenses</h3>
              <div className="space-y-3">
                {d.plannedExpenses.map((p, i) => (
                  <div key={i} className="flex justify-between items-center text-sm bg-surface-800/50 p-2.5 rounded-lg">
                    <div>
                      <span className="text-surface-200 font-medium block">{p.title}</span>
                      <span className="text-xs text-surface-500">{new Date(p.planned_date).toLocaleDateString()}</span>
                    </div>
                    <span className="font-bold text-amber-400">₹{Number(p.amount||0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Next Route */}
          {d.nextRoute && (
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-surface-400 mb-3 flex items-center gap-2"><HiMap /> Next Destination</h3>
              <p className="text-xl font-bold text-surface-100">{d.nextRoute.destination}</p>
              <p className="text-sm text-surface-400 mt-1">{new Date(d.nextRoute.date_from).toLocaleDateString()} {d.nextRoute.date_to ? `- ${new Date(d.nextRoute.date_to).toLocaleDateString()}` : ''}</p>
              {d.nextRoute.purpose && <p className="text-xs text-surface-500 mt-1">{d.nextRoute.purpose}</p>}
            </div>
          )}

          {/* Attendance */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-surface-400 mb-3 flex items-center gap-2"><HiCalendar /> Today's Attendance</h3>
            <div className="flex items-center gap-4">
              <div className="text-3xl font-bold text-surface-100">{d.attendance?.present || 0}</div>
              <div className="text-sm text-surface-500">present out of {d.activeMembers || 0} members<br/>{d.attendance?.marked || 0} marked</div>
            </div>
          </div>

          {/* Duties */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-surface-400 mb-3 flex items-center gap-2"><MdAssignment /> Today's Duties</h3>
            {(d.duties || []).length > 0 ? (
              <div className="space-y-2">
                {d.duties.map((duty, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-surface-300 capitalize">{duty.duty_type}</span>
                    <span className="text-surface-400">{duty.assigned_to_name}</span>
                    <span className={duty.status === 'completed' ? 'badge-green' : 'badge-yellow'}>{duty.status}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-surface-500">No duties assigned today</p>}
          </div>
        </div>
      </div>

      {/* Announcements */}
      {(d.announcements || []).length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-surface-200 mb-4 flex items-center gap-2"><HiSpeakerphone /> Recent Announcements</h2>
          <div className="space-y-3">
            {d.announcements.map((a, i) => (
              <div key={i} className="p-4 rounded-xl bg-surface-800/50 border border-surface-700/30">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-medium text-surface-200">{a.title}</h4>
                    <p className="text-sm text-surface-400 mt-1">{a.message}</p>
                  </div>
                  <span className={a.priority === 'urgent' ? 'badge-red' : a.priority === 'high' ? 'badge-yellow' : 'badge-gray'}>{a.priority}</span>
                </div>
                <p className="text-xs text-surface-600 mt-2">By {a.author} • {new Date(a.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
