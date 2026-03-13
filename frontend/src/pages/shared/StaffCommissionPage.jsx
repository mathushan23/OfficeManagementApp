import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import { Message } from '../../components/FormBits';

function money(value) {
  return Number(value || 0).toFixed(2);
}

export default function StaffCommissionPage({ role = 'boss', onOpenAdvanceHistory }) {
  const [rows, setRows] = useState([]);
  const [attenders, setAttenders] = useState([]);
  const [managerAttenderIds, setManagerAttenderIds] = useState([]);
  const [currentManagers, setCurrentManagers] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [staffFilterId, setStaffFilterId] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceNote, setAdvanceNote] = useState('');
  const [canManageAdvance, setCanManageAdvance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingManager, setSavingManager] = useState(false);
  const [submittingAdvance, setSubmittingAdvance] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.commissionOverview();
      setRows(Array.isArray(data?.rows) ? data.rows : []);
      const managers = Array.isArray(data?.manager_attenders) ? data.manager_attenders : [];
      setCurrentManagers(managers);
      setManagerAttenderIds(managers.map((row) => String(row.id)));
      setCanManageAdvance(Boolean(data?.can_manage_advance));
      if (role === 'boss') {
        const attenderRows = await api.listAttenders();
        setAttenders(Array.isArray(attenderRows) ? attenderRows : []);
      }
      setMessage('');
      setIsError(false);
    } catch (err) {
      setRows([]);
      setMessage(err.message);
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const staffOptions = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      if (row?.staff?.id && !map.has(row.staff.id)) {
        map.set(row.staff.id, row.staff);
      }
    });
    return Array.from(map.values());
  }, [rows]);

  const projectOptions = useMemo(
    () => rows.filter((row) => String(row?.staff?.id ?? '') === String(selectedStaffId)),
    [rows, selectedStaffId]
  );

  const filteredRows = useMemo(
    () => (
      staffFilterId
        ? rows.filter((row) => String(row?.staff?.id ?? '') === String(staffFilterId))
        : rows
    ),
    [rows, staffFilterId]
  );

  const selectedProjectRow = useMemo(
    () => rows.find((row) => String(row.project_assignment_id) === String(selectedAssignmentId)),
    [rows, selectedAssignmentId]
  );

  const saveManager = async (event) => {
    event.preventDefault();
    if (savingManager) return;
    setSavingManager(true);
    try {
      await api.setCommissionManager(managerAttenderIds.map((id) => Number(id)));
      setIsError(false);
      setMessage('Commission manager attenders updated.');
      await load();
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    } finally {
      setSavingManager(false);
    }
  };

  const submitAdvance = async (event) => {
    event.preventDefault();
    if (submittingAdvance) return;
    if (!selectedAssignmentId) {
      setIsError(true);
      setMessage('Select project first.');
      return;
    }

    const amount = Number(advanceAmount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      setIsError(true);
      setMessage('Enter valid advance amount.');
      return;
    }

    setSubmittingAdvance(true);
    try {
      await api.addCommissionAdvance({
        project_assignment_id: Number(selectedAssignmentId),
        amount,
        note: advanceNote || undefined,
      });
      setAdvanceAmount('');
      setAdvanceNote('');
      setSelectedAssignmentId('');
      setIsError(false);
      setMessage('Commission advance submitted.');
      await load();
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    } finally {
      setSubmittingAdvance(false);
    }
  };

  return (
    <div className="stack">
      {role === 'boss' && (
        <section className="card">
          <h3>Assign Attenders To Maintain Commission</h3>
          <form className="form mt-4" onSubmit={saveManager}>
            <div className="grid gap-2">
              <span className="text-sm font-semibold text-slate-700">Select Attenders</span>
              <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                {attenders.map((row) => {
                  const checked = managerAttenderIds.includes(String(row.id));
                  return (
                    <label key={row.id} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setManagerAttenderIds((prev) => (
                            e.target.checked
                              ? [...prev, String(row.id)]
                              : prev.filter((id) => id !== String(row.id))
                          ));
                        }}
                      />
                      <span>{row.name} ({row.office_id})</span>
                    </label>
                  );
                })}
                {attenders.length === 0 && <p className="muted">No attenders found.</p>}
              </div>
            </div>
            <div>
              <button type="submit" disabled={savingManager}>{savingManager ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
          <p className="muted mt-2">
            Current Assigned Attenders: {currentManagers.length > 0 ? currentManagers.map((row) => `${row.name} (${row.office_id})`).join(', ') : 'Not Assigned'}
          </p>
        </section>
      )}

      {role === 'attender' && (
        <section className="card">
          <h3>Commission Advance Entry</h3>
          {!canManageAdvance ? (
            <p className="muted mt-2">You are not assigned by boss to maintain commission.</p>
          ) : (
            <form className="form mt-4" onSubmit={submitAdvance}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-700">Select Staff</span>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => {
                      setSelectedStaffId(e.target.value);
                      setSelectedAssignmentId('');
                    }}
                    required
                  >
                    <option value="">Select staff</option>
                    {staffOptions.map((row) => (
                      <option key={row.id} value={row.id}>{row.name} ({row.office_id})</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-700">Select Project</span>
                  <select value={selectedAssignmentId} onChange={(e) => setSelectedAssignmentId(e.target.value)} required>
                    <option value="">Select project</option>
                    {projectOptions.map((row) => (
                      <option key={row.project_assignment_id} value={row.project_assignment_id}>
                        {row.project?.name} (Project #{row.project_assignment_id})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="muted">Balance Commission: {selectedProjectRow ? money(selectedProjectRow.balance) : '0.00'}</p>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-700">Advance Amount</span>
                  <input type="number" min="0.01" step="0.01" value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} required />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-slate-700">Note (Optional)</span>
                  <input value={advanceNote} onChange={(e) => setAdvanceNote(e.target.value)} />
                </label>
              </div>
              <div>
                <button type="submit" disabled={submittingAdvance}>{submittingAdvance ? 'Submitting...' : 'Submit Advance'}</button>
              </div>
            </form>
          )}
        </section>
      )}

      <section className="card">
        <div className="row justify-between">
          <h3>Staff Commission By Project</h3>
          <label className="grid gap-1 min-w-[240px]">
            <select value={staffFilterId} onChange={(e) => setStaffFilterId(e.target.value)}>
              <option value="">All Staff</option>
              {staffOptions.map((row) => (
                <option key={row.id} value={row.id}>{row.name} ({row.office_id})</option>
              ))}
            </select>
          </label>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Project #</th>
                <th>Project</th>
                <th>Staff</th>
                <th>Office ID</th>
                <th>Branch</th>
                <th>Total Commission</th>
                <th>Advanced</th>
                <th>Balance</th>
                <th>History</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.project_assignment_id}>
                  <td>{row.project_assignment_id}</td>
                  <td>{row.project?.name}</td>
                  <td>{row.staff?.name}</td>
                  <td>{row.staff?.office_id}</td>
                  <td>{row.staff?.branch}</td>
                  <td>{money(row.commission_total)}</td>
                  <td>{money(row.advance_total)}</td>
                  <td>{money(row.balance)}</td>
                  <td>
                    <button type="button" className="ghost" onClick={() => onOpenAdvanceHistory?.(row)}>
                      Advance History
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && !loading && (
                <tr>
                  <td colSpan="9" className="text-center text-slate-500">No commission project rows found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Message message={message} error={isError} />
    </div>
  );
}
