import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api';
import RoleLayout from '../../components/RoleLayout';
import BirthdayWeeklyChart from '../../components/BirthdayWeeklyChart';
import AttenderStaffPage from './AttenderStaffPage';
import AttenderAttendancePage from './AttenderAttendancePage';
import AttenderLeaveCalendarPage from './AttenderLeaveCalendarPage';
import AttenderTaskLogsPage from './AttenderTaskLogsPage';
import AttenderAssignedProjectsPage from './projects/AttenderAssignedProjectsPage';
import AttenderProjectCredentialsPage from './projects/AttenderProjectCredentialsPage';
import AttenderLatePermissionPage from './AttenderLatePermissionPage';
import AttenderLeaveApprovalPage from './AttenderLeaveApprovalPage';
import AttenderPettyCashPage from './AttenderPettyCashPage';
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
      { key: 'projects-assigned', label: 'Assigned Projects' },
      { key: 'projects-credentials', label: 'Project Credentials' },
      { key: 'projects-deadline-calendar', label: 'Deadline Calendar' },
    ],
  },
  { key: 'staff', label: 'Manage Staff' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'attendance-details', label: 'Attendance Details' },
  {
    key: 'tasklogs-group',
    label: 'Task Logs & Task Plans',
    children: [
      { key: 'taskplan-today', label: 'Today Task Plans' },
      { key: 'tasklogs', label: 'View Task Logs' },
      { key: 'late', label: 'Late Tasklog Approvals' },
    ],
  },
  {
    key: 'leave-group',
    label: 'Leave',
    children: [
      { key: 'leave-approve', label: 'Leave Approvals' },
      { key: 'calendar', label: 'Leave Calendar' },
      { key: 'leave-counts', label: 'Leave Counts' },
    ],
  },
  { key: 'birthday-reminders', label: 'Birthday Reminders' },
  { key: 'petty-cash', label: 'Petty Cash' },
  { key: 'staff-commission', label: 'Staff Commission' },
];

export default function AttenderDashboard({ user, token, onLogout }) {
  const [active, setActive] = useState('staff');
  const [birthdayRows, setBirthdayRows] = useState([]);
  const [latePendingCount, setLatePendingCount] = useState(0);
  const [selectedTaskplanStaff, setSelectedTaskplanStaff] = useState(null);
  const [selectedCommissionRow, setSelectedCommissionRow] = useState(null);
  const hideKey = `om:dismiss:weekly-birthday-chart:attender:${user?.id ?? 'unknown'}`;
  const [hideBirthdayChart, setHideBirthdayChart] = useState(
    () => typeof window !== 'undefined' && window.sessionStorage?.getItem(hideKey) === '1'
  );

  const menu = useMemo(
    () => baseMenu.map((item) => {
      if (item.key === 'birthday-reminders') {
        return { ...item, badge: birthdayRows.length };
      }
      if (item.key === 'tasklogs-group') {
        return {
          ...item,
          badge: latePendingCount,
          children: (item.children ?? []).map((child) => (
            child.key === 'late'
              ? { ...child, badge: latePendingCount }
              : child
          )),
        };
      }
      return item;
    }),
    [birthdayRows.length, latePendingCount]
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
    const loadLatePendingCount = async () => {
      try {
        const rows = await api.listLateTaskLogRequests(token, 'pending');
        setLatePendingCount(Array.isArray(rows) ? rows.length : 0);
      } catch {
        setLatePendingCount(0);
      }
    };

    loadLatePendingCount();
  }, [token, active]);

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
        {active === 'projects-assigned' && <AttenderAssignedProjectsPage token={token} />}
        {active === 'projects-credentials' && <AttenderProjectCredentialsPage token={token} />}
        {active === 'projects-deadline-calendar' && <ProjectDeadlineCalendarPage role="attender" />}
        {active === 'attendance' && <AttenderAttendancePage token={token} />}
        {active === 'attendance-details' && <AttendanceDetailsPage token={token} title="All Staff Attendance + Tasklog Status" />}
        {active === 'calendar' && <AttenderLeaveCalendarPage token={token} />}
        {active === 'tasklogs' && <AttenderTaskLogsPage token={token} />}
        {active === 'taskplan-today' && (
          <StaffTaskPlanTodayPage
            title="Today Task Plans (Branch)"
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
        {active === 'late' && <AttenderLatePermissionPage token={token} onPendingCountChange={setLatePendingCount} />}
        {active === 'leave-approve' && <AttenderLeaveApprovalPage token={token} />}
        {active === 'petty-cash' && <AttenderPettyCashPage token={token} />}
        {active === 'staff-commission' && (
          <StaffCommissionPage
            role="attender"
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
        {active === 'leave-counts' && <LeaveCountsPage token={token} title="Branch Staff Leave Counts" />}
        {active === 'birthday-reminders' && <BirthdayRemindersPage token={token} title="Branch Staff Birthday Reminders" />}
      </RoleLayout>
    </>
  );
}
