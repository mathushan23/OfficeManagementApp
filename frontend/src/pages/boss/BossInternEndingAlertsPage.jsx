import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Message } from '../../components/FormBits';

export default function BossInternEndingAlertsPage({ token }) {
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      const data = await api.internEndingAlerts(token);
      setRows(data);
      setMessage(`Intern ending alerts (next 7 days): ${data.length}`);
    } catch (err) {
      setMessage(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="card">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 text-xl text-white shadow-lg">
            {'\u23F0'}
          </div>
          <h3 className="text-xl font-bold text-slate-900">Intern Period Ending Alerts</h3>
        </div>
        <button onClick={load} className="ghost">Refresh</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>Name</th><th>Office ID</th><th>Branch</th><th>Effective End Date</th><th>Days Left</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.staff_id}>
                <td>{row.staff_id}</td>
                <td>{row.name}</td>
                <td>{row.office_id}</td>
                <td>{row.branch}</td>
                <td>{row.effective_intern_end_date}</td>
                <td>{row.days_left}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center text-slate-500">No intern period ending within next 7 days.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Message message={message} error={message && message.includes('failed')} />
    </section>
  );
}


