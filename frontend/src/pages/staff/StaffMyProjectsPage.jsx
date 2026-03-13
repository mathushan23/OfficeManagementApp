import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Message } from '../../components/FormBits';

export default function StaffMyProjectsPage() {
  const [assignments, setAssignments] = useState([]);
  const [notifications, setNotifications] = useState({ pending_tasks: [], deadline_reminders: [] });
  const [selectedProjectForCompletion, setSelectedProjectForCompletion] = useState(null);
  const [submissionForm, setSubmissionForm] = useState({
    login_url: '',
    username: '',
    password: '',
    documentation_link: '',
    remarks: '',
    screenshots: [],
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [toastDuration, setToastDuration] = useState(2600);

  const loadData = async (showRejectedToast = false) => {
    try {
      const [assignmentRows, notifyRows, rejectedRows] = await Promise.all([
        api.myProjectAssignments(),
        api.myProjectNotifications(),
        api.myRejectedProjectSubmissions(),
      ]);
      setAssignments(assignmentRows ?? []);
      setNotifications(notifyRows ?? { pending_tasks: [], deadline_reminders: [] });
      if (showRejectedToast && Array.isArray(rejectedRows) && rejectedRows.length > 0) {
        const latest = rejectedRows[0];
        const latestId = String(latest.id ?? '');
        const storageKey = `om:staff:project-rejection:last-seen:${assignmentRows?.[0]?.staff?.id ?? 'me'}`;
        const seenId = typeof window !== 'undefined' ? window.localStorage?.getItem(storageKey) : null;

        if (latestId !== '' && seenId !== latestId) {
          setError(true);
          setToastDuration(10000);
          setMessage(`Project submission rejected: ${latest.project_name || 'Project'}. Reason: ${latest.rejection_reason || 'No reason provided'}`);
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(storageKey, latestId);
          }
        } else {
          setError(false);
          setToastDuration(2600);
          setMessage('');
        }
      } else {
        setError(false);
        setToastDuration(2600);
        setMessage('');
      }
    } catch (err) {
      setError(true);
      setToastDuration(2600);
      setMessage(err.message);
    }
  };

  useEffect(() => {
    loadData(true);
  }, []);

  useEffect(() => {
    if (!selectedProjectForCompletion) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedProjectForCompletion]);

  const submitProject = async (event) => {
    event.preventDefault();
    if (!selectedProjectForCompletion?.id) {
      setError(true);
      setMessage('Select a project before submitting');
      return;
    }
    if (!submissionForm.screenshots.length) {
      setError(true);
      setMessage('At least one screenshot is required');
      return;
    }

    try {
      await api.submitMyProject(selectedProjectForCompletion.id, submissionForm);
      setSubmissionForm({
        login_url: '',
        username: '',
        password: '',
        documentation_link: '',
        remarks: '',
        screenshots: [],
      });
      setSelectedProjectForCompletion(null);
      setError(false);
      setToastDuration(2600);
      setMessage('Project submitted for boss approval');
      loadData();
    } catch (err) {
      setError(true);
      setToastDuration(2600);
      setMessage(err.message);
    }
  };

  return (
    <div className="stack">
      <section className="card">
        <h3>My Project Notifications</h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="sub-card">
            <p className="mb-2 text-sm font-bold text-slate-800">Pending Task Plans ({notifications.pending_tasks?.length ?? 0})</p>
            <div className="grid max-h-64 gap-2 overflow-y-auto pr-1">
              {(notifications.pending_tasks ?? []).map((row) => (
                <div key={row.task_id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  <p className="font-semibold">{row.title}</p>
                  <p className="text-xs text-slate-600">{row.project_name} | {row.plan_date ?? '-'} {row.is_carry_over ? '| Carry Over' : ''}</p>
                </div>
              ))}
              {(notifications.pending_tasks ?? []).length === 0 && <p className="muted">No pending tasks.</p>}
            </div>
          </div>
          <div className="sub-card">
            <p className="mb-2 text-sm font-bold text-slate-800">Deadline Alerts ({notifications.deadline_reminders?.length ?? 0})</p>
            <div className="grid gap-2">
              {(notifications.deadline_reminders ?? []).map((row) => (
                <div key={row.project_assignment_id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  <p className="font-semibold">{row.project_name}</p>
                  <p className="text-xs text-slate-600">{row.deadline_at} | {row.days_left} day(s) left</p>
                </div>
              ))}
              {(notifications.deadline_reminders ?? []).length === 0 && <p className="muted">No upcoming deadlines in 7 days.</p>}
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <h3>My Assigned Projects</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Project ID</th><th>Project</th><th>Status</th><th>Deadline</th><th>Tasks</th><th>Complete</th></tr>
            </thead>
            <tbody>
              {assignments.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.project?.name}</td>
                  <td>{row.status}</td>
                  <td>{row.deadline_at ?? '-'}</td>
                  <td>{row.task_counts?.completed ?? 0}/{row.task_counts?.total ?? 0}</td>
                  <td>
                    {row.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProjectForCompletion(row);
                          setSubmissionForm({
                            login_url: '',
                            username: '',
                            password: '',
                            documentation_link: '',
                            remarks: '',
                            screenshots: [],
                          });
                        }}
                      >
                        Complete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {assignments.length === 0 && (
                <tr><td colSpan="6" className="text-center text-slate-500">No projects found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedProjectForCompletion && (
        <div className="fixed inset-0 z-[90] grid place-items-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[2px]" onClick={() => setSelectedProjectForCompletion(null)} />
          <section className="relative z-10 flex h-[92dvh] max-h-[92dvh] w-full flex-col overflow-hidden overscroll-contain border border-slate-200 bg-white shadow-2xl sm:max-w-3xl sm:rounded-2xl">
            <button
              type="button"
              aria-label="Close"
              className="!absolute !right-3 !top-3 !z-20 !grid !h-10 !w-10 !place-items-center !rounded-full !border !border-white/50 !bg-rose-600 !p-0 !text-lg !font-bold !leading-none !text-white !shadow-lg !shadow-rose-900/45 !transition !overflow-visible before:!hidden hover:!bg-rose-700 hover:!translate-y-0 hover:!scale-100 focus:outline-none focus:ring-2 focus:ring-white/70"
              onClick={() => setSelectedProjectForCompletion(null)}
            >
              &times;
            </button>
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-4 pb-3 pt-4 text-white sm:px-5 sm:pt-5">
              <h3 className="pr-12 !text-lg !text-white sm:!text-xl">Submit Project Completion</h3>
              <p className="mt-1 text-xs text-white/90">
                Project: <strong>{selectedProjectForCompletion.project?.name}</strong> | Project ID: {selectedProjectForCompletion.id}
              </p>
            </div>

            <div className="min-h-0 flex flex-1 flex-col p-4 sm:p-5">

              <form className="form min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0 sm:pr-1" onSubmit={submitProject}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-slate-700">Documentation Link</span>
                    <input value={submissionForm.documentation_link} onChange={(e) => setSubmissionForm((prev) => ({ ...prev, documentation_link: e.target.value }))} />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-slate-700">Login URL</span>
                    <input value={submissionForm.login_url} onChange={(e) => setSubmissionForm((prev) => ({ ...prev, login_url: e.target.value }))} required />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-slate-700">Username</span>
                    <input value={submissionForm.username} onChange={(e) => setSubmissionForm((prev) => ({ ...prev, username: e.target.value }))} required />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-slate-700">Password</span>
                    <input type="text" value={submissionForm.password} onChange={(e) => setSubmissionForm((prev) => ({ ...prev, password: e.target.value }))} required />
                  </label>
                  <label className="grid gap-2 md:col-span-2">
                    <span className="text-sm font-semibold text-slate-700">Remarks</span>
                    <textarea value={submissionForm.remarks} onChange={(e) => setSubmissionForm((prev) => ({ ...prev, remarks: e.target.value }))} />
                  </label>
                  <label className="grid gap-2 md:col-span-2">
                    <span className="text-sm font-semibold text-slate-700">Screenshots</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      onChange={(e) => setSubmissionForm((prev) => ({ ...prev, screenshots: Array.from(e.target.files || []) }))}
                      required
                    />
                  </label>
                </div>
                {!!submissionForm.screenshots.length && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {submissionForm.screenshots.map((file) => (
                      <span key={`${file.name}-${file.size}`} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-700">
                        {file.name}
                      </span>
                    ))}
                  </div>
                )}
                <div className="row mt-3 justify-between border-t border-slate-200 pt-3">
                  <p className="muted">{submissionForm.screenshots.length} screenshot(s) selected</p>
                  <button type="submit">Submit Project</button>
                </div>
              </form>
            </div>
          </section>
        </div>
      )}

      <Message message={message} error={error} duration={toastDuration} />
    </div>
  );
}
