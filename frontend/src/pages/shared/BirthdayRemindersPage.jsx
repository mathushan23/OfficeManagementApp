import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Message } from '../../components/FormBits';

export default function BirthdayRemindersPage({ token, title = 'Birthday Reminders' }) {
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const load = async () => {
    try {
      const data = await api.birthdayReminders(token);
      setRows(data);
      setMessage('');
      setIsError(false);
    } catch (err) {
      setMessage(err.message);
      setIsError(true);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="card">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-xl text-white shadow-lg">
            {'\u{1F382}'}
          </div>
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        </div>
        <button onClick={load} className="ghost">Refresh</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>Name</th><th>Office ID</th><th>Branch</th><th>Date of Birth</th><th>Next Birthday</th><th>Reminder</th><th>Action</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.staff_id}>
                <td>{row.staff_id}</td>
                <td>{row.name}</td>
                <td>{row.office_id}</td>
                <td>{row.branch}</td>
                <td>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                    {row.date_of_birth}
                  </span>
                </td>
                <td>
                  {row.is_today ? (
                    <span className="rounded-full bg-pink-100 px-2 py-1 text-xs font-bold text-pink-700 ring-1 ring-pink-300">
                      {row.next_birthday}
                    </span>
                  ) : (
                    <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-300">
                      {row.next_birthday}
                    </span>
                  )}
                </td>
                <td>
                  {row.is_today ? (
                    <span className="rounded bg-pink-100 px-2 py-1 text-xs font-semibold text-pink-700">Today</span>
                  ) : (
                    <span className="rounded bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">
                      In {row.days_left} day{Number(row.days_left) === 1 ? '' : 's'}
                    </span>
                  )}
                </td>
                <td>
                  {row.is_today ? (
                    row.auto_wish_ready ? (
                      <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                        Auto Wish Ready
                      </span>
                    ) : (
                      <span className="rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                        Auto Wish Pending
                      </span>
                    )
                  ) : (
                    <span className="text-xs text-slate-400">-</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan="8" className="text-center text-slate-500">No birthdays in the next 7 days.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Message message={message} error={isError} />
    </section>
  );
}


