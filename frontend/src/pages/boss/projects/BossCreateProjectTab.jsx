import { useEffect, useState } from 'react';
import { api } from '../../../api';
import { Message } from '../../../components/FormBits';

export default function BossCreateProjectTab({ refreshSignal = 0, onChanged }) {
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({ name: '', description: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);

  const loadProjects = async () => {
    try {
      const rows = await api.listProjects();
      setProjects(rows ?? []);
      setMessage('');
    } catch (err) {
      setError(true);
      setMessage(err.message);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [refreshSignal]);

  const submit = async (event) => {
    event.preventDefault();
    try {
      await api.createProject(form);
      setForm({ name: '', description: '' });
      setError(false);
      setMessage('Project created');
      await loadProjects();
      onChanged?.();
    } catch (err) {
      setError(true);
      setMessage(err.message);
    }
  };

  return (
    <div className="stack">
      <section className="card">
        <h3>Create Project</h3>
        <form className="form mt-4" onSubmit={submit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Project Name</span>
              <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
            </label>
            <label className="grid gap-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Description (Optional)</span>
              <textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
            </label>
          </div>
          <div><button type="submit">Add Project</button></div>
        </form>
      </section>

      <section className="card">
        <h3>Project List</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>ID</th><th>Name</th><th>Description</th><th>Status</th><th>Created At</th></tr>
            </thead>
            <tbody>
              {projects.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.name}</td>
                  <td>{row.description || '-'}</td>
                  <td>{row.status}</td>
                  <td>{row.created_at ? String(row.created_at).replace('T', ' ').slice(0, 19) : '-'}</td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr><td colSpan="5" className="text-center text-slate-500">No projects yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Message message={message} error={error} />
    </div>
  );
}
