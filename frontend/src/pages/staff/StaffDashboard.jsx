import { useState } from 'react';
import RoleLayout from '../../components/RoleLayout';
import StaffLeavePage from './StaffLeavePage';
import StaffTaskLogPage from './StaffTaskLogPage';
import StaffTaskLogHistoryPage from './StaffTaskLogHistoryPage';
import LeaveCountsPage from '../shared/LeaveCountsPage';

const menu = [
  { key: 'leave', label: 'Leave Request' },
  { key: 'tasklog', label: 'Add Task Log' },
  { key: 'tasklog-history', label: 'My Tasklog History' },
  { key: 'leave-counts', label: 'My Leave Count' },
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
      {active === 'tasklog-history' && <StaffTaskLogHistoryPage token={token} />}
      {active === 'leave-counts' && <LeaveCountsPage token={token} title="My Leave Count" selfOnly />}
    </RoleLayout>
  );
}
