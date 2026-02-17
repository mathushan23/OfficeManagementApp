import { useState } from 'react';
import RoleLayout from '../../components/RoleLayout';
import BossStaffDetailsPage from './BossStaffDetailsPage';
import BossStaffTaskLogsPage from './BossStaffTaskLogsPage';
import BossAttenderPage from './BossAttenderPage';
import BossLeaveApprovalPage from './BossLeaveApprovalPage';
import BossShortLeaveAlertsPage from './BossShortLeaveAlertsPage';
import BossInternEndingAlertsPage from './BossInternEndingAlertsPage';
import AttendanceDetailsPage from '../shared/AttendanceDetailsPage';
import LeaveCountsPage from '../shared/LeaveCountsPage';

const menu = [
  { key: 'staff-details', label: 'Staff Details' },
  { key: 'tasklog-details', label: 'Tasklog Details' },
  { key: 'attendance-details', label: 'Attendance Details' },
  { key: 'attenders', label: 'Manage Attenders' },
  { key: 'leave-approve', label: 'Leave Approvals' },
  { key: 'short-alerts', label: 'Short Leave Alerts' },
  { key: 'intern-alerts', label: 'Intern End Alerts' },
  { key: 'leave-counts', label: 'Leave Counts' },
];

export default function BossDashboard({ user, token, onLogout }) {
  const [active, setActive] = useState('staff-details');

  return (
    <RoleLayout
      title="Boss"
      user={user}
      items={menu}
      activeKey={active}
      onSelect={setActive}
      onLogout={onLogout}
    >
      {active === 'staff-details' && <BossStaffDetailsPage token={token} />}
      {active === 'tasklog-details' && <BossStaffTaskLogsPage token={token} />}
      {active === 'attendance-details' && <AttendanceDetailsPage token={token} title="All Staff Attendance + Tasklog Status" />}
      {active === 'attenders' && <BossAttenderPage token={token} />}
      {active === 'leave-approve' && <BossLeaveApprovalPage token={token} />}
      {active === 'short-alerts' && <BossShortLeaveAlertsPage token={token} />}
      {active === 'intern-alerts' && <BossInternEndingAlertsPage token={token} />}
      {active === 'leave-counts' && <LeaveCountsPage token={token} title="All Staff Leave Counts" />}
    </RoleLayout>
  );
}
