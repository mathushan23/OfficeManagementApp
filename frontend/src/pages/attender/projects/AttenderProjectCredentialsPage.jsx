import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../api';
import { Message } from '../../../components/FormBits';

export default function AttenderProjectCredentialsPage() {
  const [credentials, setCredentials] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);

  const filteredCredentials = useMemo(
    () => (selectedAssignmentId
      ? credentials.filter((row) => String(row.project_assignment_id) === String(selectedAssignmentId))
      : credentials),
    [credentials, selectedAssignmentId]
  );

  const setToast = (text, isError = false) => {
    setError(isError);
    setMessage(text);
  };

  const loadAll = async () => {
    try {
      const [credentialRows, assignmentRows] = await Promise.all([
        api.listProjectCredentials(),
        api.listProjectAssignments(),
      ]);
      setCredentials(credentialRows ?? []);
      setAssignments(assignmentRows ?? []);
      setToast('');
    } catch (err) {
      setToast(err.message, true);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  return (
    <div className="stack">
      <section className="card">
        <h3>Project Credentials</h3>
        <div className="mt-3 row">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Filter By Assignment</span>
            <select value={selectedAssignmentId} onChange={(e) => setSelectedAssignmentId(e.target.value)}>
              <option value="">All Assignments</option>
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.id} - {a.project?.name} / {a.staff?.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>ID</th><th>Project</th><th>Staff</th><th>App</th><th>URL</th><th>Username</th><th>Password</th></tr>
            </thead>
            <tbody>
              {filteredCredentials.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.project?.name}</td>
                  <td>{row.staff?.name}</td>
                  <td>{row.app_name || '-'}</td>
                  <td>{row.login_url}</td>
                  <td>{row.username}</td>
                  <td>{row.password}</td>
                </tr>
              ))}
              {filteredCredentials.length === 0 && (
                <tr><td colSpan="7" className="text-center text-slate-500">No credentials found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Message message={message} error={error} />
    </div>
  );
}
