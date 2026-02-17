<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\JwtService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function __construct(private JwtService $jwtService)
    {
    }

    public function pinLogin(Request $request)
    {
        $request->validate([
            'pin' => ['required', 'string', 'min:1', 'max:10'],
        ]);

        $user = User::all()->first(function ($item) use ($request) {
            return Hash::check($request->pin, $item->pin_hash);
        });

        if (!$user) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        if ($user->status !== 'currently_working') {
            return response()->json(['message' => 'User is not active'], 403);
        }

        $token = $this->jwtService->makeToken($user->id);
        $cookieName = (string) config('jwt.cookie_name', 'office_access_token');
        $ttlMinutes = max(1, (int) config('jwt.ttl_minutes', 1440));
        $isSecure = app()->environment('production');

        $cookie = cookie(
            $cookieName,
            $token,
            $ttlMinutes,
            '/',
            null,
            $isSecure,
            true,
            false,
            'lax'
        );

        return response()->json([
            'user' => $user,
        ])->cookie($cookie);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    public function logout()
    {
        $cookieName = (string) config('jwt.cookie_name', 'office_access_token');
        return response()->json(['message' => 'Logged out'])->withoutCookie($cookieName, '/');
    }
}
