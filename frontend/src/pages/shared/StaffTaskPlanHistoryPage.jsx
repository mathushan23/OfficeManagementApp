import { useEffect, useMemo, useState } from 'react';
import { api, resolveImageUrl } from '../../api';
import { Message } from '../../components/FormBits';

function groupByDate(rows) {
  return [...rows].sort((a, b) => {
    if (a.plan_date === b.plan_date) return b.id - a.id;
    return String(b.plan_date || '').localeCompare(String(a.plan_date || ''));
  }).reduce((acc, row) => {
    const key = row.plan_date || 'Unknown Date';
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});
}

export default function StaffTaskPlanHistoryPage({ selectedStaff, onBack }) {
  const [rows, setRows] = useState([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const grouped = useMemo(() => groupByDate(rows), [rows]);

  const load = async (useFilter = false) => {
    if (!selectedStaff?.staff_id && !selectedStaff?.id) {
      setRows([]);
      return;
    }

    const staffId = selectedStaff.staff_id ?? selectedStaff.id;
    try {
      const data = await api.staffTaskPlanHistory(staffId, useFilter ? { from_date: fromDate || undefined, to_date: toDate || undefined } : {});
      setRows(Array.isArray(data?.rows) ? data.rows : []);
      setMessage('');
      setIsError(false);
    } catch (err) {
      setMessage(err.message);
      setIsError(true);
    }
  };

  useEffect(() => {
    load();
  }, [selectedStaff?.staff_id, selectedStaff?.id]);

  if (!selectedStaff?.staff_id && !selectedStaff?.id) {
    return (
      <section className="card">
        <h3>Taskplan History</h3>
        <p className="muted mt-2">Select a staff from Today Task Plans page first.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="mb-4 row justify-between">
        <div>
          <h3>Taskplan History - {selectedStaff.staff_name ?? selectedStaff.name}</h3>
          <p className="muted mt-1">{selectedStaff.office_id} | {selectedStaff.branch}</p>
        </div>
        <button type="button" className="ghost" onClick={onBack}>Back </button>
      </div>

      <div className="mb-4 row">
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        <button type="button" onClick={() => load(true)}>Apply Filter</button>
      </div>

      {rows.length === 0 && <p className="muted">No taskplan history found.</p>}

      {Object.entries(grouped).map(([date, dateRows]) => (
        <div key={date} className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">{date}</h4>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Project</th>
                  <th>Task</th>
                  <th>In Time</th>
                  <th>Estimate</th>
                  <th>Status</th>
                  <th>Proof</th>
                </tr>
              </thead>
              <tbody>
                {dateRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.project?.name ?? '-'}</td>
                    <td>{row.title}</td>
                    <td>{row.in_time ?? '-'}</td>
                    <td>{row.estimated_hours ?? '-'}</td>
                    <td>{row.status}</td>
                    <td>
                      {row.proof_image_path ? (
                        <a href={resolveImageUrl(row.proof_image_path)} target="_blank" rel="noreferrer">
                          <img src={resolveImageUrl(row.proof_image_path)} alt="Task proof" className="h-12 w-12 rounded border border-slate-200 object-cover" />
                        </a>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <Message message={message} error={isError} />
    </section>
  );
}
