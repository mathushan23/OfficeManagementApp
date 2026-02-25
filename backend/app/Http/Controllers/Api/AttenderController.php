<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class AttenderController extends Controller
{
    private function normalizeBranch(string $branch): string
    {
        return strtolower(trim($branch));
    }

    public function index(Request $request)
    {
        abort_unless($request->user()->role === 'boss', 403);
        return response()->json(User::where('role', 'attender')->get());
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->role === 'boss', 403);

        $validated = $request->validate([
            'name' => ['required', 'string'],
            'office_id' => ['required', 'string', 'unique:users,office_id'],
            'branch' => ['required', 'in:main,sm,kilinochi,Main,SM,Kilinochi'],
            'pin' => ['required', 'string', 'min:1', 'max:10'],
            'status' => ['required', 'in:currently_working,leaved'],
            'email' => ['nullable', 'email'],
        ]);

        if (User::pinAlreadyUsed($validated['pin'])) {
            return response()->json(['message' => 'PIN is already used by another user'], 422);
        }

        $attender = User::create([
            'name' => $validated['name'],
            'office_id' => $validated['office_id'],
            'branch' => $this->normalizeBranch($validated['branch']),
            'role' => 'attender',
            'pin_hash' => bcrypt($validated['pin']),
            'status' => $validated['status'],
            'email' => $validated['email'] ?? null,
        ]);

        return response()->json($attender, 201);
    }

    public function update(Request $request, User $user)
    {
        abort_unless($request->user()->role === 'boss', 403);

        if ($user->role !== 'attender') {
            return response()->json(['message' => 'Target user is not attender'], 422);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'string'],
            'branch' => ['sometimes', 'in:main,sm,kilinochi,Main,SM,Kilinochi'],
            'pin' => ['sometimes', 'string', 'min:1', 'max:10'],
            'status' => ['sometimes', 'in:currently_working,leaved'],
            'email' => ['nullable', 'email'],
        ]);

        if (isset($validated['branch'])) {
            $validated['branch'] = $this->normalizeBranch($validated['branch']);
        }

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
}

