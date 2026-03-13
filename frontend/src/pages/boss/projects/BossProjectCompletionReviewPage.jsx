import { useEffect, useState } from 'react';
import { api, resolveImageUrl } from '../../../api';
import { Message } from '../../../components/FormBits';

export default function BossProjectCompletionReviewPage() {
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const loadRows = async (status = statusFilter) => {
    try {
      const data = await api.listProjectSubmissions(status || '');
      setRows(Array.isArray(data) ? data : []);
      setError(false);
      setMessage('');
    } catch (err) {
      setError(true);
      setMessage(err.message);
    }
  };

  useEffect(() => {
    loadRows(statusFilter);
  }, [statusFilter]);

  const decide = async (submissionId, approvalStatus) => {
    let rejectionReason = '';
    if (approvalStatus === 'rejected') {
      rejectionReason = window.prompt('Enter rejection reason') ?? '';
      if (!rejectionReason.trim()) {
        setError(true);
        setMessage('Rejection reason is required');
        return;
      }
    }

    try {
      setProcessingId(submissionId);
      await api.decideProjectSubmission(submissionId, {
        approval_status: approvalStatus,
        rejection_reason: rejectionReason || undefined,
      });
      setError(false);
      setMessage(`Submission ${approvalStatus}`);
      await loadRows(statusFilter);
    } catch (err) {
      setError(true);
      setMessage(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="stack">
      <section className="card">
        <div className="row justify-between">
          <h3>Project Completion Reviews</h3>
          <div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="">All</option>
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Project</th>
                <th>Staff</th>
                <th>Status</th>
                <th>Credentials</th>
                <th>Docs</th>
                <th>Screenshots</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.project?.name}</td>
                  <td>{row.staff?.name}</td>
                  <td>{row.approval_status}</td>
                  <td>
                    <div className="grid gap-1 text-xs">
                      <p><strong>URL:</strong> {row.login_url || '-'}</p>
                      <p><strong>User:</strong> {row.username || '-'}</p>
                      <p><strong>Pass:</strong> {row.password || '-'}</p>
                    </div>
                  </td>
                  <td>
                    {row.documentation_link ? (
                      <a className="text-orange-600 underline" href={row.documentation_link} target="_blank" rel="noreferrer">
                        Open
                      </a>
                    ) : '-'}
                  </td>
                  <td>
                    <div className="row">
                      {(row.screenshots ?? []).map((img) => {
                        const src = resolveImageUrl(img.image_path);
                        return (
                          <a href={src} key={img.id} target="_blank" rel="noreferrer">
                            <img src={src} alt="Submission screenshot" className="h-12 w-12 rounded border border-slate-200 object-cover" />
                          </a>
                        );
                      })}
                    </div>
                  </td>
                  <td>
                    {row.approval_status === 'pending' ? (
                      <div className="row">
                        <button disabled={processingId === row.id} onClick={() => decide(row.id, 'approved')}>
                          Approve
                        </button>
                        <button className="danger" disabled={processingId === row.id} onClick={() => decide(row.id, 'rejected')}>
                          Reject
                        </button>
                      </div>
                    ) : '-'}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center text-slate-500">No project submissions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Message message={message} error={error} />
    </div>
  );
}
