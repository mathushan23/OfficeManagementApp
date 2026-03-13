<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\StaffController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\LeaveController;
use App\Http\Controllers\Api\TaskLogController;
use App\Http\Controllers\Api\AttenderController;
use App\Http\Controllers\Api\PettyCashController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\CommissionController;
use App\Http\Controllers\Api\InternshipExtensionController;

Route::post('/auth/pin-login', [AuthController::class, 'pinLogin']);
Route::post('/auth/logout', [AuthController::class, 'logout']);

Route::middleware('jwt.cookie')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/auth/change-pin', [AuthController::class, 'changePin']);

    // Staff
    Route::get('/attendance/my-today-status', [AttendanceController::class, 'myTodayStatus']);
    Route::get('/tasklogs/missed/my', [TaskLogController::class, 'myMissedLogs']);
    Route::get('/tasklogs/my', [TaskLogController::class, 'myHistory']);
    Route::post('/tasklogs/late-requests', [TaskLogController::class, 'requestLateApproval']);
    Route::get('/tasklogs/late-permissions/my', [TaskLogController::class, 'myLatePermissions']);
    Route::post('/staff/me/profile-photo', [StaffController::class, 'updateMyProfilePhoto']);
    Route::get('/staff/branch-birthday-cards', [StaffController::class, 'branchBirthdayWishCards']);
    Route::post('/leave-requests', [LeaveController::class, 'store']);
    Route::post('/tasklogs/proofs', [TaskLogController::class, 'uploadProof']);
    Route::post('/tasklogs', [TaskLogController::class, 'store']);
    Route::get('/staff/project-assignments', [ProjectController::class, 'listMyAssignments']);
    Route::get('/staff/project-tasks', [ProjectController::class, 'listMyTasks']);
    Route::post('/staff/project-tasks', [ProjectController::class, 'createMyTaskPlan']);
    Route::patch('/staff/project-tasks/{task}/status', [ProjectController::class, 'markTaskStatus']);
    Route::post('/staff/project-tasks/{task}/complete', [ProjectController::class, 'completeTaskWithProof']);
    Route::post('/staff/project-tasks/{task}/subtasks', [ProjectController::class, 'addSubtask']);
    Route::patch('/staff/project-subtasks/{subtask}', [ProjectController::class, 'updateSubtask']);
    Route::post('/staff/project-credentials', [ProjectController::class, 'addCredential']);
    Route::post('/staff/project-assignments/{assignment}/submit', [ProjectController::class, 'submitProject']);
    Route::get('/staff/project-submissions/rejected', [ProjectController::class, 'myRejectedSubmissions']);
    Route::get('/staff/project-notifications', [ProjectController::class, 'staffNotifications']);
    Route::get('/staff/intern-extension/status', [InternshipExtensionController::class, 'myStatus']);
    Route::post('/staff/intern-extension-requests', [InternshipExtensionController::class, 'create']);

    // Attender
    Route::get('/attendance/details', [AttendanceController::class, 'details']);
    Route::get('/attendance/staff/{user}/details', [AttendanceController::class, 'staffDetails']);
    Route::get('/attendance/company-leave-days', [AttendanceController::class, 'companyLeaveDays']);
    Route::get('/staff', [StaffController::class, 'index']);
    Route::get('/staff/{user}/tasklogs', [TaskLogController::class, 'historyForStaff']);
    Route::get('/alerts/birthdays', [StaffController::class, 'birthdayReminders']);
    Route::get('/staff/birthday-wish-card', [StaffController::class, 'myBirthdayWishCard']);
    Route::post('/staff', [StaffController::class, 'store']);
    Route::put('/staff/{user}', [StaffController::class, 'update']);
    Route::get('/attendance', [AttendanceController::class, 'index']);
    Route::post('/attendance', [AttendanceController::class, 'store']);
    Route::put('/attendance/{attendance}', [AttendanceController::class, 'update']);
    Route::get('/leave-requests', [LeaveController::class, 'index']);
    Route::get('/leave-calendar', [LeaveController::class, 'calendar']);
    Route::get('/tasklogs', [TaskLogController::class, 'index']);
    Route::get('/tasklogs/missing', [TaskLogController::class, 'missingLogs']);
    Route::get('/tasklogs/late-requests', [TaskLogController::class, 'lateRequests']);
    Route::post('/tasklogs/late-requests/{permission}/decision', [TaskLogController::class, 'decideLateRequest']);
    Route::post('/tasklogs/late-permissions', [TaskLogController::class, 'createLatePermission']);
    Route::post('/tasklogs/{taskLog}/allow-late-submit', [TaskLogController::class, 'allowLateSubmit']);
    Route::post('/leave-requests/{leaveRequest}/decision', [LeaveController::class, 'decide']);
    Route::get('/leave-counts', [LeaveController::class, 'leaveCounts']);
    Route::get('/leave-counts/{user}/details', [LeaveController::class, 'leaveDetails']);
    Route::get('/projects', [ProjectController::class, 'listProjects']);
    Route::get('/project-assignments', [ProjectController::class, 'listAssignments']);
    Route::get('/project-assignments/{assignment}', [ProjectController::class, 'showAssignment']);
    Route::get('/project-credentials', [ProjectController::class, 'listCredentials']);
    Route::get('/project-tasks/today-summary', [ProjectController::class, 'todayTaskPlanSummary']);
    Route::get('/project-tasks/staff/{user}/history', [ProjectController::class, 'taskPlanHistoryForStaff']);
    Route::get('/attender/petty-cash/summary', [PettyCashController::class, 'mySummary']);
    Route::get('/attender/petty-cash/history', [PettyCashController::class, 'myHistory']);
    Route::post('/attender/petty-cash/expense', [PettyCashController::class, 'submitExpense']);

    // Boss
    Route::get('/boss/attendance/details', [AttendanceController::class, 'details']);
    Route::get('/attenders', [AttenderController::class, 'index']);
    Route::post('/attenders', [AttenderController::class, 'store']);
    Route::put('/attenders/{user}', [AttenderController::class, 'update']);
    Route::get('/boss/staff', [StaffController::class, 'index']);
    Route::get('/boss/staff/{user}/tasklogs', [TaskLogController::class, 'historyForStaff']);
    Route::get('/alerts/short-leave', [LeaveController::class, 'shortLeaveAlerts']);
    Route::get('/alerts/intern-ending', [LeaveController::class, 'internEndingAlerts']);
    Route::get('/boss/leave-counts', [LeaveController::class, 'leaveCounts']);
    Route::patch('/boss/leave-counts/{user}', [LeaveController::class, 'updateLeaveCount']);
    Route::post('/boss/projects', [ProjectController::class, 'storeProject']);
    Route::post('/boss/project-assignments', [ProjectController::class, 'assignProject']);
    Route::get('/boss/project-assignments', [ProjectController::class, 'listAssignmentsForBoss']);
    Route::get('/boss/project-submissions', [ProjectController::class, 'listSubmissions']);
    Route::post('/boss/project-submissions/{submission}/decision', [ProjectController::class, 'decideSubmission']);
    Route::get('/boss/petty-cash/summary', [PettyCashController::class, 'summary']);
    Route::get('/boss/petty-cash/history', [PettyCashController::class, 'history']);
    Route::post('/boss/petty-cash/add', [PettyCashController::class, 'addPettyCash']);
    Route::post('/boss/petty-cash/expense', [PettyCashController::class, 'addExpense']);
    Route::get('/commission/overview', [CommissionController::class, 'overview']);
    Route::get('/commission/advances/history', [CommissionController::class, 'advanceHistory']);
    Route::post('/boss/commission/manager', [CommissionController::class, 'setManager']);
    Route::post('/commission/advances', [CommissionController::class, 'addAdvance']);
    Route::get('/boss/intern-extension-requests', [InternshipExtensionController::class, 'listForBoss']);
    Route::post('/boss/intern-extension-requests/{extensionRequest}/decision', [InternshipExtensionController::class, 'decide']);
});
