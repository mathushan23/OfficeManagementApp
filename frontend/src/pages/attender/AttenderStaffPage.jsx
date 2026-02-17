import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Message, SelectInput, TextInput } from '../../components/FormBits';
import useAutoRefresh from '../../hooks/useAutoRefresh';

const toDateInputValue = (value) => {
  if (!value) return '';
  return String(value).split('T')[0];
};

function StaffForm({ onSubmit, defaultStatus = 'currently_working', submitText = 'Save', submitting = false, initial = {}, modalMode = false }) {
  const [employmentType, setEmploymentType] = useState(initial.employment_type ?? 'permanent');

  useEffect(() => {
    setEmploymentType(initial.employment_type ?? 'permanent');
  }, [initial.employment_type]);

  return (
    <form className="form" onSubmit={onSubmit}>
      <TextInput label="Name" name="name" minLength="2" defaultValue={initial.name ?? ''} required />
      <TextInput label="Office ID" name="office_id" pattern="^[A-Za-z0-9_-]{2,20}$" title="2-20 letters/numbers/_/-" defaultValue={initial.office_id ?? ''} required disabled={Boolean(initial.id)} />
      <SelectInput label="Branch" name="branch" defaultValue={(initial.branch ?? 'main').toLowerCase()} required>
        <option value="main">Main</option>
        <option value="sm">SM</option>
      </SelectInput>
      <TextInput label="Joining Date" name="joining_date" type="date" defaultValue={toDateInputValue(initial.joining_date)} required />
      <SelectInput label="Employment Type" name="employment_type" value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} required>
        <option value="permanent">Permanent</option>
        <option value="intern">Intern</option>
      </SelectInput>
      {employmentType === 'intern' && (
        <TextInput label="Intern End Date" name="intern_end_date" type="date" defaultValue={toDateInputValue(initial.intern_end_date)} required />
      )}
      <TextInput label="PIN" name="pin" inputMode="numeric" pattern="^[0-9]{1,8}$" maxLength="8" placeholder="Leave empty to keep same" />
      <TextInput label="Email" name="email" type="email" defaultValue={initial.email ?? ''} />
      <SelectInput label="Status" name="status" defaultValue={initial.status ?? defaultStatus}>
        <option value="currently_working">Currently Working</option>
        <option value="leaved">Leaved</option>
      </SelectInput>
      <button type="submit" disabled={submitting}>
        {submitting ? 'Saving...' : submitText}
      </button>
    </form>
  );
}

export default function AttenderStaffPage({ token }) {
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  const load = async () => {
    try {
      setRows(await api.listStaff(token));
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);
  useAutoRefresh(load, 30000, [token]);
  useEffect(() => {
    if (!editing) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [editing]);

  const validateProfile = (fd, isUpdate = false) => {
    const name = String(fd.get('name') || '').trim();
    const officeId = String(fd.get('office_id') || '').trim();
    const branch = String(fd.get('branch') || '').trim().toLowerCase();
    const pin = String(fd.get('pin') || '').trim();
    const email = String(fd.get('email') || '').trim();
    const employmentType = String(fd.get('employment_type') || 'permanent');
    const joiningDate = String(fd.get('joining_date') || '').trim();
    const internEnd = String(fd.get('intern_end_date') || '').trim();

    if (name.length < 2) return 'Name must be at least 2 characters.';
    if (!isUpdate && !officeId) return 'Office ID is required.';
    if (!isUpdate && !/^[A-Za-z0-9_-]{2,20}$/.test(officeId)) return 'Office ID must be 2-20 characters (letters, numbers, _ or -).';
    if (!['main', 'sm'].includes(branch)) return 'Branch must be Main or SM.';
    if (!isUpdate && !/^\d{1,8}$/.test(pin)) return 'PIN must contain only numbers (1 to 8 digits).';
    if (isUpdate && pin && !/^\d{1,8}$/.test(pin)) return 'PIN must contain only numbers (1 to 8 digits).';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.';
    if (!joiningDate || !/^\d{4}-\d{2}-\d{2}$/.test(joiningDate)) return 'Joining date is required.';
    if (employmentType === 'intern' && !internEnd) return 'Intern end date is required for intern.';
    if (internEnd && joiningDate && internEnd < joiningDate) return 'Intern end date must be after joining date.';
    return null;
  };

  const createStaff = async (e) => {
    e.preventDefault();
    if (creating) return;
    const form = e.currentTarget;
    setMessage('');
    setIsError(false);
    setCreating(true);
    const fd = new FormData(form);
    const validationError = validateProfile(fd, false);
    if (validationError) {
      setCreating(false);
      setIsError(true);
      setMessage(validationError);
      return;
    }
    const payload = {
      name: String(fd.get('name') || '').trim(),
      office_id: String(fd.get('office_id') || '').trim(),
      branch: String(fd.get('branch') || '').trim().toLowerCase(),
      pin: String(fd.get('pin') || '').trim(),
      email: String(fd.get('email') || '').trim() || null,
      status: fd.get('status'),
      joining_date: String(fd.get('joining_date') || '').trim() || null,
      employment_type: String(fd.get('employment_type') || 'permanent'),
      intern_end_date: String(fd.get('intern_end_date') || '').trim() || null,
    };
    try {
      await api.createStaff(token, payload);
      setMessage('Staff added.');
      form.reset();
      load();
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    } finally {
      setCreating(false);
    }
  };

  const updateStaff = async (e, staffId) => {
    e.preventDefault();
    if (updating) return;
    setMessage('');
    setIsError(false);
    setUpdating(true);
    const fd = new FormData(e.currentTarget);
    const validationError = validateProfile(fd, true);
    if (validationError) {
      setUpdating(false);
      setIsError(true);
      setMessage(validationError);
      return;
    }
    const payload = {
      name: String(fd.get('name') || '').trim(),
      branch: String(fd.get('branch') || '').trim().toLowerCase(),
      status: fd.get('status'),
      email: String(fd.get('email') || '').trim() || null,
      joining_date: String(fd.get('joining_date') || '').trim() || null,
      employment_type: String(fd.get('employment_type') || 'permanent'),
      intern_end_date: String(fd.get('intern_end_date') || '').trim() || null,
    };
    if (fd.get('pin')) payload.pin = String(fd.get('pin') || '').trim();

    try {
      await api.updateStaff(token, staffId, payload);
      setMessage('Staff updated.');
      setEditing(null);
      load();
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return '-';
    return String(value).split('T')[0];
  };

  return (
    <div className="stack">
      <section className="card">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-xl text-white shadow-lg">
            👤
          </div>
          <h3 className="text-xl font-bold text-slate-900">Add Staff</h3>
        </div>
        <StaffForm onSubmit={createStaff} submitText="Add Staff" submitting={creating} />
      </section>

      <section className="card">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-xl text-white shadow-lg">
            📋
          </div>
          <h3 className="text-xl font-bold text-slate-900">View / Edit Staff</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>ID</th><th>Name</th><th>Office ID</th><th>Branch</th><th>Joined Date</th><th>Type</th><th>Intern End Date</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.name}</td>
                  <td>{row.office_id}</td>
                  <td>{row.branch}</td>
                  <td>{formatDate(row.joining_date)}</td>
                  <td>{row.employment_type ?? 'permanent'}</td>
                  <td>
                    {(row.employment_type ?? 'permanent') === 'intern'
                      ? formatDate(row.effective_intern_end_date ?? row.intern_end_date)
                      : '-'}
                  </td>
                  <td>{row.status}</td>
                  <td><button onClick={() => setEditing(row)}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center p-2 sm:p-4">
          <div
            className="absolute inset-0 bg-slate-900/55"
            onClick={() => setEditing(null)}
          />
          <section className="card transform-none relative z-10 max-h-[96vh] w-full max-w-[calc(100vw-12px)] overflow-hidden p-0 sm:max-h-[92vh] sm:max-w-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-3 sm:gap-3 sm:px-5 sm:py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-xl text-white shadow-lg">
                  ✏️
                </div>
                <h3 className="text-lg font-bold text-slate-900 sm:text-xl">Edit Staff #{editing.id}</h3>
              </div>
              <button type="button" className="ghost px-3 py-2 text-xs sm:text-sm" onClick={() => setEditing(null)}>Close</button>
            </div>
            <div className="max-h-[calc(96vh-72px)] overflow-y-auto overscroll-contain px-3 py-3 pb-24 sm:max-h-[calc(92vh-84px)] sm:px-5 sm:py-4 sm:pb-10">
              <StaffForm initial={editing} onSubmit={(e) => updateStaff(e, editing.id)} submitText="Update Staff" submitting={updating} modalMode />
            </div>
          </section>
        </div>
      )}
      <Message message={message} error={isError} />
    </div>
  );
}

