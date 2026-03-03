import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Message } from '../../components/FormBits';

export default function LeaveCountsPage({ token, title = 'Leave Counts', selfOnly = false, canEdit = false }) {
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [savingStaffId, setSavingStaffId] = useState(null);
  const [detailsLoadingStaffId, setDetailsLoadingStaffId] = useState(null);
  const [detailsTitle, setDetailsTitle] = useState('');
  const [detailsRows, setDetailsRows] = useState([]);
  const [detailsTotal, setDetailsTotal] = useState(0);

  const load = async () => {
    try {
      const data = await api.leaveCounts(token);
      setRows(selfOnly ? data.slice(0, 1) : data);
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
  
  const editLeaveCount = async (row) => {
    const next = window.prompt(`Enter leave count for ${row.name}:`, `${row.leave_days ?? 0}`);
    if (next === null) return;
    const value = Number(next);
    if (Number.isNaN(value) || value < 0) {
      setIsError(true);
      setMessage('Leave count must be a number greater than or equal to 0.');
      return;
    }
    try {
      setSavingStaffId(row.staff_id);
      await api.updateLeaveCount(row.staff_id, value);
      setIsError(false);
      setMessage('Leave count updated.');
      await load();
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    } finally {
      setSavingStaffId(null);
    }
  };

  const sourceLabel = (source) => {
    if (source === 'missing_attendance') return 'Attendance Not Marked';
    if (source === 'approved_full_day') return 'Approved Full Day';
    if (source === 'approved_half_day') return 'Approved Half Day';
    if (source === 'approved_short_leave') return 'Approved Short Leave';
    return source ?? '-';
  };

  const openLeaveDetails = async (row) => {
    try {
      setDetailsLoadingStaffId(row.staff_id);
      const data = await api.leaveDetails(row.staff_id);
      setDetailsTitle(`${data.name} (${data.office_id})`);
      setDetailsRows(Array.isArray(data.rows) ? data.rows : []);
      setDetailsTotal(Number(data.total_leave_days ?? 0));
      setMessage('');
      setIsError(false);
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    } finally {
      setDetailsLoadingStaffId(null);
    }
  };

  return (
    <section className="card">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-xl text-white shadow-lg">
          {'\u{1F4C8}'}
        </div>
        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Office ID</th>
              <th>Branch</th>
              <th>Joining Date</th>
              <th>Type</th>
              <th>Intern End Date</th>
              <th>Attended Days</th>
              <th>Leaves</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.staff_id}>
                <td>{row.staff_id}</td>
                <td>{row.name}</td>
                <td>{row.office_id}</td>
                <td>{row.branch}</td>
                <td>{row.joining_date}</td>
                <td>{row.employment_type}</td>
                <td>{row.employment_type === 'intern' ? (row.intern_end_date ?? '-') : '-'}</td>
                <td>{row.attended_days}</td>
                <td>{row.leave_days}</td>
                <td className="whitespace-nowrap">
                  <button onClick={() => openLeaveDetails(row)} disabled={detailsLoadingStaffId === row.staff_id}>
                    {detailsLoadingStaffId === row.staff_id ? 'Loading...' : 'Leave Details'}
                  </button>
                  {canEdit && (
                    <span className="ml-2 inline-block">
                    <button onClick={() => editLeaveCount(row)} disabled={savingStaffId === row.staff_id}>
                      {savingStaffId === row.staff_id ? 'Saving...' : 'Edit'}
                    </button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center text-slate-500">No leave count data.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {detailsTitle && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-base font-bold text-slate-900">Leave Details: {detailsTitle}</h4>
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
              Total: {detailsTotal}
            </span>
          </div>
          {detailsRows.length === 0 ? (
            <p className="text-sm text-slate-500">No leave dates found.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Leave Value</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {detailsRows.map((item) => (
                    <tr key={`${item.date}-${item.source}`}>
                      <td>{item.date}</td>
                      <td>{item.leave_value}</td>
                      <td>{sourceLabel(item.source)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      <Message message={message} error={isError} />
    </section>
  );
}

