import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { Message } from '../../components/FormBits';

const progressStatuses = ['pending', 'in_progress'];

function defaultEntry(assignmentId = '') {
  return {
    project_assignment_id: assignmentId,
    task: '',
    estimate_hours: '',
  };
}

export default function StaffAddTaskPlanPage() {
  const [assignments, setAssignments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [entries, setEntries] = useState([defaultEntry()]);
  const [planDate, setPlanDate] = useState(new Date().toISOString().slice(0, 10));
  const [planInTime, setPlanInTime] = useState('');
  const [newSubtaskByTask, setNewSubtaskByTask] = useState({});
  const [completionProofByTask, setCompletionProofByTask] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const activeAssignments = useMemo(
    () => assignments.filter((a) => ['assigned', 'in_progress', 'submitted'].includes(a.status)),
    [assignments]
  );
  const visibleTasks = useMemo(
    () => tasks.filter((task) => task.status !== 'completed'),
    [tasks]
  );

  const loadData = async () => {
    try {
      const [assignmentRows, taskRows] = await Promise.all([
        api.myProjectAssignments(),
        api.myProjectTasks(),
      ]);
      setAssignments(assignmentRows ?? []);
      setTasks(taskRows ?? []);
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

  const addRow = () => {
    setEntries((prev) => [...prev, defaultEntry(prev[0]?.project_assignment_id ?? '')]);
  };

  const removeRow = (index) => {
    setEntries((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const updateRow = (index, field, value) => {
    setEntries((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const submitTaskPlans = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payloadEntries = entries.map((entry) => ({
        ...entry,
        date: planDate,
        in_time: planInTime,
      }));
      await api.createMyProjectTaskPlan({ entries: payloadEntries });
      setEntries([defaultEntry()]);
      setError(false);
      setMessage('Task plans submitted successfully');
      loadData();
    } catch (err) {
      setError(true);
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      await api.updateMyProjectTaskStatus(taskId, status);
      setError(false);
      setMessage('Task status updated');
      loadData();
    } catch (err) {
      setError(true);
      setMessage(err.message);
    }
  };

  const completeTask = async (taskId) => {
    const file = completionProofByTask[taskId];
    if (!file) {
      setError(true);
      setMessage('Proof image is required to complete task');
      return;
    }

    try {
      await api.completeMyProjectTask(taskId, file);
      setCompletionProofByTask((prev) => ({ ...prev, [taskId]: null }));
      setError(false);
      setMessage('Task completed with proof');
      loadData();
    } catch (err) {
      setError(true);
      setMessage(err.message);
    }
  };

  const addSubtask = async (taskId) => {
    const title = (newSubtaskByTask[taskId] ?? '').trim();
    if (!title) return;
    try {
      await api.addMySubtask(taskId, title);
      setNewSubtaskByTask((prev) => ({ ...prev, [taskId]: '' }));
      setError(false);
      setMessage('Subtask added');
      loadData();
    } catch (err) {
      setError(true);
      setMessage(err.message);
    }
  };

  const toggleSubtask = async (subtask, checked) => {
    try {
      await api.updateMySubtask(subtask.id, { is_done: checked, title: subtask.title });
      setError(false);
      setMessage('Subtask updated');
      loadData();
    } catch (err) {
      setError(true);
      setMessage(err.message);
    }
  };

  return (
    <div className="stack">
      <section className="card">
        <div className="row justify-between">
          <h3>Add Task Plan</h3>
          <button type="button" className="ghost" onClick={addRow}>+ Add More</button>
        </div>
        <form className="form mt-4" onSubmit={submitTaskPlans}>
          <div className="sub-card">
            <p className="mb-3 text-sm font-bold text-slate-800">Common Plan Details</p>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Date</span>
                <input type="date" value={planDate} onChange={(e) => setPlanDate(e.target.value)} required />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">In Time</span>
                <input type="time" value={planInTime} onChange={(e) => setPlanInTime(e.target.value)} required />
              </label>
            </div>
          </div>

          {entries.map((entry, index) => (
            <div key={`entry-${index}`} className="sub-card">
              <div className="row justify-between">
                <p className="text-sm font-bold text-slate-800">Task Plan #{index + 1}</p>
                <button type="button" className="danger" onClick={() => removeRow(index)} disabled={entries.length === 1}>
                  Remove
                </button>
              </div>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-700">Select Project</span>
                  <select value={entry.project_assignment_id} onChange={(e) => updateRow(index, 'project_assignment_id', e.target.value)} required>
                    <option value="">Select Project</option>
                    {activeAssignments.map((a) => (
                      <option key={a.id} value={a.id}>{a.id} - {a.project?.name}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-700">Estimate Hours</span>
                  <input type="number" min="0.25" max="24" step="0.25" value={entry.estimate_hours} onChange={(e) => updateRow(index, 'estimate_hours', e.target.value)} required />
                </label>
                <label className="grid gap-2 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-700">Enter Task</span>
                  <input value={entry.task} onChange={(e) => updateRow(index, 'task', e.target.value)} required />
                </label>
              </div>
            </div>
          ))}
          <div>
            <button
              type="submit"
              className="!px-4 !py-2 text-xs"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Task Plans'}
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <h3>My Task Plans</h3>
        <div className="mt-4 grid gap-4">
          {visibleTasks.map((task) => (
            <div key={task.id} className="sub-card">
              <div className="row justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{task.title}</p>
                  <p className="text-xs text-slate-600">{task.project?.name} | {task.plan_date ?? '-'} | {task.in_time || '-'} | {task.estimated_hours ?? '-'}h</p>
                  <p className="text-xs text-slate-600">{task.is_carry_over ? 'Carry Over' : ''}</p>
                </div>
                {task.status !== 'completed' ? (
                  <select value={task.status} onChange={(e) => updateTaskStatus(task.id, e.target.value)}>
                    {progressStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                ) : (
                  <span className="rounded bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Completed</span>
                )}
              </div>

              {task.status !== 'completed' && (
                <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                  <p className="mb-2 text-xs font-semibold text-slate-700">Complete Task (Proof Image Required)</p>
                  <div className="row">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => setCompletionProofByTask((prev) => ({ ...prev, [task.id]: e.target.files?.[0] || null }))}
                    />
                    <button type="button" onClick={() => completeTask(task.id)}>Complete</button>
                  </div>
                </div>
              )}

              <div className="mt-3 grid gap-2">
                {(task.subtasks ?? []).map((subtask) => (
                  <label key={subtask.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(subtask.is_done)}
                      onChange={(e) => toggleSubtask(subtask, e.target.checked)}
                    />
                    <span className={subtask.is_done ? 'line-through text-slate-500' : 'text-slate-800'}>{subtask.title}</span>
                  </label>
                ))}
              </div>
              <div className="mt-3 row">
                <input
                  placeholder="New subtask"
                  value={newSubtaskByTask[task.id] ?? ''}
                  onChange={(e) => setNewSubtaskByTask((prev) => ({ ...prev, [task.id]: e.target.value }))}
                />
                <button type="button" onClick={() => addSubtask(task.id)}>Add Subtask</button>
              </div>
            </div>
          ))}
          {visibleTasks.length === 0 && <p className="muted">No pending task plans.</p>}
        </div>
      </section>

      <Message message={message} error={error} />
    </div>
  );
}
