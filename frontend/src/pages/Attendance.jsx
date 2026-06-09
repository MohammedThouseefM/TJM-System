import { useState, useEffect } from 'react';
import { attendanceAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { HiCheck, HiX, HiClock } from 'react-icons/hi';

const Attendance = () => {
  const { isAdmin } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [unmarked, setUnmarked] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState({});

  const fetch = async () => {
    try { setLoading(true);
      const res = await attendanceAPI.get(date);
      setAttendance(res.data.attendance); setUnmarked(res.data.unmarked); setSummary(res.data.summary);
      const r = {};
      res.data.attendance.forEach(a => { r[a.user_id] = a.status; });
      setRecords(r);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, [date]);

  const markStatus = (userId, status) => setRecords(p => ({ ...p, [userId]: status }));

  const saveAttendance = async () => {
    const recs = Object.entries(records).map(([user_id, status]) => ({ user_id: parseInt(user_id), status }));
    if (recs.length === 0) return toast.error('No records to save.');
    try { await attendanceAPI.mark({ records: recs, date }); toast.success('Attendance saved!'); fetch(); }
    catch (err) { toast.error('Failed to save.'); }
  };

  const allMembers = [...attendance.map(a => ({ id: a.user_id, name: a.member_name })), ...unmarked];
  const statusOpts = ['present', 'absent', 'leave', 'excused'];
  const statusColors = { present: 'bg-emerald-500', absent: 'bg-red-500', leave: 'bg-amber-500', excused: 'bg-blue-500' };
  const presentCount = Object.values(records).filter(s => s === 'present').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="page-title">Attendance</h1><p className="text-surface-400 mt-1">{presentCount} present of {allMembers.length}</p></div>
        <div className="flex gap-3">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field w-44" />
          {isAdmin && <button onClick={saveAttendance} className="btn-primary">Save Attendance</button>}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="flex gap-3 flex-wrap">
        {summary.map((s, i) => (
          <div key={i} className={`px-4 py-2 rounded-xl text-sm font-medium ${s.status === 'present' ? 'bg-emerald-500/20 text-emerald-400' : s.status === 'absent' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
            {s.status}: {s.count}
          </div>
        ))}
      </div>

      {/* Member List */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-800/50">
              <tr>
                <th className="table-header">Member</th>
                <th className="table-header">Status</th>
                {isAdmin && <th className="table-header">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? [1,2,3,4].map(i => <tr key={i}><td colSpan={3} className="px-4 py-4"><div className="h-8 skeleton" /></td></tr>) :
                allMembers.length === 0 ? <tr><td colSpan={3} className="text-center py-12 text-surface-500">No members</td></tr> :
                allMembers.map(m => (
                  <tr key={m.id} className="hover:bg-surface-800/30 transition-colors">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${statusColors[records[m.id]] || 'bg-surface-600'}`} />
                        <span className="font-medium text-surface-200">{m.name}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={records[m.id] === 'present' ? 'badge-green' : records[m.id] === 'absent' ? 'badge-red' : records[m.id] ? 'badge-yellow' : 'badge-gray'}>
                        {records[m.id] || 'not marked'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="table-cell">
                        <div className="flex gap-1.5">
                          {statusOpts.map(s => (
                            <button key={s} onClick={() => markStatus(m.id, s)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${records[m.id] === s ? `${statusColors[s]} text-white` : 'bg-surface-700 text-surface-400 hover:bg-surface-600'}`}>
                              {s.charAt(0).toUpperCase() + s.slice(1,3)}
                            </button>
                          ))}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default Attendance;
