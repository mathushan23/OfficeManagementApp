export default function BirthdayWeeklyChart({ rows = [], title = 'This Week Birthdays', onHide }) {
  if (!rows.length) return null;

  const sorted = [...rows].sort((a, b) => Number(a.days_left) - Number(b.days_left));

  const widthFromDaysLeft = (daysLeft) => {
    const value = Number.isFinite(Number(daysLeft)) ? Number(daysLeft) : 7;
    const clamped = Math.min(7, Math.max(0, value));
    return `${Math.max(12, ((7 - clamped + 1) / 8) * 100)}%`;
  };

  return (
    <section className="card mb-5 border border-rose-200/70 bg-gradient-to-br from-rose-50 via-white to-orange-50">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-rose-600">Birthday Chart</p>
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        </div>
        <button
          type="button"
          className="rounded-md bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-300"
          onClick={onHide}
        >
          Hide
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sorted.map((row) => {
          const isToday = Boolean(row.is_today);
          const accent = isToday ? 'bg-rose-500' : 'bg-orange-500';
          return (
            <div key={row.staff_id} className="rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{row.name}</p>
                  <p className="truncate text-xs text-slate-500">{row.office_id} • {row.branch}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${accent}`}>
                  {isToday ? 'Today' : `In ${row.days_left}d`}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div className={`h-full ${accent}`} style={{ width: widthFromDaysLeft(row.days_left) }} />
              </div>
              <p className="mt-2 text-xs text-slate-600">Next: {row.next_birthday}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
