import { useState } from 'react';
import { api } from '../api';
import { Message, TextInput } from '../components/FormBits';
import BrandLogo from '../components/BrandLogo';

export default function LoginPage({ onLogin }) {
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const cleanPin = pin.trim();
    if (!/^\d{1,8}$/.test(cleanPin)) {
      setIsError(true);
      setMessage('PIN must contain only numbers (1 to 8 digits).');
      return;
    }
    setMessage('');
    setIsError(false);
    setSubmitting(true);
    try {
      const auth = await api.login(cleanPin);
      onLogin(auth);
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-orange-100 via-slate-100 to-slate-200 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <BrandLogo dark size="sm" className="mx-auto mb-5 max-w-full" />
          <h1 className="mb-2 text-3xl font-bold text-slate-900">Office Management</h1>
          <p className="text-sm text-slate-600">Sign in to your account</p>
        </div>

        <form className="rounded-3xl border border-slate-200/80 bg-white/90 p-8 shadow-2xl shadow-slate-900/10 backdrop-blur-sm" onSubmit={submit}>
          <TextInput
            label="PIN"
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter your PIN"
            inputMode="numeric"
            maxLength="8"
            required
          />
          <button
            type="submit"
            disabled={submitting}
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#fd7e14] to-orange-500 px-4 py-3 font-bold text-white shadow-lg shadow-orange-500/40 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-orange-500/50 active:scale-[0.98]"
          >
            {submitting ? 'Signing In...' : 'Sign In'}
          </button>
          <Message message={message} error={isError} />
        </form>
      </div>
    </div>
  );
}
