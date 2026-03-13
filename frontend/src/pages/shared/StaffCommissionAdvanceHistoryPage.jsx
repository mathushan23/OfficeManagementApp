import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Message } from '../../components/FormBits';

function money(value) {
  return Number(value || 0).toFixed(2);
}

export default function StaffCommissionAdvanceHistoryPage({ selectedRow, onBack }) {
  const [meta, setMeta] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const load = async () => {
    if (!selectedRow?.project_assignment_id) return;
    setLoading(true);
    try {
      const data = await api.commissionAdvanceHistory(selectedRow.project_assignment_id);
      setMeta({
        projectAssignmentId: data?.project_assignment_id,
        projectName: data?.project?.name,
        staffName: data?.staff?.name,
        staffOfficeId: data?.staff?.office_id,
      });
      setRows(Array.isArray(data?.rows) ? data.rows : []);
      setIsError(false);
      setMessage('');
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [selectedRow?.project_assignment_id]);

  if (!selectedRow?.project_assignment_id) {
    return (
      <section className="card">
        <h3>Commission Advance History</h3>
        <p className="muted mt-2">Select a project row from Staff Commission page first.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="row justify-between">
        <div>
          <h3>Commission Advance History</h3>
          <p className="muted mt-1">
            {meta?.projectName || selectedRow?.project?.name} | {meta?.staffName || selectedRow?.staff?.name} ({meta?.staffOfficeId || selectedRow?.staff?.office_id}) | Project #{meta?.projectAssignmentId || selectedRow?.project_assignment_id}
          </p>
        </div>
        <button type="button" className="ghost" onClick={onBack}>Back</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Amount</th>
              <th>Given By Attender</th>
              <th>Note</th>
              <th>Date Time</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{money(row.amount)}</td>
                <td>{row.attender?.name ?? '-'} {row.attender?.office_id ? `(${row.attender.office_id})` : ''}</td>
                <td>{row.note || '-'}</td>
                <td>{row.created_at ?? '-'}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center text-slate-500">No advance history found for this project.</td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan="5" className="text-center text-slate-500">Loading history...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Message message={message} error={isError} />
    </section>
  );
}
