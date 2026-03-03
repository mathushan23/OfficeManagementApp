import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import RoleLayout from '../../components/RoleLayout';
import BirthdayWeeklyChart from '../../components/BirthdayWeeklyChart';
import AttenderStaffPage from './AttenderStaffPage';
import AttenderAttendancePage from './AttenderAttendancePage';
import AttenderLeaveCalendarPage from './AttenderLeaveCalendarPage';
import AttenderTaskLogsPage from './AttenderTaskLogsPage';
import AttenderLatePermissionPage from './AttenderLatePermissionPage';
import AttenderLeaveApprovalPage from './AttenderLeaveApprovalPage';
import AttenderPettyCashPage from './AttenderPettyCashPage';
import AttendanceDetailsPage from '../shared/AttendanceDetailsPage';
import LeaveCountsPage from '../shared/LeaveCountsPage';
import BirthdayRemindersPage from '../shared/BirthdayRemindersPage';

const baseMenu = [
  { key: 'staff', label: 'Manage Staff' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'attendance-details', label: 'Attendance Details' },
  { key: 'calendar', label: 'Leave Calendar' },
  { key: 'tasklogs', label: 'View Task Logs' },
  { key: 'late', label: 'Late Tasklog Approvals' },
  { key: 'leave-approve', label: 'Leave Approvals' },
  { key: 'petty-cash', label: 'Petty Cash' },
  { key: 'leave-counts', label: 'Leave Counts' },
  { key: 'birthday-reminders', label: 'Birthday Reminders' },
];

export default function AttenderDashboard({ user, token, onLogout }) {
  const [active, setActive] = useState('staff');
  const [birthdayRows, setBirthdayRows] = useState([]);
  const hideKey = `om:dismiss:weekly-birthday-chart:attender:${user?.id ?? 'unknown'}`;
  const [hideBirthdayChart, setHideBirthdayChart] = useState(
    () => typeof window !== 'undefined' && window.sessionStorage?.getItem(hideKey) === '1'
  );

  const menu = useMemo(
    () => baseMenu.map((item) => (
      item.key === 'birthday-reminders'
        ? { ...item, badge: birthdayRows.length }
        : item
    )),
    [birthdayRows.length]
  );

  useEffect(() => {
    const notifyBirthday = async () => {
      try {
        const rows = await api.birthdayReminders(token);
        setBirthdayRows(rows ?? []);
      } catch {
        setBirthdayRows([]);
      }
    };

    notifyBirthday();
  }, [token]);

  return (
    <>
      <RoleLayout
        title="Attender"
        user={user}
        items={menu}
        activeKey={active}
        onSelect={setActive}
        onLogout={onLogout}
      >
        {!hideBirthdayChart && birthdayRows.length > 0 && (
          <BirthdayWeeklyChart
            rows={birthdayRows}
            title="This Week Branch Birthdays"
            onHide={() => {
              setHideBirthdayChart(true);
              if (typeof window !== 'undefined' && window.sessionStorage) {
                window.sessionStorage.setItem(hideKey, '1');
              }
            }}
          />
        )}
        {active === 'staff' && <AttenderStaffPage token={token} />}
        {active === 'attendance' && <AttenderAttendancePage token={token} />}
        {active === 'attendance-details' && <AttendanceDetailsPage token={token} title="All Staff Attendance + Tasklog Status" />}
        {active === 'calendar' && <AttenderLeaveCalendarPage token={token} />}
        {active === 'tasklogs' && <AttenderTaskLogsPage token={token} />}
        {active === 'late' && <AttenderLatePermissionPage token={token} />}
        {active === 'leave-approve' && <AttenderLeaveApprovalPage token={token} />}
        {active === 'petty-cash' && <AttenderPettyCashPage token={token} />}
        {active === 'leave-counts' && <LeaveCountsPage token={token} title="Branch Staff Leave Counts" />}
        {active === 'birthday-reminders' && <BirthdayRemindersPage token={token} title="Branch Staff Birthday Reminders" />}
      </RoleLayout>
    </>
  );
}
