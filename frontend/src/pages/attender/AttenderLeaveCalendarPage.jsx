import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { Message } from '../../components/FormBits';
import useAutoRefresh from '../../hooks/useAutoRefresh';

function toDate(value) {
  return new Date(`${value}T00:00:00`);
}

function formatKey(date) {
  return date.toISOString().slice(0, 10);
}

function leaveTypeBadgeClass(type) {
  if (type === 'full_day') return 'bg-rose-100 text-rose-800';
  if (type === 'half_day') return 'bg-amber-100 text-amber-800';
  if (type === 'short_leave') return 'bg-sky-100 text-sky-800';
  return 'bg-orange-100 text-orange-800';
}

function eachLeaveDate(leave, callback) {
  const start = toDate(leave.start_date);
  const cursor = new Date(start);
  const isSingleDay = leave.leave_type === 'half_day' || leave.leave_type === 'short_leave';
  const endExclusive = isSingleDay ? new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1) : toDate(leave.rejoin_date);

  while (cursor < endExclusive) {
    if (cursor.getDay() !== 0) {
      callback(cursor);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
}

export default function AttenderLeaveCalendarPage({ token }) {
  const [rows, setRows] = useState([]);
  const [monthCursor, setMonthCursor] = useState(new Date());
  const [message, setMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  const load = async () => {
    try {
      setRows(await api.leaveCalendar(token));
      setMessage('');
    } catch (err) {
      setMessage(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);
  useAutoRefresh(load, 30000, [token]);

  const markersByDate = useMemo(() => {
    const map = new Map();
    rows.forEach((leave) => {
      eachLeaveDate(leave, (date) => {
        const key = formatKey(date);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push({
          label: `${leave.staff?.name ?? 'Staff'} (${leave.leave_type})`,
          leave_type: leave.leave_type,
        });
      });
    });
    return map;
  }, [rows]);

  const detailsByDate = useMemo(() => {
    const map = new Map();
    rows.forEach((leave) => {
      eachLeaveDate(leave, (date) => {
        const key = formatKey(date);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push({
          staff_name: leave.staff?.name ?? 'Staff',
          leave_type: leave.leave_type,
          half_day_slot: leave.half_day_slot ?? null,
          short_start_time: leave.short_start_time ?? null,
          short_end_time: leave.short_end_time ?? null,
        });
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
  const selectedLeaves = selectedDate ? detailsByDate.get(selectedDate) ?? [] : [];

  return (
    <section className="card">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 text-xl text-white shadow-lg">
            {'\u{1F4C5}'}
          </div>
          <h3 className="text-xl font-bold text-slate-900">Leave Calendar</h3>
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

          return (
            <div
              key={key}
              onClick={() => setSelectedDate(key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setSelectedDate(key);
              }}
              role="button"
              tabIndex={0}
              className={inMonth ? 'min-h-24 rounded-xl border border-slate-200 bg-white p-1.5 sm:min-h-28 sm:p-2' : 'min-h-24 rounded-xl border border-slate-100 bg-slate-50 p-1.5 text-slate-400 sm:min-h-28 sm:p-2'}
            >
              <p className="text-xs font-semibold sm:text-sm">{day.getDate()}</p>
              <div className="mt-1 grid gap-1">
                {markers.map((item, idx) => (
                  <span key={`${key}-${idx}`} className={`rounded px-1.5 py-0.5 text-[10px] font-medium sm:px-2 sm:py-1 sm:text-[11px] ${leaveTypeBadgeClass(item.leave_type)}`}>
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setSelectedDate('')} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">Leaves on {selectedDate}</h4>
              <button type="button" className="ghost px-2 py-1 text-xs" onClick={() => setSelectedDate('')}>Close</button>
            </div>
            {selectedLeaves.length === 0 ? (
              <p className="text-sm text-slate-500">No leave on this date.</p>
            ) : (
              <div className="grid gap-2">
                {selectedLeaves.map((item, idx) => (
                  <div key={`${selectedDate}-${idx}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    <p className="font-semibold text-slate-800">{item.staff_name}</p>
                    <p className="text-slate-600">
                      {item.leave_type}
                      {item.leave_type === 'half_day' && item.half_day_slot ? ` (${item.half_day_slot.replace('_', ' ')})` : ''}
                      {item.leave_type === 'short_leave' && item.short_start_time && item.short_end_time ? ` (${item.short_start_time}-${item.short_end_time})` : ''}
                    </p>
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
