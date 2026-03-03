import { useEffect, useMemo, useState } from 'react';
import { api, resolveImageUrl } from '../../api';
import { Message, SelectInput, TextInput } from '../../components/FormBits';

const LOW_BALANCE_THRESHOLD = 1000;

function formatCurrency(amount) {
  const value = Number(amount || 0);
  return `LKR ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function BossPettyCashPage({ onLowBalanceCountChange }) {
  const [attenders, setAttenders] = useState([]);
  const [selectedAttenderId, setSelectedAttenderId] = useState('');

  const [summary, setSummary] = useState({
    threshold: LOW_BALANCE_THRESHOLD,
    overall_balance: 0,
    low_balance_count: 0,
    low_balances: [],
    balances: [],
  });
  const [pettyCashHistory, setPettyCashHistory] = useState([]);
  const [expenseHistory, setExpenseHistory] = useState([]);

  const [addCashForm, setAddCashForm] = useState({ attender_id: '', amount: '', transaction_date: todayIso(), note: '' });
  const [loading, setLoading] = useState(true);
  const [submittingCash, setSubmittingCash] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const selectedBalance = useMemo(() => {
    if (!selectedAttenderId) return null;
    const row = (summary.balances || []).find((item) => String(item.attender_id) === String(selectedAttenderId));
    return row ?? null;
  }, [selectedAttenderId, summary.balances]);

  const syncLowBalanceCount = (count) => {
    if (typeof onLowBalanceCountChange === 'function') {
      onLowBalanceCountChange(Number(count || 0));
    }
  };

  const loadAttenders = async () => {
    const rows = await api.listAttenders();
    setAttenders(Array.isArray(rows) ? rows : []);
  };

  const loadSummary = async () => {
    const data = await api.pettyCashSummary();
    setSummary({
      threshold: Number(data?.threshold || LOW_BALANCE_THRESHOLD),
      overall_balance: Number(data?.overall_balance || 0),
      low_balance_count: Number(data?.low_balance_count || 0),
      low_balances: Array.isArray(data?.low_balances) ? data.low_balances : [],
      balances: Array.isArray(data?.balances) ? data.balances : [],
    });
    syncLowBalanceCount(data?.low_balance_count || 0);
  };

  const loadHistory = async (attenderId = selectedAttenderId) => {
    const data = await api.pettyCashHistory(attenderId);
    setPettyCashHistory(Array.isArray(data?.petty_cash_history) ? data.petty_cash_history : []);
    setExpenseHistory(Array.isArray(data?.expense_history) ? data.expense_history : []);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadAttenders(), loadSummary(), loadHistory('')]);
      setIsError(false);
      setMessage('');
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

  useEffect(() => {
    loadHistory(selectedAttenderId).catch((err) => {
      setIsError(true);
      setMessage(err.message || 'Failed to load petty cash history.');
    });
  }, [selectedAttenderId]);

  const handleAddCash = async (e) => {
    e.preventDefault();
    if (submittingCash) return;

    const attenderId = Number(addCashForm.attender_id || 0);
    const amount = Number(addCashForm.amount || 0);
    if (!attenderId) {
      setIsError(true);
      setMessage('Please select an attender.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setIsError(true);
      setMessage('Amount must be greater than 0.');
      return;
    }

    setSubmittingCash(true);
    try {
      await api.addPettyCash({
        attender_id: attenderId,
        amount,
        transaction_date: addCashForm.transaction_date || todayIso(),
        note: addCashForm.note.trim() || null,
      });
      setAddCashForm((prev) => ({ ...prev, amount: '', note: '' }));
      setIsError(false);
      setMessage('Petty cash added successfully.');
      await Promise.all([loadSummary(), loadHistory(selectedAttenderId)]);
    } catch (err) {
      setIsError(true);
      setMessage(err.message || 'Failed to add petty cash.');
    } finally {
      setSubmittingCash(false);
    }
  };

  return (
    <div className="stack">
      <section className="card">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-xl text-white shadow-lg">
              💵
            </div>
            <h3 className="text-xl font-bold text-slate-900">Petty Cash</h3>
          </div>
          <button type="button" className="ghost" onClick={loadAll} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overall Balance</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(summary.overall_balance)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Low-Balance Attenders</p>
            <p className="mt-1 text-lg font-bold text-rose-600">{summary.low_balance_count}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Low-Balance Threshold</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(summary.threshold)}</p>
          </div>
        </div>

        {summary.low_balance_count > 0 && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            <p className="font-semibold">Low balance alert (below LKR 1000)</p>
            <p className="mt-1">
              {summary.low_balances.map((row) => `${row.attender_name} (${formatCurrency(row.balance)})`).join(', ')}
            </p>
          </div>
        )}

        <form className="form rounded-2xl border border-slate-200 p-4" onSubmit={handleAddCash}>
          <h4 className="mb-2 text-base font-bold text-slate-900">Add Petty Cash</h4>
          <SelectInput
            label="Attender"
            value={addCashForm.attender_id}
            onChange={(e) => setAddCashForm((prev) => ({ ...prev, attender_id: e.target.value }))}
            required
          >
            <option value="">Select attender</option>
            {attenders.map((row) => (
              <option key={row.id} value={row.id}>{row.name} ({row.office_id})</option>
            ))}
          </SelectInput>
          <TextInput
            label="Amount (LKR)"
            type="number"
            step="0.01"
            min="0.01"
            value={addCashForm.amount}
            onChange={(e) => setAddCashForm((prev) => ({ ...prev, amount: e.target.value }))}
            required
          />
          <TextInput
            label="Date"
            type="date"
            value={addCashForm.transaction_date}
            onChange={(e) => setAddCashForm((prev) => ({ ...prev, transaction_date: e.target.value }))}
            required
          />
          <TextInput
            label="Note (Optional)"
            value={addCashForm.note}
            onChange={(e) => setAddCashForm((prev) => ({ ...prev, note: e.target.value }))}
            maxLength="255"
          />
          <button type="submit" disabled={submittingCash}>{submittingCash ? 'Saving...' : 'Add Cash'}</button>
        </form>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <SelectInput
              label="Filter History by Attender"
              value={selectedAttenderId}
              onChange={(e) => setSelectedAttenderId(e.target.value)}
            >
              <option value="">All attenders</option>
              {attenders.map((row) => (
                <option key={row.id} value={row.id}>{row.name} ({row.office_id})</option>
              ))}
            </SelectInput>
            {selectedBalance && (
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                <p className="text-xs text-slate-500">Selected Attender Balance</p>
                <p className={`font-bold ${selectedBalance.balance < LOW_BALANCE_THRESHOLD ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {formatCurrency(selectedBalance.balance)}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="card">
        <h4 className="mb-4 text-lg font-bold text-slate-900">Petty Cash History</h4>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Attender</th>
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
                  <td>{row.attender?.name || '-'}</td>
                  <td>{formatCurrency(row.amount)}</td>
                  <td>{row.created_by?.name || '-'}</td>
                  <td>{row.note || '-'}</td>
                </tr>
              ))}
              {pettyCashHistory.length === 0 && (
                <tr>
                  <td colSpan={6}>No petty cash records found.</td>
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
                <th>Attender</th>
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
                  <td>{row.attender?.name || '-'}</td>
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
                  <td colSpan={7}>No expense records found.</td>
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
