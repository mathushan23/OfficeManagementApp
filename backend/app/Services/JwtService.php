<?php

namespace App\Services;

use Carbon\CarbonImmutable;

class JwtService
{
    public function makeToken(int $userId): string
    {
        $now = CarbonImmutable::now()->timestamp;
        $ttl = max(1, (int) config('jwt.ttl_minutes', 1440)) * 60;

        $header = ['alg' => 'HS256', 'typ' => 'JWT'];
        $payload = [
            'sub' => $userId,
            'iat' => $now,
            'exp' => $now + $ttl,
        ];

        $headerEncoded = $this->base64UrlEncode(json_encode($header, JSON_THROW_ON_ERROR));
        $payloadEncoded = $this->base64UrlEncode(json_encode($payload, JSON_THROW_ON_ERROR));
        $signature = $this->sign("{$headerEncoded}.{$payloadEncoded}");

        return "{$headerEncoded}.{$payloadEncoded}.{$signature}";
    }

    public function parseAndValidate(string $token): ?array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        [$headerEncoded, $payloadEncoded, $signature] = $parts;
        $expected = $this->sign("{$headerEncoded}.{$payloadEncoded}");
        if (!hash_equals($expected, $signature)) {
            return null;
        }

        $payloadRaw = $this->base64UrlDecode($payloadEncoded);
        if ($payloadRaw === false) {
            return null;
        }

        try {
            $payload = json_decode($payloadRaw, true, 512, JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            return null;
        }

        if (!is_array($payload) || empty($payload['sub']) || empty($payload['exp'])) {
            return null;
        }

        if ((int) $payload['exp'] < CarbonImmutable::now()->timestamp) {
            return null;
        }

        return $payload;
    }

    private function sign(string $data): string
    {
        $secret = (string) config('jwt.secret', '');
        if (str_starts_with($secret, 'base64:')) {
            $secret = base64_decode(substr($secret, 7), true) ?: $secret;
        }

        return $this->base64UrlEncode(hash_hmac('sha256', $data, $secret, true));
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $value): string|false
    {
        $padding = strlen($value) % 4;
        if ($padding > 0) {
            $value .= str_repeat('=', 4 - $padding);
        }

        return base64_decode(strtr($value, '-_', '+/'), true);
    }
}

