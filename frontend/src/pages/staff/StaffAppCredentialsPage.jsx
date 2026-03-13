import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { Message } from '../../components/FormBits';

export default function StaffAppCredentialsPage() {
  const [assignments, setAssignments] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [form, setForm] = useState({
    login_url: '',
    username: '',
    password: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);

  const activeAssignments = useMemo(
    () => assignments.filter((a) => ['assigned', 'in_progress', 'submitted'].includes(a.status)),
    [assignments]
  );

  const filteredCredentials = selectedAssignmentId
    ? credentials.filter((c) => String(c.project_assignment_id) === String(selectedAssignmentId))
    : credentials;

  const loadData = async () => {
    try {
      const [assignmentRows, credentialRows] = await Promise.all([
        api.myProjectAssignments(),
        api.listProjectCredentials(),
      ]);
      setAssignments(assignmentRows ?? []);
      setCredentials(credentialRows ?? []);
      setError(false);
      setMessage('');
    } catch (err) {
      setError(true);
      setMessage(err.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveCredential = async (event) => {
    event.preventDefault();
    const defaultProjectId = activeAssignments[0]?.id;
    if (!defaultProjectId) {
      setError(true);
      setMessage('No active project found to save credential');
      return;
    }

    try {
      await api.addMyProjectCredential({
        ...form,
        project_assignment_id: defaultProjectId,
      });
      setForm({
        login_url: '',
        username: '',
        password: '',
      });
      setError(false);
      setMessage('Credential saved');
      loadData();
    } catch (err) {
      setError(true);
      setMessage(err.message);
    }
  };

  return (
    <div className="stack">
      <section className="card">
        <h3>Office Credential</h3>
        <form className="form mt-4" onSubmit={saveCredential}>
          <div className="grid gap-4 md:grid-cols-2">
            <p className="md:col-span-2 text-xs text-slate-600">
              Credential will be saved to: <strong>{activeAssignments[0]?.project?.name ?? 'No active project'}</strong>
            </p>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Login URL</span>
              <input value={form.login_url} onChange={(e) => setForm((prev) => ({ ...prev, login_url: e.target.value }))} required />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Username</span>
              <input value={form.username} onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))} required />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Password</span>
              <input type="text" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} required />
            </label>
          </div>
          <div><button type="submit">Save Credential</button></div>
        </form>
      </section>

      <section className="card">
        <h3>My App Credentials</h3>
        <div className="mt-3 row">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Filter By Assignment</span>
            <select value={selectedAssignmentId} onChange={(e) => setSelectedAssignmentId(e.target.value)}>
              <option value="">All</option>
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>{a.id} - {a.project?.name}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>ID</th><th>Project</th><th>URL</th><th>Username</th><th>Password</th></tr>
            </thead>
            <tbody>
              {filteredCredentials.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.project?.name}</td>
                  <td>{row.login_url}</td>
                  <td>{row.username}</td>
                  <td>{row.password}</td>
                </tr>
              ))}
              {filteredCredentials.length === 0 && (
                <tr><td colSpan="5" className="text-center text-slate-500">No credentials found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Message message={message} error={error} />
    </div>
  );
}
