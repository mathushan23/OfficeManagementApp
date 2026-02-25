import { useEffect, useState } from 'react';
import { api, resolveImageUrl } from '../../api';
import { Message } from '../../components/FormBits';

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

export default function StaffTaskLogHistoryPage({ token }) {
  const [rows, setRows] = useState([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const load = async (useFilter = false) => {
    try {
      const filters = useFilter
        ? { from_date: fromDate || undefined, to_date: toDate || undefined }
        : {};
      setRows(await api.myTaskLogHistory(token, filters));
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
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-xl text-white shadow-lg">
            {'\u{1F4DD}'}
          </div>
          <h3 className="text-xl font-bold text-slate-900">My Tasklog History</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <input className="flex-1 sm:flex-none" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <input className="flex-1 sm:flex-none" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <button onClick={() => load(true)}>Apply Filter</button>
        </div>
      </div>

      {rows.length === 0 && <p className="muted">No tasklog history found.</p>}
      {Object.entries(groupByDate(rows)).map(([date, dateLogs]) => (
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
      <Message message={message} error={isError} />
    </section>
  );
}


