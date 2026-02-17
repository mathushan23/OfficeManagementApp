import { useEffect, useState } from 'react';
import { api, resolveImageUrl } from '../../api';
import { Message } from '../../components/FormBits';
import useAutoRefresh from '../../hooks/useAutoRefresh';

function groupByDate(logs) {
  const sorted = [...logs].sort((a, b) => {
    if (a.log_date === b.log_date) return b.id - a.id;
    return String(b.log_date).localeCompare(String(a.log_date));
  });

  return sorted.reduce((acc, log) => {
    const key = log.log_date ?? 'Unknown Date';
    if (!acc[key]) acc[key] = [];
    acc[key].push(log);
    return acc;
  }, {});
}

export default function BossStaffTaskLogsPage({ token }) {
  const [staff, setStaff] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [logs, setLogs] = useState([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [message, setMessage] = useState('');

  const loadStaff = async () => {
    try {
      setStaff(await api.listStaffForBoss(token));
      setMessage('');
    } catch (err) {
      setMessage(err.message);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);
  useAutoRefresh(loadStaff, 30000, [token]);

  const loadLogs = async (staffId, staffName = '', useFilter = false) => {
    try {
      setSelectedId(String(staffId));
      setSelectedName(staffName);
      const filters = useFilter
        ? { from_date: fromDate || undefined, to_date: toDate || undefined }
        : {};
      setLogs(await api.staffTaskLogHistory(token, staffId, filters));
      setMessage('');
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="stack">
      <section className="card">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 text-xl text-white shadow-lg">
              👥
            </div>
            <h3 className="text-xl font-bold text-slate-900">Staff Details</h3>
          </div>
          <button onClick={loadStaff} className="ghost">🔄 Refresh Staff</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>ID</th><th>Name</th><th>Office ID</th><th>Branch</th><th>Status</th></tr>
            </thead>
            <tbody>
              {staff.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>
                    <button className="bg-transparent p-0 text-left font-semibold text-orange-600 hover:text-orange-500" onClick={() => loadLogs(row.id, row.name)}>
                      {row.name}
                    </button>
                  </td>
                  <td>{row.office_id}</td>
                  <td>{row.branch}</td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedId && (
        <section className="card">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-xl text-white shadow-lg">
                📊
              </div>
              <h3 className="text-xl font-bold text-slate-900">Task Log History - {selectedName || `Staff #${selectedId}`}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <input className="flex-1 sm:flex-none" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <input className="flex-1 sm:flex-none" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              <button onClick={() => loadLogs(Number(selectedId), selectedName, true)}>🔍 Apply Filter</button>
            </div>
          </div>
          {logs.length === 0 && <p className="muted">No tasklogs found for this staff.</p>}
          {Object.entries(groupByDate(logs)).map(([date, dateLogs]) => (
            <div key={date} className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">{date}</h4>
              {dateLogs.map((log) => (
                <div key={log.id} className="mb-3 rounded-lg bg-white p-3 shadow-sm last:mb-0">
                  <p className="text-sm font-semibold text-slate-700">
                    TaskLog ID: {log.id}
                    {log.attender_override_approved && (
                      <span className="ml-2 rounded bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">
                        Late Approved
                      </span>
                    )}
                  </p>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>Start</th><th>End</th><th>Project</th><th>Description</th><th>Proof Images</th></tr>
                      </thead>
                      <tbody>
                        {(log.entries ?? []).map((entry) => (
                          <tr key={entry.id}>
                            <td>{entry.start_time}</td>
                            <td>{entry.end_time}</td>
                            <td>{entry.project_name}</td>
                            <td>{entry.description}</td>
                            <td>
                              {entry.proofs?.length ? (
                                <div className="row">
                                  {entry.proofs.map((p) => {
                                    const src = resolveImageUrl(p.image_path || p.url);
                                    return (
                                      <a key={p.id} href={src} target="_blank" rel="noreferrer">
                                        <img
                                          src={src}
                                          alt="Task proof"
                                          className="h-14 w-14 rounded border border-slate-200 object-cover"
                                        />
                                      </a>
                                    );
                                  })}
                                </div>
                              ) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </section>
      )}

      <Message message={message} error />
    </div>
  );
}
