import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Message } from '../../components/FormBits';

export default function StaffTaskPlanTodayPage({ title = "Today's Task Plans", onOpenHistory }) {
  const [date, setDate] = useState('');
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const load = async () => {
    try {
      const data = await api.taskPlanTodaySummary();
      setDate(data?.date || '');
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
  }, []);

  return (
    <section className="card">
      <div className="mb-4">
        <h3>{title}</h3>
        <p className="muted mt-1">Date: {date || '-'}</p>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Staff</th>
              <th>Office ID</th>
              <th>Branch</th>
              <th>Today Tasks</th>
              <th>Pending</th>
              <th>In Progress</th>
              <th>Completed</th>
              <th>History</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.staff_id}>
                <td>{row.staff_name}</td>
                <td>{row.office_id}</td>
                <td>{row.branch}</td>
                <td>{row.today_task_counts?.total ?? 0}</td>
                <td>{row.today_task_counts?.pending ?? 0}</td>
                <td>{row.today_task_counts?.in_progress ?? 0}</td>
                <td>{row.today_task_counts?.completed ?? 0}</td>
                <td>
                  <button type="button" onClick={() => onOpenHistory?.(row)}>
                    Taskplan History
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan="8" className="text-center text-slate-500">No staff data found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Message message={message} error={isError} />
    </section>
  );
}
