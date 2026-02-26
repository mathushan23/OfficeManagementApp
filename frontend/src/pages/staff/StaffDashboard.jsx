import { useEffect, useState } from 'react';
import { api } from '../../api';
import RoleLayout from '../../components/RoleLayout';
import StaffLeavePage from './StaffLeavePage';
import StaffTaskLogPage from './StaffTaskLogPage';
import StaffTaskLogHistoryPage from './StaffTaskLogHistoryPage';
import StaffBirthdayPopup from '../../components/StaffBirthdayPopup';
import LeaveCountsPage from '../shared/LeaveCountsPage';

const menu = [
  { key: 'tasklog', label: 'Add Task Log' },
  { key: 'leave', label: 'Leave Request' },
  { key: 'tasklog-history', label: 'My Tasklog History' },
  { key: 'leave-counts', label: 'My Leave Count' },
];

export default function StaffDashboard({ user, token, onLogout, onUserUpdated }) {
  const [active, setActive] = useState('tasklog');
  const [birthdayCards, setBirthdayCards] = useState([]);
  const [birthdayCardIndex, setBirthdayCardIndex] = useState(0);
  const [showBirthdayPopup, setShowBirthdayPopup] = useState(false);
  const [staffUser, setStaffUser] = useState(user);

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
    </>
  );
}
