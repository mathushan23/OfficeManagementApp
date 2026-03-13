import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import RoleLayout from '../../components/RoleLayout';
import BirthdayWeeklyChart from '../../components/BirthdayWeeklyChart';
import BossStaffDetailsPage from './BossStaffDetailsPage';
import BossStaffTaskLogsPage from './BossStaffTaskLogsPage';
import BossAttenderPage from './BossAttenderPage';
import BossCreateProjectTab from './projects/BossCreateProjectTab';
import BossAssignProjectTab from './projects/BossAssignProjectTab';
import BossProjectCompletionReviewPage from './projects/BossProjectCompletionReviewPage';
import BossLeaveApprovalPage from './BossLeaveApprovalPage';
import BossLeaveCalendarPage from './BossLeaveCalendarPage';
import BossShortLeaveAlertsPage from './BossShortLeaveAlertsPage';
import BossInternEndingAlertsPage from './BossInternEndingAlertsPage';
import BossInternExtensionRequestsPage from './BossInternExtensionRequestsPage';
import BossChangePasswordPage from './BossChangePasswordPage';
import BossPettyCashPage from './BossPettyCashPage';
import AttendanceDetailsPage from '../shared/AttendanceDetailsPage';
import LeaveCountsPage from '../shared/LeaveCountsPage';
import BirthdayRemindersPage from '../shared/BirthdayRemindersPage';
import ProjectDeadlineCalendarPage from '../shared/ProjectDeadlineCalendarPage';
import StaffTaskPlanTodayPage from '../shared/StaffTaskPlanTodayPage';
import StaffTaskPlanHistoryPage from '../shared/StaffTaskPlanHistoryPage';
import StaffCommissionPage from '../shared/StaffCommissionPage';
import StaffCommissionAdvanceHistoryPage from '../shared/StaffCommissionAdvanceHistoryPage';

const baseMenu = [
  {
    key: 'projects',
    label: 'Projects',
    children: [
      { key: 'projects-create', label: 'Create Project' },
      { key: 'projects-assign', label: 'Assign Project' },
      { key: 'projects-completion-review', label: 'Completion Reviews' },
      { key: 'projects-deadline-calendar', label: 'Deadline Calendar' },
    ],
  },
  { key: 'staff-details', label: 'Staff Details' },
  { key: 'attenders', label: 'Manage Attenders' },
  { key: 'attendance-details', label: 'Attendance Details' },
  { key: 'tasklog-details', label: 'Tasklog Details' },
  { key: 'taskplan-today', label: 'Today Task Plans' },
  {
    key: 'leave',
    label: 'Leave',
    children: [
      { key: 'leave-approve', label: 'Leave Approvals' },
      { key: 'leave-calendar', label: 'Leave Calendar' },
      { key: 'leave-counts', label: 'Leave Counts' },
    ],
  },
  {
    key: 'alerts',
    label: 'Alerts',
    children: [
      { key: 'short-alerts', label: 'Short Leave Alerts' },
      { key: 'intern-alerts', label: 'Intern End Alerts' },
      { key: 'intern-extension-requests', label: 'Intern Extend Requests' },
      { key: 'birthday-reminders', label: 'Birthday Reminders' },
    ],
  },
  { key: 'petty-cash', label: 'Petty Cash' },
  { key: 'staff-commission', label: 'Staff Commission' },
  { key: 'change-password', label: 'Change Password' },
];

export default function BossDashboard({ user, token, onLogout }) {
  const [active, setActive] = useState('staff-details');
  const [birthdayRows, setBirthdayRows] = useState([]);
  const [pettyLowCount, setPettyLowCount] = useState(0);
  const [internExtendPendingCount, setInternExtendPendingCount] = useState(0);
  const [selectedTaskplanStaff, setSelectedTaskplanStaff] = useState(null);
  const [selectedCommissionRow, setSelectedCommissionRow] = useState(null);
  const hideKey = `om:dismiss:weekly-birthday-chart:boss:${user?.id ?? 'unknown'}`;
  const [hideBirthdayChart, setHideBirthdayChart] = useState(
    () => typeof window !== 'undefined' && window.sessionStorage?.getItem(hideKey) === '1'
  );

  const menu = useMemo(() => {
    const decorate = (item) => {
      const withChildren = item.children
        ? { ...item, children: item.children.map(decorate) }
        : { ...item };

      if (withChildren.key === 'birthday-reminders') {
        return { ...withChildren, badge: birthdayRows.length };
      }
      if (withChildren.key === 'petty-cash') {
        return { ...withChildren, badge: pettyLowCount };
      }
      if (withChildren.key === 'intern-extension-requests') {
        return { ...withChildren, badge: internExtendPendingCount };
      }
      return withChildren;
    };

    return baseMenu.map(decorate);
  }, [birthdayRows.length, pettyLowCount, internExtendPendingCount]);

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

  useEffect(() => {
    const loadInternExtendPendingCount = async () => {
      try {
        const data = await api.listInternExtensionRequests('pending');
        setInternExtendPendingCount(Number(data?.pending_count || 0));
      } catch {
        setInternExtendPendingCount(0);
      }
    };

    loadInternExtendPendingCount();
  }, [token, active]);

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
        {active === 'projects-create' && <BossCreateProjectTab />}
        {active === 'projects-assign' && <BossAssignProjectTab />}
        {active === 'projects-completion-review' && <BossProjectCompletionReviewPage />}
        {active === 'projects-deadline-calendar' && <ProjectDeadlineCalendarPage role="boss" />}
        {active === 'tasklog-details' && <BossStaffTaskLogsPage token={token} />}
        {active === 'taskplan-today' && (
          <StaffTaskPlanTodayPage
            title="Today Task Plans"
            onOpenHistory={(staff) => {
              setSelectedTaskplanStaff(staff);
              setActive('taskplan-history');
            }}
          />
        )}
        {active === 'taskplan-history' && (
          <StaffTaskPlanHistoryPage
            selectedStaff={selectedTaskplanStaff}
            onBack={() => setActive('taskplan-today')}
          />
        )}
        {active === 'attendance-details' && <AttendanceDetailsPage token={token} title="All Staff Attendance + Tasklog Status" />}
        {active === 'attenders' && <BossAttenderPage token={token} />}
        {active === 'leave-approve' && <BossLeaveApprovalPage token={token} />}
        {active === 'leave-calendar' && <BossLeaveCalendarPage token={token} />}
        {active === 'short-alerts' && <BossShortLeaveAlertsPage token={token} />}
        {active === 'intern-alerts' && <BossInternEndingAlertsPage token={token} />}
        {active === 'intern-extension-requests' && <BossInternExtensionRequestsPage onPendingCountChange={setInternExtendPendingCount} />}
        {active === 'leave-counts' && <LeaveCountsPage token={token} title="All Staff Leave Counts" canEdit />}
        {active === 'petty-cash' && <BossPettyCashPage token={token} onLowBalanceCountChange={setPettyLowCount} />}
        {active === 'staff-commission' && (
          <StaffCommissionPage
            role="boss"
            onOpenAdvanceHistory={(row) => {
              setSelectedCommissionRow(row);
              setActive('staff-commission-history');
            }}
          />
        )}
        {active === 'staff-commission-history' && (
          <StaffCommissionAdvanceHistoryPage
            selectedRow={selectedCommissionRow}
            onBack={() => setActive('staff-commission')}
          />
        )}
        {active === 'birthday-reminders' && <BirthdayRemindersPage token={token} title="Staff Birthday Reminders" />}
        {active === 'change-password' && <BossChangePasswordPage token={token} />}
      </RoleLayout>
    </>
  );
}
