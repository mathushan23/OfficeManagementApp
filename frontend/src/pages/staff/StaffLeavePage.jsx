import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Message, SelectInput, TextInput } from '../../components/FormBits';
import useAutoRefresh from '../../hooks/useAutoRefresh';

export default function StaffLeavePage({ token }) {
  const [leaveType, setLeaveType] = useState('full_day');
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const data = await api.listLeaveRequests(token);
      setRows(data);
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);
  useAutoRefresh(load, 30000, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const form = e.currentTarget;
    setMessage('');
    setIsError(false);
    setSubmitting(true);
    const fd = new FormData(form);
    const startDate = String(fd.get('start_date') || '');
    const today = new Date().toISOString().slice(0, 10);
    if (!startDate) {
      setIsError(true);
      setMessage('Start date is required.');
      setSubmitting(false);
      return;
    }
    if (startDate < today) {
      setIsError(true);
      setMessage('Start date cannot be in the past.');
      setSubmitting(false);
      return;
    }

    if (leaveType === 'full_day') {
      const days = Number(fd.get('days_count') || 0);
      if (!Number.isInteger(days) || days < 1 || days > 30) {
        setIsError(true);
        setMessage('Days count must be between 1 and 30.');
        setSubmitting(false);
        return;
      }
    }

    if (leaveType === 'half_day' && !fd.get('half_day_slot')) {
      setIsError(true);
      setMessage('Please select half day slot.');
      setSubmitting(false);
      return;
    }

    if (leaveType === 'short_leave') {
      const start = String(fd.get('short_start_time') || '');
      const end = String(fd.get('short_end_time') || '');
      if (!start || !end) {
        setIsError(true);
        setMessage('Short leave start time and end time are required.');
        setSubmitting(false);
        return;
      }
      if (end <= start) {
        setIsError(true);
        setMessage('Short leave end time must be later than start time.');
        setSubmitting(false);
        return;
      }
      const startMinutes = Number(start.slice(0, 2)) * 60 + Number(start.slice(3, 5));
      const endMinutes = Number(end.slice(0, 2)) * 60 + Number(end.slice(3, 5));
      if ((endMinutes - startMinutes) >= 300) {
        setIsError(true);
        setMessage('This leave is more than or equal to 5 hours, so it should be applied as half day leave.');
        setSubmitting(false);
        return;
      }
    }

    try {
      await api.createLeaveRequest(token, {
        leave_type: fd.get('leave_type'),
        start_date: startDate,
        days_count: leaveType === 'full_day' ? Number(fd.get('days_count') || 1) : 1,
        half_day_slot: leaveType === 'half_day' ? fd.get('half_day_slot') : null,
        short_start_time: leaveType === 'short_leave' ? fd.get('short_start_time') : null,
        short_end_time: leaveType === 'short_leave' ? fd.get('short_end_time') : null,
        reason: fd.get('reason') || null,
      });
      setMessage('Leave request submitted.');
      form.reset();
      setLeaveType('full_day');
      load();
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="stack">
      <section className="card">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#fd7e14] to-orange-600 text-xl text-white shadow-lg">
            📝
          </div>
          <h3 className="text-xl font-bold text-slate-900">Send Leave Request</h3>
        </div>
        <form className="form" onSubmit={submit}>
          <SelectInput label="Type" name="leave_type" value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
            <option value="full_day">Full Day</option>
            <option value="half_day">Half Day</option>
            <option value="short_leave">Short Leave</option>
          </SelectInput>
          <TextInput label="Start Date" name="start_date" type="date" min={new Date().toISOString().slice(0, 10)} required />
          {leaveType === 'full_day' && (
            <TextInput label="How Many Days (excluding Sundays in backend)" name="days_count" type="number" min="1" defaultValue="1" required />
          )}
          {leaveType === 'half_day' && (
            <SelectInput label="Half Day Slot" name="half_day_slot" required>
              <option value="">Select</option>
              <option value="before_break">Before Break</option>
              <option value="after_break">After Break</option>
            </SelectInput>
          )}
          {leaveType === 'short_leave' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput label="Short Leave Start Time" name="short_start_time" type="time" required />
              <TextInput label="Short Leave End Time" name="short_end_time" type="time" required />
            </div>
          )}
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Reason</span>
            <textarea name="reason" rows="3" className="rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none ring-orange-400/30 transition-all duration-200 placeholder:text-slate-400 focus:border-orange-400 focus:ring-4" placeholder="Enter reason for leave" required />
          </label>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </form>
        <Message message={message} error={isError} />
      </section>

      <section className="card">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-xl text-white shadow-lg">
            📋
          </div>
          <h3 className="text-xl font-bold text-slate-900">My Leave Requests</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Slot/Time</th>
                <th>Start</th>
                <th>Days</th>
                <th>Rejoin</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.leave_type}</td>
                  <td>
                    {row.leave_type === 'half_day' && row.half_day_slot ? row.half_day_slot.replace('_', ' ') : ''}
                    {row.leave_type === 'short_leave' && row.short_start_time && row.short_end_time
                      ? `${row.short_start_time} - ${row.short_end_time}`
                      : ''}
                  </td>
                  <td>{row.start_date}</td>
                  <td>{row.days_count}</td>
                  <td>{row.rejoin_date}</td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
