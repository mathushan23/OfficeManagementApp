import { useState } from 'react';
import RoleLayout from '../../components/RoleLayout';
import StaffLeavePage from './StaffLeavePage';
import StaffTaskLogPage from './StaffTaskLogPage';

const menu = [
  { key: 'leave', label: 'Leave Request' },
  { key: 'tasklog', label: 'Add Task Log' },
];

export default function StaffDashboard({ user, token, onLogout }) {
  const [active, setActive] = useState('leave');

  return (
    <RoleLayout
      title="Staff"
      user={user}
      items={menu}
      activeKey={active}
      onSelect={setActive}
      onLogout={onLogout}
    >
      {active === 'leave' && <StaffLeavePage token={token} />}
      {active === 'tasklog' && <StaffTaskLogPage token={token} />}
    </RoleLayout>
  );
}
