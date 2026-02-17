import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Message } from '../../components/FormBits';
import useAutoRefresh from '../../hooks/useAutoRefresh';

export default function LeaveCountsPage({ token, title = 'Leave Counts', selfOnly = false }) {
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

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
  useAutoRefresh(load, 30000, [token, selfOnly]);

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
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan="9" className="text-center text-slate-500">No leave count data.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Message message={message} error={isError} />
    </section>
  );
}
