import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Message } from '../../components/FormBits';

export default function AttenderLatePermissionPage({ token }) {
  const [rows, setRows] = useState([]);
  const [historyRows, setHistoryRows] = useState([]);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const load = async () => {
    try {
      const [pending, approved, rejected] = await Promise.all([
        api.listLateTaskLogRequests(token, 'pending'),
        api.listLateTaskLogRequests(token, 'approved'),
        api.listLateTaskLogRequests(token, 'rejected'),
      ]);
      setRows(pending);
      setHistoryRows([...(approved ?? []), ...(rejected ?? [])].sort((a, b) => String(b.requested_at).localeCompare(String(a.requested_at))));
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

  const decide = async (requestId, status) => {
    const ok = window.confirm(`Are you sure you want to ${status} late tasklog request #${requestId}?`);
    if (!ok) return;
    try {
      setProcessingId(requestId);
      await api.decideLateTaskLogRequest(token, requestId, status);
      setIsError(false);
      setMessage(`Request ${requestId} ${status}.`);
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-xl text-white shadow-lg">
            ⏰
          </div>
          <h3 className="text-xl font-bold text-slate-900">Late Tasklog Approvals</h3>
        </div>
        <button onClick={load} className="ghost">🔄 Refresh</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Staff</th><th>Office ID</th><th>Missed Date</th><th>In</th><th>Out</th><th>Requested At</th><th>Action</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.staff_name}</td>
                <td>{row.office_id}</td>
                <td>{row.log_date}</td>
                <td>{row.in_time ?? '-'}</td>
                <td>{row.out_time ?? '-'}</td>
                <td>{row.requested_at ?? '-'}</td>
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
            {rows.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center text-slate-500">No pending late tasklog requests.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 border-t border-slate-200 pt-4">
        <h4 className="mb-3 text-base font-semibold text-slate-800">Late Tasklog Request History</h4>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Staff</th><th>Office ID</th><th>Missed Date</th><th>Status</th><th>Requested At</th><th>Decided At</th><th>Decided By</th></tr>
            </thead>
            <tbody>
              {historyRows.map((row) => (
                <tr key={`history-${row.id}`}>
                  <td>{row.staff_name}</td>
                  <td>{row.office_id}</td>
                  <td>{row.log_date}</td>
                  <td>{row.status}</td>
                  <td>{row.requested_at ?? '-'}</td>
                  <td>{row.decision_at ?? '-'}</td>
                  <td>{row.approved_by_name ?? '-'}</td>
                </tr>
              ))}
              {historyRows.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center text-slate-500">No late tasklog history.</td>
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

