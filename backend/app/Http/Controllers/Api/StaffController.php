<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

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
                ? $staff->intern_end_date?->toDateString()
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
            'branch' => ['required', 'in:main,sm,Main,SM'],
            'pin' => ['required', 'string', 'min:1', 'max:10'],
            'status' => ['required', 'in:currently_working,leaved'],
            'email' => ['nullable', 'email'],
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

        $staff = User::create([
            'name' => $validated['name'],
            'office_id' => $validated['office_id'],
            'branch' => $validated['branch'],
            'role' => 'staff',
            'pin_hash' => bcrypt($validated['pin']),
            'status' => $validated['status'],
            'email' => $validated['email'] ?? null,
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
            'branch' => ['sometimes', 'in:main,sm,Main,SM'],
            'pin' => ['sometimes', 'string', 'min:1', 'max:10'],
            'status' => ['sometimes', 'in:currently_working,leaved'],
            'email' => ['nullable', 'email'],
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

        $user->update($validated);
        return response()->json($user);
    }

    private function authorizeRole(string $role, array $allowed): void
    {
        abort_unless(in_array($role, $allowed, true), 403, 'Unauthorized role');
    }
}
