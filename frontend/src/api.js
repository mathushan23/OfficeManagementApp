export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api';


export function resolveImageUrl(pathOrUrl) {
  if (!pathOrUrl) return '';
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return pathOrUrl;

  const backendBase = API_BASE_URL.replace(/\/api\/?$/, '');
  const normalized = pathOrUrl.startsWith('/') ? pathOrUrl.slice(1) : pathOrUrl;
  if (normalized.startsWith('staff-profiles/')) return `${backendBase}/${normalized}`;
  if (normalized.startsWith('tasklog-proofs/')) return `${backendBase}/${normalized}`;
  if (normalized.startsWith('project-task-proofs/')) return `${backendBase}/${normalized}`;
  if (normalized.startsWith('petty-cash-proofs/')) return `${backendBase}/${normalized}`;
  if (normalized.startsWith('project-submission-screenshots/')) return `${backendBase}/${normalized}`;
  if (normalized.startsWith('storage/')) return `${backendBase}/${normalized}`;
  return `${backendBase}/storage/${normalized}`;
}

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    redirect: 'follow',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers ?? {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message ?? 'Request failed');
  }
  return data;
}

export const api = {
  login: (pin) =>
    request('/auth/pin-login', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  changePin: (payload) => request('/auth/change-pin', { method: 'POST', body: JSON.stringify(payload) }),

  me: () => request('/me'),

  listLeaveRequests: (token, status = '') =>
    request(`/leave-requests${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  createLeaveRequest: (token, payload) =>
    request('/leave-requests', { method: 'POST', body: JSON.stringify(payload) }),
  decideLeave: (token, leaveRequestId, status) =>
    request(`/leave-requests/${leaveRequestId}/decision`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),
  leaveCounts: () => request('/leave-counts'),
  leaveDetails: (staffId) => request(`/leave-counts/${staffId}/details`),
  updateLeaveCount: (staffId, leaveDays) =>
    request(`/boss/leave-counts/${staffId}`, {
      method: 'PATCH',
      body: JSON.stringify({ leave_days: leaveDays }),
    }),
  leaveCalendar: () => request('/leave-calendar'),

  submitTaskLog: (token, payload) =>
    request('/tasklogs', { method: 'POST', body: JSON.stringify(payload) }),
  uploadTasklogProof: (token, file) => {
    const formData = new FormData();
    formData.append('image', file);
    return request('/tasklogs/proofs', { method: 'POST', body: formData });
  },
  listTaskLogs: () => request('/tasklogs'),
  staffTaskLogHistory: (token, staffId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.from_date) params.set('from_date', filters.from_date);
    if (filters.to_date) params.set('to_date', filters.to_date);
    const query = params.toString();
    return request(`/staff/${staffId}/tasklogs${query ? `?${query}` : ''}`);
  },
  myTaskLogHistory: (token, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.from_date) params.set('from_date', filters.from_date);
    if (filters.to_date) params.set('to_date', filters.to_date);
    const query = params.toString();
    return request(`/tasklogs/my${query ? `?${query}` : ''}`);
  },
  missingTaskLogs: () => request('/tasklogs/missing'),
  myMissedTaskLogs: () => request('/tasklogs/missed/my'),
  requestLateTaskLogApproval: (token, logDate) =>
    request('/tasklogs/late-requests', { method: 'POST', body: JSON.stringify({ log_date: logDate }) }),
  listLateTaskLogRequests: (token, status = '') =>
    request(`/tasklogs/late-requests${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  decideLateTaskLogRequest: (token, requestId, status) =>
    request(`/tasklogs/late-requests/${requestId}/decision`, { method: 'POST', body: JSON.stringify({ status }) }),
  createLatePermission: (token, payload) =>
    request('/tasklogs/late-permissions', { method: 'POST', body: JSON.stringify(payload) }),
  myLatePermissions: () => request('/tasklogs/late-permissions/my'),

  listStaff: () => request('/staff'),
  listStaffForBoss: () => request('/boss/staff'),
  createStaff: (token, payload) => request('/staff', { method: 'POST', body: payload }),
  updateStaff: (token, id, payload) => {
    if (payload instanceof FormData) {
      payload.append('_method', 'PUT');
      return request(`/staff/${id}`, { method: 'POST', body: payload });
    }
    return request(`/staff/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },

  listAttenders: () => request('/attenders'),
  createAttender: (token, payload) => request('/attenders', { method: 'POST', body: JSON.stringify(payload) }),
  updateAttender: (token, id, payload) => request(`/attenders/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  listAttendance: () => request('/attendance'),
  myTodayAttendanceStatus: () => request('/attendance/my-today-status'),
  attendanceDetails: (token, date) =>
    request(`/attendance/details${date ? `?date=${encodeURIComponent(date)}` : ''}`),
  attendanceStaffDetails: (token, staffId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.from_date) params.set('from_date', filters.from_date);
    if (filters.to_date) params.set('to_date', filters.to_date);
    const query = params.toString();
    return request(`/attendance/staff/${staffId}/details${query ? `?${query}` : ''}`);
  },
  companyLeaveDays: (token, fromDate, toDate, todayDate) =>
    request(`/attendance/company-leave-days?from_date=${encodeURIComponent(fromDate)}&to_date=${encodeURIComponent(toDate)}&today_date=${encodeURIComponent(todayDate)}`),
  markAttendance: (token, payload) => request('/attendance', { method: 'POST', body: JSON.stringify(payload) }),
  updateAttendance: (token, id, payload) => request(`/attendance/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  shortLeaveAlerts: () => request('/alerts/short-leave'),
  internEndingAlerts: () => request('/alerts/intern-ending'),
  birthdayReminders: () => request('/alerts/birthdays'),
  pettyCashSummary: () => request('/boss/petty-cash/summary'),
  pettyCashHistory: (attenderId = '') =>
    request(`/boss/petty-cash/history${attenderId ? `?attender_id=${encodeURIComponent(attenderId)}` : ''}`),
  addPettyCash: (payload) =>
    request('/boss/petty-cash/add', { method: 'POST', body: JSON.stringify(payload) }),
  addPettyCashExpense: (payload) =>
    request('/boss/petty-cash/expense', {
      method: 'POST',
      body: payload instanceof FormData ? payload : JSON.stringify(payload),
    }),
  attenderPettyCashSummary: () => request('/attender/petty-cash/summary'),
  attenderPettyCashHistory: () => request('/attender/petty-cash/history'),
  submitAttenderExpense: (payload) =>
    request('/attender/petty-cash/expense', {
      method: 'POST',
      body: payload instanceof FormData ? payload : JSON.stringify(payload),
    }),
  commissionOverview: () => request('/commission/overview'),
  commissionAdvanceHistory: (projectAssignmentId) =>
    request(`/commission/advances/history?project_assignment_id=${encodeURIComponent(projectAssignmentId)}`),
  setCommissionManager: (attenderIds = []) =>
    request('/boss/commission/manager', { method: 'POST', body: JSON.stringify({ attender_ids: attenderIds }) }),
  addCommissionAdvance: (payload) =>
    request('/commission/advances', { method: 'POST', body: JSON.stringify(payload) }),
  myBirthdayWishCard: () => request('/staff/birthday-wish-card'),
  branchBirthdayWishCards: () => request('/staff/branch-birthday-cards'),
  myInternExtensionStatus: () => request('/staff/intern-extension/status'),
  createInternExtensionRequest: (extendDays) =>
    request('/staff/intern-extension-requests', { method: 'POST', body: JSON.stringify({ extend_days: extendDays }) }),
  updateMyProfilePhoto: (file) => {
    const formData = new FormData();
    formData.append('profile_photo', file);
    return request('/staff/me/profile-photo', { method: 'POST', body: formData });
  },

  listProjects: (status = '') => request(`/projects${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  createProject: (payload) => request('/boss/projects', { method: 'POST', body: JSON.stringify(payload) }),
  assignProject: (payload) => request('/boss/project-assignments', { method: 'POST', body: JSON.stringify(payload) }),
  listProjectAssignments: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.staff_id) params.set('staff_id', String(filters.staff_id));
    if (filters.project_id) params.set('project_id', String(filters.project_id));
    const query = params.toString();
    return request(`/project-assignments${query ? `?${query}` : ''}`);
  },
  listBossProjectAssignments: () => request('/boss/project-assignments'),
  getProjectAssignment: (assignmentId) => request(`/project-assignments/${assignmentId}`),
  listProjectCredentials: (projectAssignmentId = '') =>
    request(`/project-credentials${projectAssignmentId ? `?project_assignment_id=${encodeURIComponent(projectAssignmentId)}` : ''}`),

  myProjectAssignments: () => request('/staff/project-assignments'),
  myProjectTasks: (status = '') => request(`/staff/project-tasks${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  taskPlanTodaySummary: () => request('/project-tasks/today-summary'),
  staffTaskPlanHistory: (staffId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.from_date) params.set('from_date', filters.from_date);
    if (filters.to_date) params.set('to_date', filters.to_date);
    const query = params.toString();
    return request(`/project-tasks/staff/${staffId}/history${query ? `?${query}` : ''}`);
  },
  createMyProjectTaskPlan: (payload) => request('/staff/project-tasks', { method: 'POST', body: JSON.stringify(payload) }),
  updateMyProjectTaskStatus: (taskId, status) =>
    request(`/staff/project-tasks/${taskId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  completeMyProjectTask: (taskId, proofImage) => {
    const formData = new FormData();
    formData.append('proof_image', proofImage);
    return request(`/staff/project-tasks/${taskId}/complete`, { method: 'POST', body: formData });
  },
  addMySubtask: (taskId, title) =>
    request(`/staff/project-tasks/${taskId}/subtasks`, { method: 'POST', body: JSON.stringify({ title }) }),
  updateMySubtask: (subtaskId, payload) =>
    request(`/staff/project-subtasks/${subtaskId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  addMyProjectCredential: (payload) =>
    request('/staff/project-credentials', { method: 'POST', body: JSON.stringify(payload) }),
  submitMyProject: (assignmentId, payload) => {
    const formData = new FormData();
    formData.append('login_url', payload.login_url ?? '');
    formData.append('username', payload.username ?? '');
    formData.append('password', payload.password ?? '');
    if (payload.documentation_link) formData.append('documentation_link', payload.documentation_link);
    if (payload.remarks) formData.append('remarks', payload.remarks);
    (payload.screenshots ?? []).forEach((file) => {
      formData.append('screenshots[]', file);
    });
    return request(`/staff/project-assignments/${assignmentId}/submit`, { method: 'POST', body: formData });
  },
  myRejectedProjectSubmissions: () => request('/staff/project-submissions/rejected'),
  myProjectNotifications: () => request('/staff/project-notifications'),

  listProjectSubmissions: (approvalStatus = '') =>
    request(`/boss/project-submissions${approvalStatus ? `?approval_status=${encodeURIComponent(approvalStatus)}` : ''}`),
  decideProjectSubmission: (submissionId, payload) =>
    request(`/boss/project-submissions/${submissionId}/decision`, { method: 'POST', body: JSON.stringify(payload) }),
  listInternExtensionRequests: (status = '') =>
    request(`/boss/intern-extension-requests${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  decideInternExtensionRequest: (requestId, payload) =>
    request(`/boss/intern-extension-requests/${requestId}/decision`, { method: 'POST', body: JSON.stringify(payload) }),
};
