import { useState } from 'react';
import RoleLayout from '../../components/RoleLayout';
import AttenderStaffPage from './AttenderStaffPage';
import AttenderAttendancePage from './AttenderAttendancePage';
import AttenderLeaveCalendarPage from './AttenderLeaveCalendarPage';
import AttenderTaskLogsPage from './AttenderTaskLogsPage';
import AttenderLatePermissionPage from './AttenderLatePermissionPage';
import AttenderLeaveApprovalPage from './AttenderLeaveApprovalPage';
import AttendanceDetailsPage from '../shared/AttendanceDetailsPage';
import LeaveCountsPage from '../shared/LeaveCountsPage';

const menu = [
  { key: 'staff', label: 'Manage Staff' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'attendance-details', label: 'Attendance Details' },
  { key: 'calendar', label: 'Leave Calendar' },
  { key: 'tasklogs', label: 'View Task Logs' },
  { key: 'late', label: 'Late Tasklog Approvals' },
  { key: 'leave-approve', label: 'Leave Approvals' },
  { key: 'leave-counts', label: 'Leave Counts' },
];

export default function AttenderDashboard({ user, token, onLogout }) {
  const [active, setActive] = useState('staff');

  return (
    <RoleLayout
      title="Attender"
      user={user}
      items={menu}
      activeKey={active}
      onSelect={setActive}
      onLogout={onLogout}
    >
      {active === 'staff' && <AttenderStaffPage token={token} />}
      {active === 'attendance' && <AttenderAttendancePage token={token} />}
      {active === 'attendance-details' && <AttendanceDetailsPage token={token} title="All Staff Attendance + Tasklog Status" />}
      {active === 'calendar' && <AttenderLeaveCalendarPage token={token} />}
      {active === 'tasklogs' && <AttenderTaskLogsPage token={token} />}
      {active === 'late' && <AttenderLatePermissionPage token={token} />}
      {active === 'leave-approve' && <AttenderLeaveApprovalPage token={token} />}
      {active === 'leave-counts' && <LeaveCountsPage token={token} title="Branch Staff Leave Counts" />}
    </RoleLayout>
  );
}
