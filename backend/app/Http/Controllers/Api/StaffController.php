<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\BirthdayWish;
use App\Models\LeaveRequest;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class StaffController extends Controller
{
    private function normalizeBranch(string $branch): string
    {
        return strtolower(trim($branch));
    }

    private function ensureAttenderCanManageBranch(Request $request, User $user): void
    {
        if (
            $request->user()->role === 'attender'
            && $this->normalizeBranch((string) $user->branch) !== $this->normalizeBranch((string) $request->user()->branch)
        ) {
            abort(403, 'You can manage only your branch staff');
        }
    }

    public function index(Request $request)
    {
        $this->authorizeRole($request->user()->role, ['boss', 'attender']);
        $query = User::where('role', 'staff');

        if ($request->user()->role === 'attender') {
            $query->where('branch', $request->user()->branch);
        }

        $rows = $query->orderBy('name')->get()->map(function (User $staff) {
            $effectiveInternEndDate = ($staff->employment_type ?? 'permanent') === 'intern'
                ? (
                    $staff->intern_end_date
                        ? Carbon::parse($staff->intern_end_date)
                            ->addDays($this->internAutoLeaveDays($staff))
                            ->toDateString()
                        : null
                )
                : null;

            return array_merge($staff->toArray(), [
                'effective_intern_end_date' => $effectiveInternEndDate,
            ]);
        });

        return response()->json($rows);
    }

    public function store(Request $request)
    {
        $this->authorizeRole($request->user()->role, ['attender']);

        $validated = $request->validate([
            'name' => ['required', 'string'],
            'office_id' => ['required', 'string', 'unique:users,office_id'],
            'branch' => ['required', 'in:main,sm,kilinochi,Main,SM,Kilinochi'],
            'pin' => ['required', 'string', 'min:1', 'max:10'],
            'status' => ['required', 'in:currently_working,leaved'],
            'email' => ['nullable', 'email'],
            'profile_photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'joining_date' => ['required', 'date'],
            'employment_type' => ['required', 'in:permanent,intern'],
            'intern_end_date' => ['nullable', 'date', 'after_or_equal:joining_date'],
        ]);

        $validated['branch'] = $this->normalizeBranch($validated['branch']);

        if ($request->user()->role === 'attender' && $validated['branch'] !== $this->normalizeBranch($request->user()->branch)) {
            return response()->json(['message' => 'You can add only your branch staff'], 422);
        }

        if (User::pinAlreadyUsed($validated['pin'])) {
            return response()->json(['message' => 'PIN is already used by another user'], 422);
        }

        $employmentType = $validated['employment_type'];
        if ($employmentType === 'intern' && empty($validated['intern_end_date'])) {
            return response()->json(['message' => 'intern_end_date is required for intern'], 422);
        }

        $joiningDate = $validated['joining_date'];
        $profilePhotoPath = null;
        if ($request->hasFile('profile_photo')) {
            $profilePhotoPath = $this->storeProfilePhoto($request);
        }

        $staff = User::create([
            'name' => $validated['name'],
            'office_id' => $validated['office_id'],
            'branch' => $validated['branch'],
            'role' => 'staff',
            'pin_hash' => bcrypt($validated['pin']),
            'status' => $validated['status'],
            'email' => $validated['email'] ?? null,
            'profile_photo' => $profilePhotoPath,
            'date_of_birth' => $validated['date_of_birth'] ?? null,
            'joining_date' => $joiningDate,
            'employment_type' => $employmentType,
            'intern_start_date' => $employmentType === 'intern' ? $joiningDate : null,
            'intern_end_date' => $employmentType === 'intern' ? ($validated['intern_end_date'] ?? null) : null,
        ]);

        return response()->json($staff, 201);
    }

    public function update(Request $request, User $user)
    {
        $this->authorizeRole($request->user()->role, ['attender']);

        if ($user->role !== 'staff') {
            return response()->json(['message' => 'Target user is not staff'], 422);
        }
        $this->ensureAttenderCanManageBranch($request, $user);

        $validated = $request->validate([
            'name' => ['sometimes', 'string'],
            'branch' => ['sometimes', 'in:main,sm,kilinochi,Main,SM,Kilinochi'],
            'pin' => ['sometimes', 'string', 'min:1', 'max:10'],
            'status' => ['sometimes', 'in:currently_working,leaved'],
            'email' => ['nullable', 'email'],
            'profile_photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'joining_date' => ['sometimes', 'date'],
            'employment_type' => ['sometimes', 'in:permanent,intern'],
            'intern_end_date' => ['nullable', 'date'],
        ]);

        if (isset($validated['branch'])) {
            $validated['branch'] = $this->normalizeBranch($validated['branch']);
        }

        if (isset($validated['branch']) && $request->user()->role === 'attender' && $validated['branch'] !== $this->normalizeBranch($request->user()->branch)) {
            return response()->json(['message' => 'You can move staff only within your branch'], 422);
        }

        if (isset($validated['pin'])) {
            if (User::pinAlreadyUsed($validated['pin'], $user->id)) {
                return response()->json(['message' => 'PIN is already used by another user'], 422);
            }
            $validated['pin_hash'] = bcrypt($validated['pin']);
            unset($validated['pin']);
        }

        if (($validated['employment_type'] ?? $user->employment_type) === 'intern') {
            if (empty($validated['intern_end_date']) && empty($user->intern_end_date)) {
                return response()->json(['message' => 'intern_end_date is required for intern'], 422);
            }
            $joiningDate = $validated['joining_date'] ?? $user->joining_date?->toDateString() ?? now()->toDateString();
            $internEndDate = $validated['intern_end_date'] ?? $user->intern_end_date?->toDateString();
            if (!empty($internEndDate) && $internEndDate < $joiningDate) {
                return response()->json(['message' => 'intern_end_date must be after or equal to joining_date'], 422);
            }
            $validated['intern_start_date'] = $joiningDate;
        } elseif (isset($validated['employment_type']) && $validated['employment_type'] === 'permanent') {
            $validated['intern_start_date'] = null;
            $validated['intern_end_date'] = null;
        }

        if ($request->hasFile('profile_photo')) {
            $this->deleteProfilePhoto($user->profile_photo);
            $validated['profile_photo'] = $this->storeProfilePhoto($request);
        }

        $user->update($validated);
        return response()->json($user);
    }

    public function birthdayReminders(Request $request)
    {
        $this->authorizeRole($request->user()->role, ['boss', 'attender']);

        $today = Carbon::today();
        $until = $today->copy()->addDays(7);

        $query = User::query()
            ->where('role', 'staff')
            ->whereNotNull('date_of_birth')
            ->where('status', 'currently_working');

        if ($request->user()->role === 'attender') {
            $query->where('branch', $request->user()->branch);
        }

        $rows = $query->orderBy('name')->get()->map(function (User $staff) use ($today) {
            $dob = Carbon::parse($staff->date_of_birth);
            $nextBirthday = $dob->copy()->year($today->year);
            if ($nextBirthday->lt($today)) {
                $nextBirthday->addYear();
            }

            return [
                'staff_id' => $staff->id,
                'name' => $staff->name,
                'office_id' => $staff->office_id,
                'branch' => $staff->branch,
                'date_of_birth' => $dob->toDateString(),
                'next_birthday' => $nextBirthday->toDateString(),
                'days_left' => $today->diffInDays($nextBirthday, false),
                'is_today' => $nextBirthday->isSameDay($today),
                'auto_wish_ready' => false,
            ];
        })
            ->filter(fn ($row) => $row['days_left'] >= 0 && $row['days_left'] <= 7)
            ->sortBy('days_left')
            ->values();

        if ($rows->isNotEmpty()) {
            $autoWishIds = BirthdayWish::query()
                ->whereDate('wish_date', $today->toDateString())
                ->whereNull('wished_by')
                ->whereIn('staff_id', $rows->pluck('staff_id')->all())
                ->pluck('staff_id')
                ->all();

            $autoWishLookup = array_fill_keys($autoWishIds, true);
            $rows = $rows->map(function (array $row) use ($autoWishLookup) {
                $row['auto_wish_ready'] = isset($autoWishLookup[$row['staff_id']]);
                return $row;
            })->values();
        }

        return response()->json($rows);
    }

    public function sendBirthdayWish(Request $request, User $user)
    {
        $this->authorizeRole($request->user()->role, ['boss', 'attender']);

        if ($user->role !== 'staff') {
            return response()->json(['message' => 'Target user is not staff'], 422);
        }

        if ($request->user()->role === 'attender' && $this->normalizeBranch((string) $request->user()->branch) !== $this->normalizeBranch((string) $user->branch)) {
            return response()->json(['message' => 'You can send wishes only to your branch staff'], 403);
        }

        if (empty($user->date_of_birth)) {
            return response()->json(['message' => 'Staff date of birth is not available'], 422);
        }

        if (empty($user->email)) {
            return response()->json(['message' => 'Staff email is not available'], 422);
        }

        $today = Carbon::today();
        $dob = Carbon::parse($user->date_of_birth);
        if ($dob->format('m-d') !== $today->format('m-d')) {
            return response()->json(['message' => 'Birthday wish can be sent only on birthday date'], 422);
        }

        $validated = $request->validate([
            'wish_message' => ['nullable', 'string', 'max:500'],
        ]);

        $wishMessage = trim((string) ($validated['wish_message'] ?? ''));
        if ($wishMessage === '') {
            $wishMessage = 'Wishing you a very Happy Birthday and a wonderful year ahead.';
        }

        $age = $dob->age;

        $wish = BirthdayWish::updateOrCreate(
            [
                'staff_id' => $user->id,
                'wished_by' => $request->user()->id,
                'wish_date' => $today->toDateString(),
            ],
            [
                'wish_message' => $wishMessage,
            ]
        );

        $subject = "Happy Birthday {$user->name}";
        $html = "
            <div style='font-family:Segoe UI,Arial,sans-serif;background:linear-gradient(135deg,#0f172a,#1e293b);padding:24px;'>
                <div style='max-width:700px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 20px 50px rgba(2,6,23,.35);'>
                    <div style='position:relative;background:linear-gradient(135deg,#fd7e14,#fb923c,#f97316);color:#fff;padding:20px 22px 16px;overflow:hidden;'>
                        <div style='position:absolute;right:-28px;top:-24px;width:124px;height:124px;border-radius:999px;background:rgba(255,255,255,.14);'></div>
                        <div style='position:absolute;left:-34px;bottom:-48px;width:140px;height:140px;border-radius:999px;background:rgba(255,255,255,.1);'></div>
                        <div style='position:relative;z-index:2;'>
                            <div style='font-size:28px;font-weight:900;letter-spacing:.3px;'>//WEBbuilders.lk</div>
                            <div style='margin-top:8px;font-size:30px;line-height:1.15;font-weight:800;'>Happy Birthday, {$user->name}!</div>
                            <div style='margin-top:4px;font-size:12px;opacity:.94;letter-spacing:1.5px;text-transform:uppercase;'>Celebrating your special day</div>
                        </div>
                    </div>
                    <div style='padding:26px 26px 24px;color:#1e293b;background:linear-gradient(180deg,#ffffff,#fff7ed);'>
                        <div style='display:inline-block;padding:7px 12px;border-radius:999px;background:#ffedd5;color:#9a3412;font-weight:700;font-size:12px;letter-spacing:.3px;text-transform:uppercase;'>Birthday Greeting</div>
                        <div style='margin-top:16px;padding:16px 18px;border-radius:14px;background:#ffffff;border:1px solid #fed7aa;box-shadow:0 6px 18px rgba(251,146,60,.14);'>
                            <p style='margin:0 0 8px;font-size:16px;'><strong>Name:</strong> {$user->name}</p>
                            <p style='margin:0 0 8px;font-size:16px;'><strong>Birthday:</strong> {$today->toDateString()}</p>
                            <p style='margin:0;font-size:16px;'><strong>Age:</strong> {$age}</p>
                        </div>
                        <div style='margin-top:16px;padding:16px 18px;border-radius:14px;background:linear-gradient(135deg,#fff7ed,#ffedd5);border:1px solid #fdba74;font-size:17px;line-height:1.7;font-weight:600;'>
                            {$wishMessage}
                        </div>
                        <div style='margin-top:18px;padding-top:14px;border-top:1px dashed #fdba74;color:#7c2d12;font-size:14px;font-weight:700;'>
                            Best wishes from WEBbuilders.lk
                        </div>
                    </div>
                </div>
            </div>
        ";

        try {
            Mail::send([], [], function ($message) use ($user, $subject, $html) {
                $message->to($user->email)->subject($subject)->html($html);
            });
        } catch (\Throwable) {
            // Keep request successful even if SMTP is misconfigured.
        }

        return response()->json([
            'message' => 'Birthday wish card sent successfully.',
            'wish_id' => $wish->id,
        ]);
    }

    public function myBirthdayWishCard(Request $request)
    {
        abort_unless($request->user()->role === 'staff', 403);

        $staff = $request->user();
        if (empty($staff->date_of_birth)) {
            return response()->json(['message' => 'Date of birth not available'], 422);
        }

        $today = Carbon::today();
        $dob = Carbon::parse($staff->date_of_birth);
        if ($dob->format('m-d') !== $today->format('m-d')) {
            return response()->json(['message' => 'Birthday card is available only on your birthday'], 422);
        }

        $wish = BirthdayWish::query()
            ->where('staff_id', $staff->id)
            ->whereDate('wish_date', $today->toDateString())
            ->latest('id')
            ->first();

        if (!$wish) {
            return response()->json(['message' => 'No birthday wish card has been sent yet for today'], 404);
        }

        return response()->json([
            'staff_name' => $staff->name,
            'birthday_date' => $today->toDateString(),
            'age' => $dob->age,
            'profile_photo' => $staff->profile_photo,
            'profile_photo_data' => $this->profilePhotoDataUrl($staff->profile_photo),
            'wish_message' => $wish->wish_message,
            'logo_text' => '//WEBbuilders.lk',
        ]);
    }

    public function branchBirthdayWishCards(Request $request)
    {
        abort_unless($request->user()->role === 'staff', 403);

        $viewer = $request->user();
        $today = Carbon::today('Asia/Colombo');

        $birthdayStaff = User::query()
            ->where('role', 'staff')
            ->where('status', 'currently_working')
            ->where('branch', $viewer->branch)
            ->whereNotNull('date_of_birth')
            ->whereMonth('date_of_birth', $today->month)
            ->whereDay('date_of_birth', $today->day)
            ->orderBy('name')
            ->get();

        if ($birthdayStaff->isEmpty()) {
            return response()->json([]);
        }

        $wishByStaffId = BirthdayWish::query()
            ->whereDate('wish_date', $today->toDateString())
            ->whereNull('wished_by')
            ->whereIn('staff_id', $birthdayStaff->pluck('id')->all())
            ->get()
            ->keyBy('staff_id');

        $cards = $birthdayStaff
            ->map(function (User $staff) use ($wishByStaffId, $today) {
                $wish = $wishByStaffId->get($staff->id);
                if (!$wish) {
                    return null;
                }

                $dob = Carbon::parse($staff->date_of_birth);

                return [
                    'staff_id' => $staff->id,
                    'staff_name' => $staff->name,
                    'birthday_date' => $today->toDateString(),
                    'age' => $dob->age,
                    'profile_photo' => $staff->profile_photo,
                    'profile_photo_data' => $this->profilePhotoDataUrl($staff->profile_photo),
                    'wish_message' => $wish->wish_message,
                    'logo_text' => '//WEBbuilders.lk',
                ];
            })
            ->filter()
            ->values();

        return response()->json($cards);
    }

    public function updateMyProfilePhoto(Request $request)
    {
        abort_unless($request->user()->role === 'staff', 403);

        $request->validate([
            'profile_photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        /** @var User $staff */
        $staff = $request->user();

        $this->deleteProfilePhoto($staff->profile_photo);

        $staff->update([
            'profile_photo' => $this->storeProfilePhoto($request),
        ]);

        return response()->json($staff->fresh());
    }

    private function profilePhotoDataUrl(?string $path): ?string
    {
        if (empty($path)) {
            return null;
        }

        $normalizedPath = ltrim($path, '/');
        if (str_starts_with($normalizedPath, 'storage/')) {
            $normalizedPath = substr($normalizedPath, strlen('storage/'));
        }

        $raw = null;
        if (Storage::disk('public')->exists($normalizedPath)) {
            $raw = Storage::disk('public')->get($normalizedPath);
        } else {
            $publicAbsolutePath = public_path($normalizedPath);
            if (is_file($publicAbsolutePath) && is_readable($publicAbsolutePath)) {
                $raw = file_get_contents($publicAbsolutePath) ?: null;
            }
        }
        if ($raw === null) {
            return null;
        }
        $ext = strtolower(pathinfo($normalizedPath, PATHINFO_EXTENSION));
        $mime = match ($ext) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'webp' => 'image/webp',
            default => 'application/octet-stream',
        };

        return 'data:' . $mime . ';base64,' . base64_encode($raw);
    }

    private function storeProfilePhoto(Request $request): string
    {
        $photo = $request->file('profile_photo');
        $targetDir = public_path('staff-profiles');
        if (!is_dir($targetDir)) {
            @mkdir($targetDir, 0755, true);
        }
        $ext = strtolower((string) $photo->getClientOriginalExtension());
        if ($ext === '') {
            $ext = strtolower((string) $photo->extension());
        }
        if ($ext === '') {
            $ext = 'jpg';
        }

        $filename = Str::random(40) . '.' . $ext;
        $photo->move($targetDir, $filename);

        return 'staff-profiles/' . $filename;
    }

    private function deleteProfilePhoto(?string $path): void
    {
        if (empty($path)) {
            return;
        }

        $normalizedPath = ltrim((string) $path, '/');
        if (str_starts_with($normalizedPath, 'storage/')) {
            $normalizedPath = substr($normalizedPath, strlen('storage/'));
        }

        $publicAbsolutePath = public_path($normalizedPath);
        if (is_file($publicAbsolutePath)) {
            @unlink($publicAbsolutePath);
        }

        if (Storage::disk('public')->exists($normalizedPath)) {
            Storage::disk('public')->delete($normalizedPath);
        }
    }

    private function internAutoLeaveDays(User $staff): int
    {
        if (($staff->employment_type ?? 'permanent') !== 'intern') {
            return 0;
        }

        $start = Carbon::parse($staff->intern_start_date ?? $staff->joining_date ?? now()->toDateString())->startOfDay();
        $end = Carbon::parse($staff->intern_end_date ?? now()->toDateString())->startOfDay();
        $today = Carbon::today();
        if ($end->gt($today)) {
            $end = $today;
        }
        if ($start->gt($end)) {
            return 0;
        }

        return (int) ceil($this->ruleBasedLeaveDaysForRange($staff, $start, $end));
    }

    private function leaveScoreByDate(User $staff, Carbon $start, Carbon $end): array
    {
        $requests = LeaveRequest::query()
            ->where('staff_id', $staff->id)
            ->where('status', 'approved')
            ->whereDate('start_date', '<=', $end->toDateString())
            ->whereDate('rejoin_date', '>=', $start->toDateString())
            ->orderBy('id')
            ->get([
                'leave_type',
                'start_date',
                'days_count',
            ]);

        $scores = [];
        foreach ($requests as $request) {
            if (in_array($request->leave_type, ['full_day', 'special_leave'], true)) {
                $cursor = Carbon::parse($request->start_date)->startOfDay();
                $remainingDays = max((int) ($request->days_count ?? 1), 1);
                while ($remainingDays > 0 && $cursor->lte($end)) {
                    if (!$cursor->isSunday()) {
                        if ($cursor->gte($start)) {
                            $key = $cursor->toDateString();
                            $isSpecialLeave = $request->leave_type === 'special_leave';
                            if ($isSpecialLeave) {
                                $scores[$key] = [
                                    'score' => 0.0,
                                    'is_exempt' => true,
                                ];
                            } else {
                                $existing = $scores[$key] ?? null;
                                if ($existing === null || (!(bool) ($existing['is_exempt'] ?? false) && (float) ($existing['score'] ?? 0) < 1.0)) {
                                    $scores[$key] = [
                                        'score' => 1.0,
                                        'is_exempt' => false,
                                    ];
                                }
                            }
                        }
                        $remainingDays--;
                    }
                    $cursor->addDay();
                }
                continue;
            }

            $requestDate = Carbon::parse($request->start_date)->startOfDay();
            if ($requestDate->lt($start) || $requestDate->gt($end) || $requestDate->isSunday()) {
                continue;
            }

            $isSpecialLeave = $request->leave_type === 'special_leave';
            $score = $request->leave_type === 'half_day' ? 0.5 : ($request->leave_type === 'short_leave' ? 0.25 : 0.0);
            if (!$isSpecialLeave && $score <= 0) {
                continue;
            }

            $key = $requestDate->toDateString();
            $existing = $scores[$key] ?? null;
            if (
                $existing === null
                || ($isSpecialLeave && !(bool) ($existing['is_exempt'] ?? false))
                || ((bool) ($existing['is_exempt'] ?? false) === false && (float) $existing['score'] < $score)
            ) {
                $scores[$key] = [
                    'score' => $score,
                    'is_exempt' => $isSpecialLeave,
                ];
            }
        }

        return $scores;
    }

    private function ruleBasedLeaveDaysForRange(User $staff, Carbon $start, Carbon $end): float
    {
        if ($start->gt($end)) {
            return 0;
        }

        $attendanceByDate = Attendance::where('staff_id', $staff->id)
            ->whereDate('date', '>=', $start->toDateString())
            ->whereDate('date', '<=', $end->toDateString())
            ->get()
            ->keyBy(fn ($a) => Carbon::parse($a->date)->toDateString());

        $companyLeaveByDate = $this->branchCompanyLeaveDatesForRange($staff, $start, $end);
        $leaveScoreByDate = $this->leaveScoreByDate($staff, $start, $end);
        $total = 0.0;
        $cursor = $start->copy();
        while ($cursor->lte($end)) {
            $key = $cursor->toDateString();
            if ($cursor->isSunday()) {
                $cursor->addDay();
                continue;
            }

            if (isset($companyLeaveByDate[$key])) {
                $cursor->addDay();
                continue;
            }

            $attendance = $attendanceByDate->get($key);
            if ((bool) ($attendance?->is_company_leave ?? false)) {
                $cursor->addDay();
                continue;
            }

            if ((bool) ($leaveScoreByDate[$key]['is_exempt'] ?? false)) {
                $cursor->addDay();
                continue;
            }

            // If attendance is not marked, count as full-day leave regardless of leave request type.
            if ($attendance === null) {
                $total += 1.0;
            } elseif (array_key_exists($key, $leaveScoreByDate)) {
                // Partial leave applies only when attendance exists.
                $total += (float) ($leaveScoreByDate[$key]['score'] ?? 0);
            }

            $cursor->addDay();
        }

        return round($total, 2);
    }

    private function branchCompanyLeaveDatesForRange(User $staff, Carbon $start, Carbon $end): array
    {
        if ($start->gt($end)) {
            return [];
        }

        $today = Carbon::today();
        $branchStaffIds = User::query()
            ->where('role', 'staff')
            ->where('branch', $staff->branch)
            ->pluck('id');

        if ($branchStaffIds->isEmpty()) {
            return [];
        }

        $attendanceDates = Attendance::query()
            ->whereIn('staff_id', $branchStaffIds)
            ->whereDate('date', '>=', $start->toDateString())
            ->whereDate('date', '<=', $end->toDateString())
            ->select('date')
            ->distinct()
            ->pluck('date')
            ->map(fn ($d) => Carbon::parse($d)->toDateString())
            ->flip();

        $companyLeave = [];
        $cursor = $start->copy();
        while ($cursor->lte($end)) {
            if (!$cursor->isSunday() && $cursor->lt($today)) {
                $key = $cursor->toDateString();
                if (!$attendanceDates->has($key)) {
                    $companyLeave[$key] = true;
                }
            }
            $cursor->addDay();
        }

        return $companyLeave;
    }

    private function authorizeRole(string $role, array $allowed): void
    {
        abort_unless(in_array($role, $allowed, true), 403, 'Unauthorized role');
    }
}
