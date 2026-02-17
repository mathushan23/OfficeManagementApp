export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api';

export function resolveImageUrl(pathOrUrl) {
  if (!pathOrUrl) return '';
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return pathOrUrl;

  const backendBase = API_BASE_URL.replace(/\/api\/?$/, '');
  const normalized = pathOrUrl.startsWith('/') ? pathOrUrl.slice(1) : pathOrUrl;
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
  createStaff: (token, payload) => request('/staff', { method: 'POST', body: JSON.stringify(payload) }),
  updateStaff: (token, id, payload) => request(`/staff/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  listAttenders: () => request('/attenders'),
  createAttender: (token, payload) => request('/attenders', { method: 'POST', body: JSON.stringify(payload) }),
  updateAttender: (token, id, payload) => request(`/attenders/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  listAttendance: () => request('/attendance'),
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
};
