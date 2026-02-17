import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { Message, TextInput } from '../../components/FormBits';
import useAutoRefresh from '../../hooks/useAutoRefresh';

function createEntry() {
  return { start_time: '', end_time: '', project_name: '', description: '', proofFiles: [] };
}

export default function StaffTaskLogPage({ token }) {
  const [entries, setEntries] = useState([createEntry(), createEntry(), createEntry()]);
  const [selectedDate, setSelectedDate] = useState('today');
  const [approvedDates, setApprovedDates] = useState([]);
  const [missedDates, setMissedDates] = useState([]);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requestingDate, setRequestingDate] = useState('');
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const loadLateData = async () => {
    try {
      const [approved, missed] = await Promise.all([
        api.myLatePermissions(token),
        api.myMissedTaskLogs(token),
      ]);
      setApprovedDates(approved);
      setMissedDates(missed);
    } catch {
      setApprovedDates([]);
      setMissedDates([]);
    }
  };

  useEffect(() => {
    loadLateData();
  }, []);
  useAutoRefresh(loadLateData, 30000, [token]);

  const updateEntry = (idx, key, value) => {
    setEntries((prev) => {
      const next = prev.map((entry, i) => (i === idx ? { ...entry, [key]: value } : entry));
      if (key === 'end_time' && idx < next.length - 1) {
        next[idx + 1] = { ...next[idx + 1], start_time: value || '' };
      }
      return next;
    });
  };

  const addEntry = () => setEntries((prev) => [...prev, createEntry()]);
  const removeEntry = (idx) => {
    setEntries((prev) => {
      if (prev.length <= 3) return prev;
      return prev.filter((_, i) => i !== idx);
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setMessage('');
    setIsError(false);
    setSubmitting(true);

    try {
      const payloadEntries = [];

      for (const entry of entries) {
        const projectName = String(entry.project_name || '').trim();
        const description = String(entry.description || '').trim();
        if (!entry.start_time || !entry.end_time) {
          throw new Error('Start time and end time are required for all task entries.');
        }
        if (entry.end_time <= entry.start_time) {
          throw new Error('End time must be later than start time for all task entries.');
        }
        if (projectName.length < 2) {
          throw new Error('Project name must be at least 2 characters.');
        }
        if (description.length < 3) {
          throw new Error('Description must be at least 3 characters.');
        }

        const proofPaths = [];
        for (const file of entry.proofFiles) {
          if (!file.type.startsWith('image/')) {
            throw new Error('Only image files are allowed for proof upload.');
          }
          if (file.size > 5 * 1024 * 1024) {
            throw new Error('Each proof image must be 5MB or smaller.');
          }
          const uploaded = await api.uploadTasklogProof(token, file);
          proofPaths.push(uploaded.path);
        }

        payloadEntries.push({
          start_time: entry.start_time,
          end_time: entry.end_time,
          project_name: projectName,
          description,
          proofs: proofPaths,
        });
      }

      if (payloadEntries.length < 3) {
        throw new Error('Minimum 3 entries are required in task log.');
      }
      for (let i = 1; i < payloadEntries.length; i++) {
        if (payloadEntries[i].start_time !== payloadEntries[i - 1].end_time) {
          throw new Error('Each next entry start time must match previous entry end time.');
        }
      }

      const payload = { entries: payloadEntries };
      if (selectedDate !== 'today') {
        payload.log_date = selectedDate;
      }

      await api.submitTaskLog(token, payload);
      setMessage('Task log submitted successfully.');
      setEntries([createEntry(), createEntry(), createEntry()]);
      setSelectedDate('today');
      loadLateData();
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const requestLate = async (logDate) => {
    try {
      setRequestingDate(logDate);
      await api.requestLateTaskLogApproval(token, logDate);
      setIsError(false);
      setMessage(`Request sent for late tasklog approval on ${logDate}.`);
      loadLateData();
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    } finally {
      setRequestingDate('');
    }
  };

  return (
    <section className="card">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-xl text-white shadow-lg">
          ⏱️
        </div>
        <h3 className="text-xl font-bold text-slate-900">Add Task Log</h3>
      </div>
      <form className="form" onSubmit={submit}>
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-700">Tasklog Date</span>
          <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}>
            <option value="today">{today} (Today)</option>
            {approvedDates.map((row) => (
              <option key={row.id} value={row.log_date}>{row.log_date} (Approved)</option>
            ))}
          </select>
        </label>

        {entries.map((entry, idx) => (
          <div className="sub-card" key={idx}>
            <h4 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-800">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#fd7e14] to-orange-600 text-xs text-white shadow">
                {idx + 1}
              </span>
              Entry {idx + 1}
              <button
                type="button"
                className="ml-auto !rounded-lg !bg-slate-200 !px-2 !py-1 !text-xs !font-bold !text-slate-700 hover:!bg-slate-300 before:!hidden"
                onClick={() => removeEntry(idx)}
                disabled={entries.length <= 3}
                title={entries.length <= 3 ? 'Minimum 3 entries required' : 'Close this entry'}
              >
                X
              </button>
            </h4>
            <TextInput label="Start Time" type="time" value={entry.start_time} onChange={(e) => updateEntry(idx, 'start_time', e.target.value)} required />
            <TextInput label="End Time" type="time" value={entry.end_time} onChange={(e) => updateEntry(idx, 'end_time', e.target.value)} required />
            <TextInput label="Project Name" value={entry.project_name} onChange={(e) => updateEntry(idx, 'project_name', e.target.value)} required />
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Description</span>
              <textarea rows="3" className="rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none ring-orange-400/30 transition-all duration-200 placeholder:text-slate-400 focus:border-orange-400 focus:ring-4" placeholder="Describe your work" value={entry.description} onChange={(e) => updateEntry(idx, 'description', e.target.value)} required />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Proof Images (optional)</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="file:mr-4 file:rounded-lg file:border-0 file:bg-orange-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-orange-700 hover:file:bg-orange-200"
                onChange={(e) => updateEntry(idx, 'proofFiles', Array.from(e.target.files ?? []))}
              />
            </label>
          </div>
        ))}

        <div className="row">
          <button type="button" className="ghost" onClick={addEntry}>Add Another Entry</button>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Submitting Task Log...' : 'Submit Task Log'}
          </button>
        </div>
      </form>

      <div className="mt-6 rounded-xl border-t-4 border-orange-500 bg-slate-50 p-5">
        <h4 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-800">
          <span className="text-xl">📅</span>
          Missed Tasklog Requests
        </h4>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Date</th><th>In</th><th>Out</th><th>Request Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {missedDates.map((row, idx) => (
                <tr key={`${row.log_date}-${idx}`}>
                  <td>{row.log_date}</td>
                  <td>{row.in_time ?? '-'}</td>
                  <td>{row.out_time ?? '-'}</td>
                  <td>{row.request_status ?? 'not_requested'}</td>
                  <td>
                    {row.request_status === 'pending' || row.request_status === 'approved' ? (
                      <span className="text-xs text-slate-500">Requested</span>
                    ) : (
                      <button type="button" disabled={requestingDate === row.log_date} onClick={() => requestLate(row.log_date)}>
                        {requestingDate === row.log_date ? 'Requesting...' : 'Request'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {missedDates.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center text-slate-500">No missed tasklogs.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Message message={message} error={isError} />
    </section>
  );
}
