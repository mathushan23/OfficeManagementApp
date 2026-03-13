import { useEffect, useState } from 'react';
import { api } from '../../../api';
import { Message } from '../../../components/FormBits';

export default function BossAssignProjectTab({ refreshSignal = 0, onChanged }) {
  const [projects, setProjects] = useState([]);
  const [staffRows, setStaffRows] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [form, setForm] = useState({
    project_id: '',
    staff_id: '',
    commission_amount: '',
    deadline_at: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);

  const loadData = async () => {
    try {
      const [projectRows, staffList, assignmentRows] = await Promise.all([
        api.listProjects(),
        api.listStaffForBoss(),
        api.listBossProjectAssignments(),
      ]);
      setProjects(projectRows ?? []);
      setStaffRows(staffList ?? []);
      setAssignments(assignmentRows ?? []);
      setMessage('');
    } catch (err) {
      setError(true);
      setMessage(err.message);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshSignal]);

  const submit = async (event) => {
    event.preventDefault();
    try {
      await api.assignProject(form);
      setForm((prev) => ({ ...prev, commission_amount: '', deadline_at: '' }));
      setError(false);
      setMessage('Project assigned');
      await loadData();
      onChanged?.();
    } catch (err) {
      setError(true);
      setMessage(err.message);
    }
  };

  return (
    <div className="stack">
      <section className="card">
        <h3>Assign Project</h3>
        <form className="form mt-4" onSubmit={submit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Project</span>
              <select value={form.project_id} onChange={(e) => setForm((prev) => ({ ...prev, project_id: e.target.value }))} required>
                <option value="">Select project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.id} - {project.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Staff</span>
              <select value={form.staff_id} onChange={(e) => setForm((prev) => ({ ...prev, staff_id: e.target.value }))} required>
                <option value="">Select staff</option>
                {staffRows.map((staff) => (
                  <option key={staff.id} value={staff.id}>{staff.name} ({staff.office_id})</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Commission</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.commission_amount}
                onChange={(e) => setForm((prev) => ({ ...prev, commission_amount: e.target.value }))}
                required
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Deadline</span>
              <input
                type="datetime-local"
                value={form.deadline_at}
                onChange={(e) => setForm((prev) => ({ ...prev, deadline_at: e.target.value }))}
                required
              />
            </label>
          </div>
          <div><button type="submit">Assign Project</button></div>
        </form>
      </section>

      <section className="card">
        <h3>Assignment List</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>ID</th><th>Project</th><th>Staff</th><th>Commission</th><th>Deadline</th><th>Status</th></tr>
            </thead>
            <tbody>
              {assignments.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.project?.name}</td>
                  <td>{row.staff?.name}</td>
                  <td>{row.commission_amount}</td>
                  <td>{row.deadline_at ?? '-'}</td>
                  <td>{row.status}</td>
                </tr>
              ))}
              {assignments.length === 0 && (
                <tr><td colSpan="6" className="text-center text-slate-500">No assignments yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Message message={message} error={error} />
    </div>
  );
}
