import { useState } from 'react';
import RoleLayout from '../../components/RoleLayout';
import BossStaffTaskLogsPage from './BossStaffTaskLogsPage';
import BossAttenderPage from './BossAttenderPage';
import BossLeaveApprovalPage from './BossLeaveApprovalPage';
import BossShortLeaveAlertsPage from './BossShortLeaveAlertsPage';
import AttendanceDetailsPage from '../shared/AttendanceDetailsPage';

const menu = [
  { key: 'staff', label: 'Staff + Tasklog History' },
  { key: 'attendance-details', label: 'Attendance Details' },
  { key: 'attenders', label: 'Manage Attenders' },
  { key: 'leave-approve', label: 'Leave Approvals' },
  { key: 'short-alerts', label: 'Short Leave Alerts' },
];

export default function BossDashboard({ user, token, onLogout }) {
  const [active, setActive] = useState('staff');

  return (
    <RoleLayout
      title="Boss"
      user={user}
      items={menu}
      activeKey={active}
      onSelect={setActive}
      onLogout={onLogout}
    >
      {active === 'staff' && <BossStaffTaskLogsPage token={token} />}
      {active === 'attendance-details' && <AttendanceDetailsPage token={token} title="All Staff Attendance + Tasklog Status" />}
      {active === 'attenders' && <BossAttenderPage token={token} />}
      {active === 'leave-approve' && <BossLeaveApprovalPage token={token} />}
      {active === 'short-alerts' && <BossShortLeaveAlertsPage token={token} />}
    </RoleLayout>
  );
}
