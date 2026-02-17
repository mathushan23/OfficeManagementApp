<?php

namespace App\Services;

use Carbon\Carbon;

class LeaveDateService
{
    public function calculateRejoinDate(string $startDate, int $workingDays): string
    {
        $date = Carbon::parse($startDate);
        $remaining = $workingDays;

        while ($remaining > 0) {
            if (!$date->isSunday()) {
                $remaining--;
            }
            if ($remaining > 0) {
                $date->addDay();
            }
        }

        do {
            $date->addDay();
        } while ($date->isSunday());

        return $date->toDateString();
    }
}
