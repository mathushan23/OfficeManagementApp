<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\JwtService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class JwtCookieAuthenticate
{
    public function __construct(private JwtService $jwtService)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $cookieName = (string) config('jwt.cookie_name', 'office_access_token');
        $token = (string) $request->cookie($cookieName, '');

        if ($token === '') {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $payload = $this->jwtService->parseAndValidate($token);
        if (!$payload) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $user = User::query()->find((int) $payload['sub']);
        if (!$user || $user->status !== 'currently_working') {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        Auth::setUser($user);
        $request->setUserResolver(static fn () => $user);

        return $next($request);
    }
}

