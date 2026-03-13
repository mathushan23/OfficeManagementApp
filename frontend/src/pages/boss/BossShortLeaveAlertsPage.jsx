import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Message } from '../../components/FormBits';

export default function BossShortLeaveAlertsPage({ token }) {
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      const data = await api.shortLeaveAlerts(token);
      setRows(data);
      setMessage(`Short leave alerts today: ${data.length}`);
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-xl text-white shadow-lg">
            ⚠️
          </div>
          <h3 className="text-xl font-bold text-slate-900">Short Leave Alerts</h3>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>Staff</th><th>Office ID</th><th>Date</th><th>Status</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.staff?.name ?? '-'}</td>
                <td>{row.staff?.office_id ?? '-'}</td>
                <td>{row.start_date}</td>
                <td>{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Message message={message} error={message && message.includes('failed')} />
    </section>
  );
}

