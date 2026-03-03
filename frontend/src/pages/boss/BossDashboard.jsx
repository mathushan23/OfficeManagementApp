import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import RoleLayout from '../../components/RoleLayout';
import BirthdayWeeklyChart from '../../components/BirthdayWeeklyChart';
import BossStaffDetailsPage from './BossStaffDetailsPage';
import BossStaffTaskLogsPage from './BossStaffTaskLogsPage';
import BossAttenderPage from './BossAttenderPage';
import BossLeaveApprovalPage from './BossLeaveApprovalPage';
import BossLeaveCalendarPage from './BossLeaveCalendarPage';
import BossShortLeaveAlertsPage from './BossShortLeaveAlertsPage';
import BossInternEndingAlertsPage from './BossInternEndingAlertsPage';
import BossChangePasswordPage from './BossChangePasswordPage';
import BossPettyCashPage from './BossPettyCashPage';
import AttendanceDetailsPage from '../shared/AttendanceDetailsPage';
import LeaveCountsPage from '../shared/LeaveCountsPage';
import BirthdayRemindersPage from '../shared/BirthdayRemindersPage';

const baseMenu = [
  { key: 'staff-details', label: 'Staff Details' },
  { key: 'tasklog-details', label: 'Tasklog Details' },
  { key: 'attendance-details', label: 'Attendance Details' },
  { key: 'attenders', label: 'Manage Attenders' },
  { key: 'leave-approve', label: 'Leave Approvals' },
  { key: 'leave-calendar', label: 'Leave Calendar' },
  { key: 'short-alerts', label: 'Short Leave Alerts' },
  { key: 'intern-alerts', label: 'Intern End Alerts' },
  { key: 'leave-counts', label: 'Leave Counts' },
  { key: 'petty-cash', label: 'Petty Cash' },
  { key: 'birthday-reminders', label: 'Birthday Reminders' },
  { key: 'change-password', label: 'Change Password' },
];

export default function BossDashboard({ user, token, onLogout }) {
  const [active, setActive] = useState('staff-details');
  const [birthdayRows, setBirthdayRows] = useState([]);
  const [pettyLowCount, setPettyLowCount] = useState(0);
  const hideKey = `om:dismiss:weekly-birthday-chart:boss:${user?.id ?? 'unknown'}`;
  const [hideBirthdayChart, setHideBirthdayChart] = useState(
    () => typeof window !== 'undefined' && window.sessionStorage?.getItem(hideKey) === '1'
  );

  const menu = useMemo(
    () => baseMenu.map((item) => (
      item.key === 'birthday-reminders'
        ? { ...item, badge: birthdayRows.length }
        : item.key === 'petty-cash'
          ? { ...item, badge: pettyLowCount }
          : item
    )),
    [birthdayRows.length, pettyLowCount]
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

  useEffect(() => {
    const loadPettyLowBalance = async () => {
      try {
        const data = await api.pettyCashSummary();
        setPettyLowCount(Number(data?.low_balance_count || 0));
      } catch {
        setPettyLowCount(0);
      }
    };

    loadPettyLowBalance();
  }, [token]);

  return (
    <>
      <RoleLayout
        title="Boss"
        user={user}
        items={menu}
        activeKey={active}
        onSelect={setActive}
        onLogout={onLogout}
      >
        {!hideBirthdayChart && birthdayRows.length > 0 && (
          <BirthdayWeeklyChart
            rows={birthdayRows}
            title="This Week Staff Birthdays"
            onHide={() => {
              setHideBirthdayChart(true);
              if (typeof window !== 'undefined' && window.sessionStorage) {
                window.sessionStorage.setItem(hideKey, '1');
              }
            }}
          />
        )}
        {active === 'staff-details' && <BossStaffDetailsPage token={token} />}
        {active === 'tasklog-details' && <BossStaffTaskLogsPage token={token} />}
        {active === 'attendance-details' && <AttendanceDetailsPage token={token} title="All Staff Attendance + Tasklog Status" />}
        {active === 'attenders' && <BossAttenderPage token={token} />}
        {active === 'leave-approve' && <BossLeaveApprovalPage token={token} />}
        {active === 'leave-calendar' && <BossLeaveCalendarPage token={token} />}
        {active === 'short-alerts' && <BossShortLeaveAlertsPage token={token} />}
        {active === 'intern-alerts' && <BossInternEndingAlertsPage token={token} />}
        {active === 'leave-counts' && <LeaveCountsPage token={token} title="All Staff Leave Counts" canEdit />}
        {active === 'petty-cash' && <BossPettyCashPage token={token} onLowBalanceCountChange={setPettyLowCount} />}
        {active === 'birthday-reminders' && <BirthdayRemindersPage token={token} title="Staff Birthday Reminders" />}
        {active === 'change-password' && <BossChangePasswordPage token={token} />}
      </RoleLayout>
    </>
  );
}
