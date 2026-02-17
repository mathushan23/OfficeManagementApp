import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { Message } from '../../components/FormBits';
import useAutoRefresh from '../../hooks/useAutoRefresh';

export default function AttendanceDetailsPage({ token, title = 'Attendance Details' }) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [date, setDate] = useState(today);
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [staffHistory, setStaffHistory] = useState([]);
  const [selectedStaffName, setSelectedStaffName] = useState('');
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const load = async (targetDate = date) => {
    try {
      setRows(await api.attendanceDetails(token, targetDate));
      setIsError(false);
      setMessage('');
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    }
  };

  useEffect(() => {
    load(today);
    api.listStaff(token).then(setStaffList).catch(() => setStaffList([]));
  }, []);

  useAutoRefresh(() => load(date), 30000, [token, date]);

  const loadStaffHistory = async () => {
    if (!selectedStaffId) return;
    try {
      const data = await api.attendanceStaffDetails(token, selectedStaffId, {
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      });
      setStaffHistory(data.rows ?? []);
      setSelectedStaffName(data.staff?.name ?? '');
      setIsError(false);
      setMessage('');
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    }
  };

  return (
    <section className="card">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 text-xl text-white shadow-lg">
            📊
          </div>
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <input className="flex-1 sm:flex-none" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button onClick={() => load(date)}>📅 Load</button>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Staff ID</th>
              <th>Name</th>
              <th>Office ID</th>
              <th>Branch</th>
              <th>Date</th>
              <th>In</th>
              <th>Out</th>
              <th>Tasklog</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.staff_id}>
                <td>{row.staff_id}</td>
                <td>{row.staff_name}</td>
                <td>{row.office_id}</td>
                <td>{row.branch}</td>
                <td>{row.date}</td>
                <td>{row.is_company_leave ? <span className="rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">Company Leave</span> : (row.in_time ?? '-')}</td>
                <td>{row.is_company_leave ? '-' : (row.out_time ?? '-')}</td>
                <td>
                  {Number(row.tasklog_submitted) === 1 ? (
                    <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Submitted</span>
                  ) : (
                    <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">Not Submitted</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan="8" className="text-center text-slate-500">No staff records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Message message={message} error={isError} />

      <div className="mt-5 border-t border-slate-200 pt-4">
        <div className="row mb-2 justify-between">
          <h4 className="text-base font-semibold">Selected Staff Full Attendance Details</h4>
          <div className="row w-full sm:w-auto">
            <select className="w-full sm:w-auto" value={selectedStaffId} onChange={(e) => setSelectedStaffId(e.target.value)}>
              <option value="">Select staff</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.office_id})</option>
              ))}
            </select>
            <input className="w-full sm:w-auto" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <input className="w-full sm:w-auto" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            <button onClick={loadStaffHistory}>Load Staff Details</button>
          </div>
        </div>

        {selectedStaffName && <p className="muted mb-2">Staff: {selectedStaffName}</p>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>In</th>
                <th>Out</th>
                <th>Tasklog</th>
              </tr>
            </thead>
            <tbody>
              {staffHistory.map((row) => (
                <tr key={row.attendance_id}>
                  <td>{row.date}</td>
                  <td>{row.is_company_leave ? <span className="rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">Company Leave</span> : (row.in_time ?? '-')}</td>
                  <td>{row.is_company_leave ? '-' : (row.out_time ?? '-')}</td>
                  <td>
                    {Number(row.tasklog_submitted) === 1 ? (
                      <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Submitted</span>
                    ) : (
                      <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">Not Submitted</span>
                    )}
                  </td>
                </tr>
              ))}
              {selectedStaffId && staffHistory.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center text-slate-500">No attendance history found for selected staff.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
