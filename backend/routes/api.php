<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\StaffController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\LeaveController;
use App\Http\Controllers\Api\TaskLogController;
use App\Http\Controllers\Api\AttenderController;

Route::post('/auth/pin-login', [AuthController::class, 'pinLogin']);
Route::post('/auth/logout', [AuthController::class, 'logout']);

Route::middleware('jwt.cookie')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);

    // Staff
    Route::get('/tasklogs/missed/my', [TaskLogController::class, 'myMissedLogs']);
    Route::post('/tasklogs/late-requests', [TaskLogController::class, 'requestLateApproval']);
    Route::get('/tasklogs/late-permissions/my', [TaskLogController::class, 'myLatePermissions']);
    Route::post('/leave-requests', [LeaveController::class, 'store']);
    Route::post('/tasklogs/proofs', [TaskLogController::class, 'uploadProof']);
    Route::post('/tasklogs', [TaskLogController::class, 'store']);

    // Attender
    Route::get('/attendance/details', [AttendanceController::class, 'details']);
    Route::get('/attendance/staff/{user}/details', [AttendanceController::class, 'staffDetails']);
    Route::get('/staff', [StaffController::class, 'index']);
    Route::get('/staff/{user}/tasklogs', [TaskLogController::class, 'historyForStaff']);
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

    // Boss
    Route::get('/boss/attendance/details', [AttendanceController::class, 'details']);
    Route::get('/attenders', [AttenderController::class, 'index']);
    Route::post('/attenders', [AttenderController::class, 'store']);
    Route::put('/attenders/{user}', [AttenderController::class, 'update']);
    Route::get('/boss/staff', [StaffController::class, 'index']);
    Route::get('/boss/staff/{user}/tasklogs', [TaskLogController::class, 'historyForStaff']);
    Route::get('/alerts/short-leave', [LeaveController::class, 'shortLeaveAlerts']);
});
