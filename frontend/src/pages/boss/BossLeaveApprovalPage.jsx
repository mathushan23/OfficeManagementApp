import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Message } from '../../components/FormBits';
import useAutoRefresh from '../../hooks/useAutoRefresh';

export default function BossLeaveApprovalPage({ token }) {
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const load = async () => {
    try {
      setRows(await api.listLeaveRequests(token, 'pending'));
      setIsError(false);
      setMessage('');
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);
  useAutoRefresh(load, 30000, [token]);

  const decide = async (id, status) => {
    const ok = window.confirm(`Are you sure you want to ${status} leave request #${id}?`);
    if (!ok) return;
    try {
      setProcessingId(id);
      await api.decideLeave(token, id, status);
      setIsError(false);
      setMessage(`Leave ${id} ${status}.`);
      load();
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <section className="card">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-xl text-white shadow-lg">
            📋
          </div>
          <h3 className="text-xl font-bold text-slate-900">Leave Request Approvals</h3>
        </div>
        <button onClick={load} className="ghost">🔄 Refresh</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>Staff</th><th>Type</th><th>Start</th><th>Days</th><th>Action</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.staff?.name ?? '-'}</td>
                <td>{row.leave_type}</td>
                <td>{row.start_date}</td>
                <td>{row.days_count}</td>
                <td className="row">
                  <button disabled={processingId === row.id} onClick={() => decide(row.id, 'approved')}>
                    {processingId === row.id ? 'Please wait...' : 'Approve'}
                  </button>
                  <button className="danger" disabled={processingId === row.id} onClick={() => decide(row.id, 'rejected')}>
                    {processingId === row.id ? 'Please wait...' : 'Reject'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Message message={message} error={isError} />
    </section>
  );
}
