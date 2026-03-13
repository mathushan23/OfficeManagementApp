import { useEffect, useState } from 'react';
import { api } from '../../api';
import RoleLayout from '../../components/RoleLayout';
import StaffLeavePage from './StaffLeavePage';
import StaffTaskLogPage from './StaffTaskLogPage';
import StaffTaskLogHistoryPage from './StaffTaskLogHistoryPage';
import StaffMyProjectsPage from './StaffMyProjectsPage';
import StaffAddTaskPlanPage from './StaffAddTaskPlanPage';
import StaffAppCredentialsPage from './StaffAppCredentialsPage';
import StaffBirthdayPopup from '../../components/StaffBirthdayPopup';
import LeaveCountsPage from '../shared/LeaveCountsPage';
import { Message } from '../../components/FormBits';

const menu = [
  { key: 'my-projects', label: 'My Projects' },
  { key: 'add-task-plan', label: 'Add Task Plan' },
  { key: 'app-credentials', label: 'Office Credential' },
  { key: 'tasklog', label: 'Add Task Log' },
  { key: 'tasklog-history', label: 'My Tasklog History' },
  { key: 'leave', label: 'Leave Request' },
  { key: 'leave-counts', label: 'My Leave Count' },
];

export default function StaffDashboard({ user, token, onLogout, onUserUpdated }) {
  const [active, setActive] = useState('my-projects');
  const [birthdayCards, setBirthdayCards] = useState([]);
  const [birthdayCardIndex, setBirthdayCardIndex] = useState(0);
  const [showBirthdayPopup, setShowBirthdayPopup] = useState(false);
  const [staffUser, setStaffUser] = useState(user);
  const [showInternExtendPopup, setShowInternExtendPopup] = useState(false);
  const [internExtendDays, setInternExtendDays] = useState('7');
  const [internStatus, setInternStatus] = useState(null);
  const [submittingInternExtend, setSubmittingInternExtend] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    setStaffUser(user);
  }, [user]);

  useEffect(() => {
    let mounted = true;
    const dismissKey = `om:dismiss:staff-birthday-popup:${user?.id ?? 'unknown'}`;

    const loadBirthdayCards = async () => {
      try {
        const data = await api.branchBirthdayWishCards();
        if (!mounted) return;
        const dismissed = typeof window !== 'undefined' && window.sessionStorage?.getItem(dismissKey) === '1';
        if (Array.isArray(data) && data.length > 0) {
          setBirthdayCards(data);
          setBirthdayCardIndex(0);
          setShowBirthdayPopup(!dismissed);
        } else {
          setBirthdayCards([]);
          setBirthdayCardIndex(0);
          setShowBirthdayPopup(false);
        }
      } catch {
        if (!mounted) return;
        setBirthdayCards([]);
        setBirthdayCardIndex(0);
        setShowBirthdayPopup(false);
      }
    };

    loadBirthdayCards();
    return () => {
      mounted = false;
    };
  }, [token, user?.id]);

  useEffect(() => {
    let mounted = true;
    const dismissKey = `om:dismiss:intern-extend-popup:${user?.id ?? 'unknown'}`;

    const loadInternStatus = async () => {
      try {
        const data = await api.myInternExtensionStatus();
        if (!mounted) return;
        setInternStatus(data ?? null);
        const dismissed = typeof window !== 'undefined' && window.sessionStorage?.getItem(dismissKey) === '1';
        setShowInternExtendPopup(Boolean(data?.should_prompt) && !dismissed);
      } catch {
        if (!mounted) return;
        setInternStatus(null);
        setShowInternExtendPopup(false);
      }
    };

    loadInternStatus();
    return () => {
      mounted = false;
    };
  }, [token, user?.id]);

  const uploadProfilePhoto = async (file) => {
    const updated = await api.updateMyProfilePhoto(file);
    setStaffUser(updated);
    onUserUpdated?.(updated);
  };

  const handleCloseBirthdayPopup = () => {
    const dismissKey = `om:dismiss:staff-birthday-popup:${user?.id ?? 'unknown'}`;
    if (birthdayCardIndex < birthdayCards.length - 1) {
      setBirthdayCardIndex((index) => index + 1);
      return;
    }
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(dismissKey, '1');
    }
    setShowBirthdayPopup(false);
  };

  const submitInternExtension = async (event) => {
    event.preventDefault();
    const days = Number(internExtendDays || 0);
    if (!Number.isFinite(days) || days < 1) {
      setIsError(true);
      setMessage('Please enter valid extension days.');
      return;
    }
    setSubmittingInternExtend(true);
    try {
      await api.createInternExtensionRequest(days);
      setIsError(false);
      setMessage('Internship extension request submitted to boss.');
      setShowInternExtendPopup(false);
      const dismissKey = `om:dismiss:intern-extend-popup:${user?.id ?? 'unknown'}`;
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(dismissKey, '1');
      }
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    } finally {
      setSubmittingInternExtend(false);
    }
  };

  return (
    <>
      <RoleLayout
        title="Staff"
        user={staffUser}
        items={menu}
        activeKey={active}
        onSelect={setActive}
        onLogout={onLogout}
        enableProfilePhotoActions
        onProfilePhotoUpload={uploadProfilePhoto}
      >
        {active === 'my-projects' && <StaffMyProjectsPage token={token} />}
        {active === 'add-task-plan' && <StaffAddTaskPlanPage token={token} />}
        {active === 'app-credentials' && <StaffAppCredentialsPage token={token} />}
        {active === 'leave' && <StaffLeavePage token={token} />}
        {active === 'tasklog' && <StaffTaskLogPage token={token} />}
        {active === 'tasklog-history' && <StaffTaskLogHistoryPage token={token} />}
        {active === 'leave-counts' && <LeaveCountsPage token={token} title="My Leave Count" selfOnly />}
      </RoleLayout>
      <StaffBirthdayPopup
        open={showBirthdayPopup}
        card={birthdayCards[birthdayCardIndex] ?? null}
        onClose={handleCloseBirthdayPopup}
      />
      {showInternExtendPopup && (
        <div className="fixed inset-0 z-[88] grid place-items-center bg-slate-950/55 p-4" onClick={() => setShowInternExtendPopup(false)}>
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900">Internship Period Ending Soon</h3>
            <p className="muted mt-2">
              Your extended internship period ends on <strong>{internStatus?.extended_intern_end_date || internStatus?.actual_intern_end_date || '-'}</strong>.
              Do you want to request extension?
            </p>
            <form className="form mt-4" onSubmit={submitInternExtension}>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-700">Extend Period (Days)</span>
                <input type="number" min="1" max="365" value={internExtendDays} onChange={(e) => setInternExtendDays(e.target.value)} required />
              </label>
              <div className="row justify-between">
                <button type="button" className="ghost" onClick={() => setShowInternExtendPopup(false)}>Not Now</button>
                <button type="submit" disabled={submittingInternExtend}>{submittingInternExtend ? 'Submitting...' : 'Submit Request'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <Message message={message} error={isError} />
    </>
  );
}
