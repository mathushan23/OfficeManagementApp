import { useEffect, useRef } from 'react';
import Swal from 'sweetalert2';

export function Message({ message, error }) {
  const lastMessageRef = useRef('');

  useEffect(() => {
    if (!message || message === lastMessageRef.current) {
      return;
    }
    lastMessageRef.current = message;

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: error ? 'error' : 'success',
      title: message,
      showConfirmButton: false,
      timer: 2600,
      timerProgressBar: true,
      customClass: {
        popup: 'swal-small-toast',
        title: 'swal-small-toast-title',
      },
    });
  }, [message, error]);

  return null;
}

export function TextInput({ label, ...props }) {
  const handleWheel = (event) => {
    if (props.type === 'number') {
      event.currentTarget.blur();
    }
    if (typeof props.onWheel === 'function') {
      props.onWheel(event);
    }
  };

  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none ring-orange-400/30 transition-all duration-200 placeholder:text-slate-400 focus:border-orange-400 focus:ring-4"
        {...props}
        onWheel={handleWheel}
      />
    </label>
  );
}

export function SelectInput({ label, children, ...props }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <select className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-slate-900 outline-none ring-orange-400/30 transition-all duration-200 focus:border-orange-400 focus:ring-4" {...props}>
        {children}
      </select>
    </label>
  );
}
