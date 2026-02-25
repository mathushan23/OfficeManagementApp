import { useState } from 'react';
import { api } from '../../api';
import { Message, TextInput } from '../../components/FormBits';

export default function BossChangePasswordPage({ token }) {
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const form = e.currentTarget;

    const fd = new FormData(form);
    const currentPin = String(fd.get('current_pin') || '').trim();
    const newPin = String(fd.get('new_pin') || '').trim();
    const confirmPin = String(fd.get('new_pin_confirmation') || '').trim();

    setMessage('');
    setIsError(false);

    if (!currentPin || !newPin || !confirmPin) {
      setIsError(true);
      setMessage('All fields are required.');
      return;
    }
    if (!/^\d{1,8}$/.test(currentPin) || !/^\d{1,8}$/.test(newPin) || !/^\d{1,8}$/.test(confirmPin)) {
      setIsError(true);
      setMessage('PIN must contain only numbers (1 to 8 digits).');
      return;
    }
    if (newPin === currentPin) {
      setIsError(true);
      setMessage('New PIN must be different from current PIN.');
      return;
    }
    if (newPin !== confirmPin) {
      setIsError(true);
      setMessage('New PIN confirmation does not match.');
      return;
    }

    try {
      setSubmitting(true);
      const result = await api.changePin({
        current_pin: currentPin,
        new_pin: newPin,
        new_pin_confirmation: confirmPin,
      });
      setIsError(false);
      setMessage(result.message ?? 'Password updated successfully.');
      form.reset();
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="card">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-xl text-white shadow-lg">
          {'\u{1F512}'}
        </div>
        <h3 className="text-xl font-bold text-slate-900">Change Password</h3>
      </div>
      <form className="form" onSubmit={submit}>
        <TextInput label="Current PIN" name="current_pin" type="password" inputMode="numeric" pattern="^[0-9]{1,8}$" maxLength="8" required />
        <TextInput label="New PIN" name="new_pin" type="password" inputMode="numeric" pattern="^[0-9]{1,8}$" maxLength="8" required />
        <TextInput label="Confirm New PIN" name="new_pin_confirmation" type="password" inputMode="numeric" pattern="^[0-9]{1,8}$" maxLength="8" required />
        <button type="submit" disabled={submitting}>
          {submitting ? 'Updating...' : 'Update Password'}
        </button>
      </form>
      <Message message={message} error={isError} />
    </section>
  );
}
