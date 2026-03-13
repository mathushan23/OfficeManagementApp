import { useEffect, useState } from 'react';
import { api } from '../../../api';
import { Message } from '../../../components/FormBits';

export default function AttenderAssignedProjectsPage() {
  const [assignments, setAssignments] = useState([]);
  const [assignmentDetails, setAssignmentDetails] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);

  const setToast = (text, isError = false) => {
    setError(isError);
    setMessage(text);
  };

  const loadAssignments = async () => {
    try {
      const rows = await api.listProjectAssignments();
      setAssignments(rows ?? []);
      setToast('');
    } catch (err) {
      setToast(err.message, true);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, []);

  const openAssignment = async (assignmentId) => {
    try {
      const details = await api.getProjectAssignment(assignmentId);
      setAssignmentDetails(details);
    } catch (err) {
      setToast(err.message, true);
    }
  };

  return (
    <div className="stack">
      <section className="card">
        <h3>Assigned Projects (Branch)</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Assignment ID</th><th>Project</th><th>Staff</th><th>Deadline</th><th>Status</th><th>Tasks</th></tr>
            </thead>
            <tbody>
              {assignments.map((row) => (
                <tr key={row.id}>
                  <td>
                    <button className="bg-transparent p-0 text-left font-semibold text-orange-600 hover:text-orange-500" onClick={() => openAssignment(row.id)}>
                      {row.id}
                    </button>
                  </td>
                  <td>{row.project?.name}</td>
                  <td>{row.staff?.name}</td>
                  <td>{row.deadline_at ?? '-'}</td>
                  <td>{row.status}</td>
                  <td>{row.task_counts?.completed ?? 0}/{row.task_counts?.total ?? 0}</td>
                </tr>
              ))}
              {assignments.length === 0 && (
                <tr><td colSpan="6" className="text-center text-slate-500">No assignments found for your branch.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {assignmentDetails && (
        <section className="card">
          <h3>Assignment Detail #{assignmentDetails.id}</h3>
          <p className="muted mt-1">{assignmentDetails.project?.name} | {assignmentDetails.staff?.name} | {assignmentDetails.status}</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Task ID</th><th>Task</th><th>Status</th><th>Plan Date</th><th>Deadline</th><th>Subtasks</th></tr>
              </thead>
              <tbody>
                {(assignmentDetails.tasks ?? []).map((task) => (
                  <tr key={task.id}>
                    <td>{task.id}</td>
                    <td>{task.title}</td>
                    <td>{task.status}</td>
                    <td>{task.plan_date ?? '-'}</td>
                    <td>{task.deadline_at ?? '-'}</td>
                    <td>{(task.subtasks ?? []).length}</td>
                  </tr>
                ))}
                {(assignmentDetails.tasks ?? []).length === 0 && (
                  <tr><td colSpan="6" className="text-center text-slate-500">No tasks yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <Message message={message} error={error} />
    </div>
  );
}
