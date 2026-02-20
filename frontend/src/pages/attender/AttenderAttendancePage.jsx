import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { Message, TextInput } from '../../components/FormBits';
import useAutoRefresh from '../../hooks/useAutoRefresh';

export default function AttenderAttendancePage({ token }) {
  const [rows, setRows] = useState([]);
  const [staffRows, setStaffRows] = useState([]);
  const [staffSearch, setStaffSearch] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const todayRows = useMemo(() => rows.filter((row) => row.date === today), [rows, today]);

  const load = async () => {
    try {
      const [attendance, staff] = await Promise.all([
        api.listAttendance(token),
        api.listStaff(token),
      ]);
      setRows(attendance);
      setStaffRows(staff);
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);
  useAutoRefresh(load, 20000, [token]);

  const selectedStaffId = useMemo(() => {
    const matched = staffRows.find(
      (s) => `${s.id}` === staffSearch.trim() || `${s.id} - ${s.name}` === staffSearch.trim() || `${s.name}` === staffSearch.trim()
    );
    return matched ? matched.id : null;
  }, [staffRows, staffSearch]);

  const create = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const form = e.currentTarget;

    if (!selectedStaffId) {
      setIsError(true);
      setMessage('Please choose a valid staff from the dropdown/search list.');
      return;
    }
    if (todayRows.some((row) => Number(row.staff_id) === Number(selectedStaffId))) {
      setIsError(true);
      setMessage('Attendance is already marked for this staff today.');
      return;
    }

    const fd = new FormData(form);
    const inTime = String(fd.get('in_time') || '');
    const outTime = String(fd.get('out_time') || '');
    if (!inTime) {
      setIsError(true);
      setMessage('In time is required.');
      return;
    }
    if (outTime && outTime <= inTime) {
      setIsError(true);
      setMessage('Out time must be later than in time.');
      return;
    }
    try {
      setSubmitting(true);
      await api.markAttendance(token, {
        staff_id: Number(selectedStaffId),
        in_time: inTime,
        out_time: outTime || null,
      });
      setMessage('Attendance marked.');
      setIsError(false);
      form.reset();
      setStaffSearch('');
      load();
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const update = async (id, inTime, outTime) => {
    if (!inTime) {
      setIsError(true);
      setMessage('In time is required.');
      return;
    }
    if (outTime && outTime <= inTime) {
      setIsError(true);
      setMessage('Out time must be later than in time.');
      return;
    }
    try {
      setUpdatingId(id);
      await api.updateAttendance(token, id, { in_time: inTime || null, out_time: outTime || null });
      setMessage('Attendance updated.');
      setIsError(false);
      load();
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="stack">
      <section className="card">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 text-xl text-white shadow-lg">
            ✓
          </div>
          <h3 className="text-xl font-bold text-slate-900">Mark Attendance</h3>
        </div>
        <form className="form" onSubmit={create}>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Search Staff by ID or Name</span>
            <input
              list="staff-list"
              placeholder="Type ID or name"
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
              required
            />
          </label>
          <datalist id="staff-list">
            {staffRows.map((staff) => (
              <option key={staff.id} value={`${staff.id} - ${staff.name}`}>
                {staff.id} - {staff.name}
              </option>
            ))}
          </datalist>

          <TextInput label="Date" value={today} readOnly />
          <TextInput label="In Time" name="in_time" type="time" required />
          <TextInput label="Out Time (optional)" name="out_time" type="time" />
          <button type="submit" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      </section>

      <section className="card">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-xl text-white shadow-lg">
            📅
          </div>
          <h3 className="text-xl font-bold text-slate-900">Today's Attendance ({today})</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>ID</th><th>Staff ID</th><th>Staff Name</th><th>Date</th><th>In</th><th>Out</th><th>Action</th></tr>
            </thead>
            <tbody>
              {todayRows.map((row) => (
                <AttendanceRow key={row.id} row={row} onSave={update} saving={updatingId === row.id} />
              ))}
              {todayRows.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center text-slate-500">No attendance marked for today yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <Message message={message} error={isError} />
    </div>
  );
}

function AttendanceRow({ row, onSave, saving }) {
  const [inTime, setInTime] = useState(row.in_time ?? '');
  const [outTime, setOutTime] = useState(row.out_time ?? '');
  const isCompanyLeave = Boolean(row.is_company_leave);

  return (
    <tr className={isCompanyLeave ? 'bg-amber-50' : ''}>
      <td>{row.id}</td>
      <td>{row.staff_id}</td>
      <td>{row.staff?.name ?? '-'}</td>
      <td>{row.date}</td>
      <td>{isCompanyLeave ? <span className="rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">Company Leave</span> : <input value={inTime} onChange={(e) => setInTime(e.target.value)} type="time" />}</td>
      <td>{isCompanyLeave ? '-' : <input value={outTime} onChange={(e) => setOutTime(e.target.value)} type="time" />}</td>
      <td>
        <button disabled={saving || isCompanyLeave} onClick={() => onSave(row.id, inTime, outTime)}>
          {saving ? 'Updating...' : 'Update'}
        </button>
      </td>
    </tr>
  );
}
