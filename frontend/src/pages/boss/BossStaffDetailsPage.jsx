import { useEffect, useRef, useState } from 'react';
import { api } from '../../api';
import { Message } from '../../components/FormBits';

function formatDate(value) {
  if (!value) return '-';
  return String(value).split('T')[0];
}

export default function BossStaffDetailsPage({ token }) {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');
  const detailsRef = useRef(null);

  const load = async () => {
    try {
      setRows(await api.listStaffForBoss(token));
      setMessage('');
    } catch (err) {
      setMessage(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selectStaff = (row) => {
    setSelected(row);
    setTimeout(() => {
      detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  return (
    <div className="stack">
      <section className="card">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 text-xl text-white shadow-lg">
              {'\u{1F465}'}
            </div>
            <h3 className="text-xl font-bold text-slate-900">Staff Details</h3>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>ID</th><th>Name</th><th>Office ID</th><th>Branch</th><th>Date of Birth</th><th>Joined Date</th><th>Type</th><th>Actual Intern End</th><th>Extended Intern End</th><th>Status</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>
                    <button className="bg-transparent p-0 text-left font-semibold text-orange-600 hover:text-orange-500" onClick={() => selectStaff(row)}>
                      {row.name}
                    </button>
                  </td>
                  <td>{row.office_id}</td>
                  <td>{row.branch}</td>
                  <td>{formatDate(row.date_of_birth)}</td>
                  <td>{formatDate(row.joining_date)}</td>
                  <td>{row.employment_type ?? 'permanent'}</td>
                  <td>{(row.employment_type ?? 'permanent') === 'intern' ? formatDate(row.intern_end_date) : '-'}</td>
                  <td>{(row.employment_type ?? 'permanent') === 'intern' ? formatDate(row.effective_intern_end_date ?? row.intern_end_date) : '-'}</td>
                  <td>{row.status}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan="10" className="text-center text-slate-500">No staff records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <section ref={detailsRef} className="card">
          <h3 className="mb-4 text-xl font-bold text-slate-900">Selected Staff Details - {selected.name}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <p><span className="font-semibold">ID:</span> {selected.id}</p>
            <p><span className="font-semibold">Office ID:</span> {selected.office_id}</p>
            <p><span className="font-semibold">Branch:</span> {selected.branch}</p>
            <p><span className="font-semibold">Date of Birth:</span> {formatDate(selected.date_of_birth)}</p>
            <p><span className="font-semibold">Joined Date:</span> {formatDate(selected.joining_date)}</p>
            <p><span className="font-semibold">Type:</span> {selected.employment_type ?? 'permanent'}</p>
            <p><span className="font-semibold">Actual Intern End Date:</span> {(selected.employment_type ?? 'permanent') === 'intern' ? formatDate(selected.intern_end_date) : '-'}</p>
            <p><span className="font-semibold">Extended Intern End Date:</span> {(selected.employment_type ?? 'permanent') === 'intern' ? formatDate(selected.effective_intern_end_date ?? selected.intern_end_date) : '-'}</p>
            <p><span className="font-semibold">Status:</span> {selected.status}</p>
            <p><span className="font-semibold">Email:</span> {selected.email || '-'}</p>
          </div>
        </section>
      )}

      <Message message={message} error />
    </div>
  );
}

