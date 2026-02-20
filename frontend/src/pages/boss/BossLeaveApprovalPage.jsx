import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Message } from '../../components/FormBits';
import useAutoRefresh from '../../hooks/useAutoRefresh';

export default function BossLeaveApprovalPage({ token }) {
  const [rows, setRows] = useState([]);
  const [historyRows, setHistoryRows] = useState([]);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const load = async () => {
    try {
      const [pending, approved, rejected] = await Promise.all([
        api.listLeaveRequests(token, 'pending'),
        api.listLeaveRequests(token, 'approved'),
        api.listLeaveRequests(token, 'rejected'),
      ]);
      setRows(pending);
      setHistoryRows([...(approved ?? []), ...(rejected ?? [])].sort((a, b) => String(b.start_date).localeCompare(String(a.start_date))));
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

  const slotOrTime = (row) => {
    if (row.leave_type === 'half_day' && row.half_day_slot) return row.half_day_slot.replace('_', ' ');
    if (row.leave_type === 'short_leave' && row.short_start_time && row.short_end_time) return `${row.short_start_time} - ${row.short_end_time}`;
    return '-';
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
            <tr><th>ID</th><th>Staff</th><th>Type</th><th>Slot/Time</th><th>Start</th><th>Days</th><th>Action</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.staff?.name ?? '-'}</td>
                <td>{row.leave_type}</td>
                <td>{slotOrTime(row)}</td>
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

      <div className="mt-6 border-t border-slate-200 pt-4">
        <h4 className="mb-3 text-base font-semibold text-slate-800">Leave Request History</h4>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>ID</th><th>Staff</th><th>Type</th><th>Slot/Time</th><th>Start</th><th>Days</th><th>Status</th><th>Decision At</th></tr>
            </thead>
            <tbody>
              {historyRows.map((row) => (
                <tr key={`history-${row.id}`}>
                  <td>{row.id}</td>
                  <td>{row.staff?.name ?? '-'}</td>
                  <td>{row.leave_type}</td>
                  <td>{slotOrTime(row)}</td>
                  <td>{row.start_date}</td>
                  <td>{row.days_count}</td>
                  <td>{row.status}</td>
                  <td>{row.decision_at ?? '-'}</td>
                </tr>
              ))}
              {historyRows.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center text-slate-500">No leave request history.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Message message={message} error={isError} />
    </section>
  );
}
