import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { Message } from '../../components/FormBits';

function formatKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function statusBadgeClass(status) {
  if (status === 'completed') return 'bg-emerald-100 text-emerald-800';
  if (status === 'submitted') return 'bg-sky-100 text-sky-800';
  if (status === 'rejected') return 'bg-rose-100 text-rose-800';
  return 'bg-amber-100 text-amber-800';
}

export default function ProjectDeadlineCalendarPage({ role = 'boss' }) {
  const [rows, setRows] = useState([]);
  const [monthCursor, setMonthCursor] = useState(new Date());
  const [message, setMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  const loadRows = async () => {
    try {
      let data = [];
      if (role === 'boss') {
        data = await api.listBossProjectAssignments();
      } else if (role === 'attender') {
        data = await api.listProjectAssignments();
      } else {
        data = await api.myProjectAssignments();
      }
      setRows(Array.isArray(data) ? data : []);
      setMessage('');
    } catch (err) {
      setMessage(err.message);
    }
  };

  useEffect(() => {
    loadRows();
  }, [role]);

  const markersByDate = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      const deadline = row?.deadline_at ? String(row.deadline_at).slice(0, 10) : '';
      if (!deadline) return;
      if (!map.has(deadline)) map.set(deadline, []);
      map.get(deadline).push({
        assignment_id: row.id,
        project_name: row.project?.name ?? 'Project',
        staff_name: row.staff?.name ?? 'Staff',
        deadline_at: row.deadline_at,
        status: row.status,
      });
    });
    return map;
  }, [rows]);

  const gridDays = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const first = new Date(year, month, 1);
    const startOffset = first.getDay();
    const start = new Date(year, month, 1 - startOffset);
    return Array.from({ length: 42 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      return day;
    });
  }, [monthCursor]);

  const monthLabel = monthCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const todayKey = formatKey(new Date());
  const selectedRows = selectedDate ? markersByDate.get(selectedDate) ?? [] : [];

  return (
    <section className="card">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 text-xl text-white shadow-lg">
            {'\u{1F4C5}'}
          </div>
          <h3 className="text-xl font-bold text-slate-900">Project Deadline Calendar</h3>
        </div>
        <div className="flex items-center gap-2">
          <button className="ghost" onClick={() => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>{'\u2190'} Prev</button>
          <p className="min-w-40 text-center font-bold text-slate-700">{monthLabel}</p>
          <button className="ghost" onClick={() => setMonthCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>Next {'\u2192'}</button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase text-slate-500">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1.5 sm:gap-2">
        {gridDays.map((day) => {
          const key = formatKey(day);
          const inMonth = day.getMonth() === monthCursor.getMonth();
          const markers = markersByDate.get(key) ?? [];
          const isToday = key === todayKey;
          const cellClass = inMonth
            ? 'min-h-24 rounded-xl border border-slate-200 bg-white p-1.5 sm:min-h-28 sm:p-2'
            : 'min-h-24 rounded-xl border border-slate-100 bg-slate-50 p-1.5 text-slate-400 sm:min-h-28 sm:p-2';
          const todayClass = isToday ? ' ring-2 ring-[#fd7e14] bg-orange-50/40' : '';

          return (
            <div
              key={key}
              onClick={() => setSelectedDate(key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setSelectedDate(key);
              }}
              role="button"
              tabIndex={0}
              className={`${cellClass}${todayClass}`}
            >
              <p className={`text-xs font-semibold sm:text-sm ${isToday ? 'text-orange-700' : ''}`}>{day.getDate()}</p>
              <div className="mt-1 grid gap-1">
                {markers.slice(0, 3).map((item, idx) => (
                  <span key={`${key}-${idx}`} className={`rounded px-1.5 py-0.5 text-[10px] font-medium sm:px-2 sm:py-1 sm:text-[11px] ${statusBadgeClass(item.status)}`}>
                    {item.project_name}
                  </span>
                ))}
                {markers.length > 3 && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 sm:px-2 sm:py-1 sm:text-[11px]">
                    +{markers.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setSelectedDate('')} />
          <div className="relative z-10 w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-base font-bold text-slate-900">Deadline Details - {selectedDate}</h4>
              <button
                type="button"
                aria-label="Close"
                className="grid !h-8 !w-8 place-items-center !rounded-full !border !border-slate-300 !bg-slate-100 !px-0 !py-0 !text-sm !font-bold !text-slate-700 !shadow-none transition hover:!bg-slate-200 before:!hidden hover:!transform-none active:!scale-100"
                onClick={() => setSelectedDate('')}
              >
                X
              </button>
            </div>
            {selectedRows.length === 0 ? (
              <p className="text-sm text-slate-500">No project deadlines on this date.</p>
            ) : (
              <div className="grid max-h-[55vh] gap-2 overflow-y-auto">
                {selectedRows.map((item, idx) => (
                  <div key={`${selectedDate}-${idx}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    <p className="font-semibold text-slate-800">{item.project_name}</p>
                    <p className="text-slate-600">Assignment #{item.assignment_id} | {item.staff_name}</p>
                    <p className="text-slate-600">{item.deadline_at ?? '-'}</p>
                    <span className={`mt-1 inline-flex rounded px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Message message={message} error />
    </section>
  );
}
