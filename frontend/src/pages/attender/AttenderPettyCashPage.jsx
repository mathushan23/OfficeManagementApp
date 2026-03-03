import { useEffect, useRef, useState } from 'react';
import { api, resolveImageUrl } from '../../api';
import { Message, TextInput } from '../../components/FormBits';

const LOW_BALANCE_THRESHOLD = 1000;

function formatCurrency(amount) {
  const value = Number(amount || 0);
  return `LKR ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function AttenderPettyCashPage() {
  const [summary, setSummary] = useState({
    threshold: LOW_BALANCE_THRESHOLD,
    balance: 0,
    is_low_balance: true,
  });
  const [pettyCashHistory, setPettyCashHistory] = useState([]);
  const [expenseHistory, setExpenseHistory] = useState([]);
  const [form, setForm] = useState({ amount: '', expense_date: todayIso(), note: '' });
  const [proofImage, setProofImage] = useState(null);
  const proofInputRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const loadSummary = async () => {
    const data = await api.attenderPettyCashSummary();
    setSummary({
      threshold: Number(data?.threshold || LOW_BALANCE_THRESHOLD),
      balance: Number(data?.balance || 0),
      is_low_balance: Boolean(data?.is_low_balance),
    });
  };

  const loadHistory = async () => {
    const data = await api.attenderPettyCashHistory();
    setPettyCashHistory(Array.isArray(data?.petty_cash_history) ? data.petty_cash_history : []);
    setExpenseHistory(Array.isArray(data?.expense_history) ? data.expense_history : []);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadSummary(), loadHistory()]);
      setMessage('');
      setIsError(false);
    } catch (err) {
      setIsError(true);
      setMessage(err.message || 'Failed to load petty cash data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const submitExpense = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const amount = Number(form.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      setIsError(true);
      setMessage('Amount must be greater than 0.');
      return;
    }
    if (!form.note.trim()) {
      setIsError(true);
      setMessage('Expense note is required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append('amount', String(amount));
      payload.append('expense_date', form.expense_date || todayIso());
      payload.append('note', form.note.trim());
      if (proofImage) {
        payload.append('proof_image', proofImage);
      }

      await api.submitAttenderExpense(payload);
      setForm((prev) => ({ ...prev, amount: '', note: '' }));
      setProofImage(null);
      if (proofInputRef.current) {
        proofInputRef.current.value = '';
      }
      setIsError(false);
      setMessage('Expense added successfully.');
      await Promise.all([loadSummary(), loadHistory()]);
    } catch (err) {
      setIsError(true);
      setMessage(err.message || 'Failed to add expense.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="stack">
      <section className="card">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-xl text-white shadow-lg">
              💸
            </div>
            <h3 className="text-xl font-bold text-slate-900">Petty Cash</h3>
          </div>
          <button type="button" className="ghost" onClick={loadAll} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current Balance</p>
            <p className={`mt-1 text-lg font-bold ${summary.is_low_balance ? 'text-rose-600' : 'text-emerald-700'}`}>
              {formatCurrency(summary.balance)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Low-Balance Threshold</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(summary.threshold)}</p>
          </div>
        </div>

        {summary.is_low_balance && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            Your petty cash balance is below LKR 1000. Boss is notified.
          </div>
        )}

        <form className="form rounded-2xl border border-slate-200 p-4" onSubmit={submitExpense}>
          <h4 className="mb-2 text-base font-bold text-slate-900">Add Expense (Direct)</h4>
          <TextInput
            label="Expense Amount (LKR)"
            type="number"
            step="0.01"
            min="0.01"
            value={form.amount}
            onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
            required
          />
          <TextInput
            label="Expense Date"
            type="date"
            value={form.expense_date}
            onChange={(e) => setForm((prev) => ({ ...prev, expense_date: e.target.value }))}
            required
          />
          <TextInput
            label="Expense Note"
            value={form.note}
            onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
            maxLength="255"
            required
          />
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-700">Proof Image (Optional)</span>
            <input
              ref={proofInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none ring-orange-400/30 transition-all duration-200 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-orange-700 hover:file:bg-orange-200 focus:border-orange-400 focus:ring-4"
              onChange={(e) => setProofImage(e.target.files?.[0] ?? null)}
            />
          </label>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Add Expense'}
          </button>
        </form>
      </section>

      <section className="card">
        <h4 className="mb-4 text-lg font-bold text-slate-900">Petty Cash Added History</h4>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Added By</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {pettyCashHistory.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.transaction_date}</td>
                  <td>{formatCurrency(row.amount)}</td>
                  <td>{row.created_by?.name || '-'}</td>
                  <td>{row.note || '-'}</td>
                </tr>
              ))}
              {pettyCashHistory.length === 0 && (
                <tr>
                  <td colSpan={5}>No petty cash credit history.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h4 className="mb-4 text-lg font-bold text-slate-900">Expense History</h4>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Recorded By</th>
                <th>Note</th>
                <th>Proof</th>
              </tr>
            </thead>
            <tbody>
              {expenseHistory.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.transaction_date}</td>
                  <td>{formatCurrency(row.amount)}</td>
                  <td>{row.created_by?.name || '-'}</td>
                  <td>{row.note || '-'}</td>
                  <td>
                    {row.proof_image_url ? (
                      <a href={resolveImageUrl(row.proof_image_url)} target="_blank" rel="noreferrer">
                        <img
                          src={resolveImageUrl(row.proof_image_url)}
                          alt="Expense proof"
                          className="h-14 w-14 rounded border border-slate-200 object-cover"
                        />
                      </a>
                    ) : '-'}
                  </td>
                </tr>
              ))}
              {expenseHistory.length === 0 && (
                <tr>
                  <td colSpan={6}>No expense history.</td>
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
