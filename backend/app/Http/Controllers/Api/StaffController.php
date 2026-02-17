<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class StaffController extends Controller
{
    public function index(Request $request)
    {
        $this->authorizeRole($request->user()->role, ['boss', 'attender']);
        return response()->json(User::where('role', 'staff')->get());
    }

    public function store(Request $request)
    {
        $this->authorizeRole($request->user()->role, ['attender']);

        $validated = $request->validate([
            'name' => ['required', 'string'],
            'office_id' => ['required', 'string', 'unique:users,office_id'],
            'branch' => ['required', 'string'],
            'pin' => ['required', 'string', 'min:1', 'max:10'],
            'status' => ['required', 'in:currently_working,leaved'],
            'email' => ['nullable', 'email'],
        ]);

        if (User::pinAlreadyUsed($validated['pin'])) {
            return response()->json(['message' => 'PIN is already used by another user'], 422);
        }

        $staff = User::create([
            'name' => $validated['name'],
            'office_id' => $validated['office_id'],
            'branch' => $validated['branch'],
            'role' => 'staff',
            'pin_hash' => bcrypt($validated['pin']),
            'status' => $validated['status'],
            'email' => $validated['email'] ?? null,
        ]);

        return response()->json($staff, 201);
    }

    public function update(Request $request, User $user)
    {
        $this->authorizeRole($request->user()->role, ['attender']);

        if ($user->role !== 'staff') {
            return response()->json(['message' => 'Target user is not staff'], 422);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'string'],
            'branch' => ['sometimes', 'string'],
            'pin' => ['sometimes', 'string', 'min:1', 'max:10'],
            'status' => ['sometimes', 'in:currently_working,leaved'],
            'email' => ['nullable', 'email'],
        ]);

        if (isset($validated['pin'])) {
            if (User::pinAlreadyUsed($validated['pin'], $user->id)) {
                return response()->json(['message' => 'PIN is already used by another user'], 422);
            }
            $validated['pin_hash'] = bcrypt($validated['pin']);
            unset($validated['pin']);
        }

        $user->update($validated);
        return response()->json($user);
    }

    private function authorizeRole(string $role, array $allowed): void
    {
        abort_unless(in_array($role, $allowed, true), 403, 'Unauthorized role');
    }
}
