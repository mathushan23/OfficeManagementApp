<?php

return [
    'secret' => env('JWT_SECRET', env('APP_KEY')),
    'ttl_minutes' => (int) env('JWT_TTL_MINUTES', 60 * 24),
    'cookie_name' => env('JWT_COOKIE_NAME', 'office_access_token'),
];

