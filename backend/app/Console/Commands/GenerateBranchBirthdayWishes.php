<?php

namespace App\Console\Commands;

use App\Models\BirthdayWish;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class GenerateBranchBirthdayWishes extends Command
{
    protected $signature = 'birthday:wishes:auto';

    protected $description = 'Generate automatic birthday wishes for today (branch-wise)';

    public function handle(): int
    {
        $today = Carbon::today('Asia/Colombo');
        $defaultWish = 'Wishing you a very Happy Birthday and a wonderful year ahead.';

        $staffRows = User::query()
            ->where('role', 'staff')
            ->where('status', 'currently_working')
            ->whereNotNull('date_of_birth')
            ->get();

        $createdCount = 0;
        $mailSentCount = 0;

        foreach ($staffRows as $staff) {
            $dob = Carbon::parse($staff->date_of_birth);
            if ($dob->format('m-d') !== $today->format('m-d')) {
                continue;
            }

            $wish = BirthdayWish::updateOrCreate(
                [
                    'staff_id' => $staff->id,
                    'wished_by' => null,
                    'wish_date' => $today->toDateString(),
                ],
                [
                    'wish_message' => $defaultWish,
                ]
            );

            if ($wish->wasRecentlyCreated) {
                $createdCount++;

                if (!empty($staff->email)) {
                    $subject = "Happy Birthday {$staff->name}";
                    $html = "
                        <div style='font-family:Segoe UI,Arial,sans-serif;background:linear-gradient(135deg,#0f172a,#1e293b);padding:24px;'>
                            <div style='max-width:700px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 20px 50px rgba(2,6,23,.35);'>
                                <div style='position:relative;background:linear-gradient(135deg,#fd7e14,#fb923c,#f97316);color:#fff;padding:20px 22px 16px;overflow:hidden;'>
                                    <div style='position:absolute;right:-28px;top:-24px;width:124px;height:124px;border-radius:999px;background:rgba(255,255,255,.14);'></div>
                                    <div style='position:absolute;left:-34px;bottom:-48px;width:140px;height:140px;border-radius:999px;background:rgba(255,255,255,.1);'></div>
                                    <div style='position:relative;z-index:2;'>
                                        <div style='font-size:28px;font-weight:900;letter-spacing:.3px;'>//WEBbuilders.lk</div>
                                        <div style='margin-top:8px;font-size:30px;line-height:1.15;font-weight:800;'>Happy Birthday, {$staff->name}!</div>
                                        <div style='margin-top:4px;font-size:12px;opacity:.94;letter-spacing:1.5px;text-transform:uppercase;'>Celebrating your special day</div>
                                    </div>
                                </div>
                                <div style='padding:26px 26px 24px;color:#1e293b;background:linear-gradient(180deg,#ffffff,#fff7ed);'>
                                    <div style='display:inline-block;padding:7px 12px;border-radius:999px;background:#ffedd5;color:#9a3412;font-weight:700;font-size:12px;letter-spacing:.3px;text-transform:uppercase;'>Birthday Greeting</div>
                                    <div style='margin-top:16px;padding:16px 18px;border-radius:14px;background:#ffffff;border:1px solid #fed7aa;box-shadow:0 6px 18px rgba(251,146,60,.14);'>
                                        <p style='margin:0 0 8px;font-size:16px;'><strong>Name:</strong> {$staff->name}</p>
                                        <p style='margin:0;font-size:16px;'><strong>Birthday:</strong> {$today->toDateString()}</p>
                                    </div>
                                    <div style='margin-top:16px;padding:16px 18px;border-radius:14px;background:linear-gradient(135deg,#fff7ed,#ffedd5);border:1px solid #fdba74;font-size:17px;line-height:1.7;font-weight:600;'>
                                        {$defaultWish}
                                    </div>
                                    <div style='margin-top:18px;padding-top:14px;border-top:1px dashed #fdba74;color:#7c2d12;font-size:14px;font-weight:700;'>
                                        Best wishes from WEBbuilders.lk
                                    </div>
                                </div>
                            </div>
                        </div>
                    ";

                    try {
                        Mail::send([], [], function ($message) use ($staff, $subject, $html) {
                            $message->to($staff->email)->subject($subject)->html($html);
                        });
                        $mailSentCount++;
                    } catch (\Throwable) {
                        // Keep scheduler successful even if SMTP fails.
                    }
                }
            }
        }

        $this->info("Auto birthday wishes processed for {$today->toDateString()}. New records: {$createdCount}, mails sent: {$mailSentCount}");

        return self::SUCCESS;
    }
}
