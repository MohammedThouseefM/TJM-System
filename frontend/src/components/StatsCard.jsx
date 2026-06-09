const StatsCard = ({ icon, label, value, subtext, color = 'primary', trend }) => {
  const colors = {
    primary: 'from-primary-500/20 to-primary-600/10 border-primary-500/30 text-primary-400',
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400',
    red: 'from-red-500/20 to-red-600/10 border-red-500/30 text-red-400',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400',
  };

  return (
    <div className={`glass-card-hover p-5 bg-gradient-to-br ${colors[color]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-surface-400 font-medium mb-1">{label}</p>
          <p className="text-2xl md:text-3xl font-bold text-surface-100">{value}</p>
          {subtext && <p className="text-xs text-surface-500 mt-1">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${colors[color]} text-2xl`}>
          {icon}
        </div>
      </div>
      {trend && (
        <div className={`mt-3 text-xs font-medium ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from yesterday
        </div>
      )}
    </div>
  );
};

export default StatsCard;
