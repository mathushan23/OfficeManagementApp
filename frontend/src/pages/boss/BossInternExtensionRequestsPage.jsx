import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Message } from '../../components/FormBits';

export default function BossInternExtensionRequestsPage({ onPendingCountChange }) {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [rows, setRows] = useState([]);
  const [processingId, setProcessingId] = useState(null);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const load = async (status = statusFilter) => {
    try {
      const data = await api.listInternExtensionRequests(status || '');
      const pendingCount = Number(data?.pending_count || 0);
      onPendingCountChange?.(pendingCount);
      setRows(Array.isArray(data?.rows) ? data.rows : []);
      setMessage('');
      setIsError(false);
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    }
  };

  useEffect(() => {
    load(statusFilter);
  }, [statusFilter]);

  const decide = async (id, status) => {
    let rejectionReason = '';
    if (status === 'rejected') {
      rejectionReason = window.prompt('Enter rejection reason') ?? '';
      if (!rejectionReason.trim()) {
        setIsError(true);
        setMessage('Rejection reason is required.');
        return;
      }
    }

    try {
      setProcessingId(id);
      await api.decideInternExtensionRequest(id, {
        status,
        rejection_reason: rejectionReason || undefined,
      });
      setIsError(false);
      setMessage(`Request ${status}.`);
      await load(statusFilter);
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <section className="card">
      <div className="row justify-between">
        <h3>Internship Extension Requests</h3>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="">All</option>
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Staff</th>
              <th>Office ID</th>
              <th>Current End Date</th>
              <th>Requested Days</th>
              <th>Requested End Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.staff?.name}</td>
                <td>{row.staff?.office_id}</td>
                <td>{row.current_intern_end_date}</td>
                <td>{row.requested_days}</td>
                <td>{row.requested_intern_end_date}</td>
                <td>{row.status}</td>
                <td>
                  {row.status === 'pending' ? (
                    <div className="row">
                      <button type="button" disabled={processingId === row.id} onClick={() => decide(row.id, 'approved')}>Approve</button>
                      <button type="button" className="danger" disabled={processingId === row.id} onClick={() => decide(row.id, 'rejected')}>Reject</button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">{row.rejection_reason || '-'}</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan="8" className="text-center text-slate-500">No internship extension requests.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Message message={message} error={isError} />
    </section>
  );
}
