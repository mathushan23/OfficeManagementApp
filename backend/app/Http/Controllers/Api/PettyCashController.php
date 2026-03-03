<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PettyCashTransaction;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PettyCashController extends Controller
{
    private const LOW_BALANCE_THRESHOLD = 1000.0;

    private function resolveProofImageUrl(?string $path): ?string
    {
        if (empty($path)) {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        $normalized = ltrim($path, '/');
        $appUrl = rtrim((string) config('app.url', ''), '/');

        if (
            str_starts_with($normalized, 'petty-cash-proofs/')
            || str_starts_with($normalized, 'tasklog-proofs/')
            || str_starts_with($normalized, 'staff-profiles/')
        ) {
            return $appUrl !== '' ? "{$appUrl}/{$normalized}" : "/{$normalized}";
        }

        return Storage::disk('public')->url($normalized);
    }

    private function storePublicImage($file, string $folder): string
    {
        $targetDir = public_path($folder);
        if (!is_dir($targetDir)) {
            @mkdir($targetDir, 0755, true);
        }

        $ext = strtolower((string) $file->getClientOriginalExtension());
        if ($ext === '') {
            $ext = strtolower((string) $file->extension());
        }
        if ($ext === '') {
            $ext = 'jpg';
        }

        $filename = Str::random(40) . '.' . $ext;
        $file->move($targetDir, $filename);

        return $folder . '/' . $filename;
    }

    private function authorizeBoss(Request $request): void
    {
        abort_unless($request->user()->role === 'boss', 403);
    }

    private function resolveAttender(int $attenderId): User
    {
        $attender = User::findOrFail($attenderId);
        abort_unless($attender->role === 'attender', 422, 'Selected user is not an attender');
        return $attender;
    }

    private function getAttenderBalance(int $attenderId): float
    {
        $value = PettyCashTransaction::query()
            ->where('attender_id', $attenderId)
            ->selectRaw(
                "COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE -amount END), 0) AS balance"
            )
            ->value('balance');

        return round((float) ($value ?? 0), 2);
    }

    public function summary(Request $request)
    {
        $this->authorizeBoss($request);

        $attenders = User::query()
            ->where('role', 'attender')
            ->where('status', 'currently_working')
            ->orderBy('name')
            ->get(['id', 'name', 'office_id', 'branch']);

        $balances = PettyCashTransaction::query()
            ->select('attender_id')
            ->selectRaw(
                "COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE -amount END), 0) AS balance"
            )
            ->groupBy('attender_id')
            ->pluck('balance', 'attender_id');

        $rows = $attenders->map(function (User $attender) use ($balances) {
            $balance = round((float) ($balances[$attender->id] ?? 0), 2);
            return [
                'attender_id' => $attender->id,
                'attender_name' => $attender->name,
                'office_id' => $attender->office_id,
                'branch' => $attender->branch,
                'balance' => $balance,
                'is_low_balance' => $balance < self::LOW_BALANCE_THRESHOLD,
            ];
        })->values();

        $lowBalances = $rows->filter(fn ($row) => $row['is_low_balance'])->values();

        return response()->json([
            'threshold' => self::LOW_BALANCE_THRESHOLD,
            'overall_balance' => round((float) $rows->sum('balance'), 2),
            'low_balance_count' => $lowBalances->count(),
            'low_balances' => $lowBalances,
            'balances' => $rows,
        ]);
    }

    public function history(Request $request)
    {
        $this->authorizeBoss($request);

        $validated = $request->validate([
            'attender_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $query = PettyCashTransaction::query()
            ->with([
                'attender:id,name,office_id,branch',
                'creator:id,name,office_id',
            ])
            ->orderByDesc('transaction_date')
            ->orderByDesc('id');

        if (!empty($validated['attender_id'])) {
            $this->resolveAttender((int) $validated['attender_id']);
            $query->where('attender_id', (int) $validated['attender_id']);
        }

        $rows = $query->limit(500)->get()->map(function (PettyCashTransaction $row) {
            return [
                'id' => $row->id,
                'transaction_type' => $row->transaction_type,
                'amount' => round((float) $row->amount, 2),
                'transaction_date' => optional($row->transaction_date)->toDateString(),
                'note' => $row->note,
                'proof_image' => $row->proof_image,
                'proof_image_url' => $this->resolveProofImageUrl($row->proof_image),
                'attender' => [
                    'id' => $row->attender?->id,
                    'name' => $row->attender?->name,
                    'office_id' => $row->attender?->office_id,
                    'branch' => $row->attender?->branch,
                ],
                'created_by' => [
                    'id' => $row->creator?->id,
                    'name' => $row->creator?->name,
                    'office_id' => $row->creator?->office_id,
                ],
            ];
        })->values();

        return response()->json([
            'petty_cash_history' => $rows->where('transaction_type', 'credit')->values(),
            'expense_history' => $rows->where('transaction_type', 'debit')->values(),
        ]);
    }

    public function addPettyCash(Request $request)
    {
        $this->authorizeBoss($request);

        $validated = $request->validate([
            'attender_id' => ['required', 'integer', 'exists:users,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'transaction_date' => ['nullable', 'date'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $attender = $this->resolveAttender((int) $validated['attender_id']);

        PettyCashTransaction::create([
            'attender_id' => $attender->id,
            'created_by' => $request->user()->id,
            'transaction_type' => 'credit',
            'amount' => (float) $validated['amount'],
            'transaction_date' => $validated['transaction_date'] ?? now()->toDateString(),
            'note' => isset($validated['note']) ? trim((string) $validated['note']) : null,
        ]);

        $balance = $this->getAttenderBalance($attender->id);

        return response()->json([
            'message' => 'Petty cash added successfully.',
            'attender_id' => $attender->id,
            'balance' => $balance,
            'is_low_balance' => $balance < self::LOW_BALANCE_THRESHOLD,
        ], 201);
    }

    public function addExpense(Request $request)
    {
        $this->authorizeBoss($request);

        $validated = $request->validate([
            'attender_id' => ['required', 'integer', 'exists:users,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'transaction_date' => ['nullable', 'date'],
            'note' => ['required', 'string', 'max:255'],
            'proof_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $attender = $this->resolveAttender((int) $validated['attender_id']);
        $amount = round((float) $validated['amount'], 2);

        $proofPath = null;
        if ($request->hasFile('proof_image')) {
            $proofPath = $this->storePublicImage($request->file('proof_image'), 'petty-cash-proofs');
        }

        PettyCashTransaction::create([
            'attender_id' => $attender->id,
            'created_by' => $request->user()->id,
            'transaction_type' => 'debit',
            'amount' => $amount,
            'transaction_date' => $validated['transaction_date'] ?? now()->toDateString(),
            'note' => trim((string) $validated['note']),
            'proof_image' => $proofPath,
        ]);

        $balance = $this->getAttenderBalance($attender->id);

        return response()->json([
            'message' => 'Expense recorded successfully.',
            'attender_id' => $attender->id,
            'balance' => $balance,
            'is_low_balance' => $balance < self::LOW_BALANCE_THRESHOLD,
        ], 201);
    }

    public function mySummary(Request $request)
    {
        abort_unless($request->user()->role === 'attender', 403);

        $balance = $this->getAttenderBalance($request->user()->id);

        return response()->json([
            'threshold' => self::LOW_BALANCE_THRESHOLD,
            'balance' => $balance,
            'is_low_balance' => $balance < self::LOW_BALANCE_THRESHOLD,
        ]);
    }

    public function myHistory(Request $request)
    {
        abort_unless($request->user()->role === 'attender', 403);

        $rows = PettyCashTransaction::query()
            ->where('attender_id', $request->user()->id)
            ->with(['creator:id,name,office_id'])
            ->orderByDesc('transaction_date')
            ->orderByDesc('id')
            ->limit(500)
            ->get()
            ->map(function (PettyCashTransaction $row) {
                return [
                    'id' => $row->id,
                    'transaction_type' => $row->transaction_type,
                    'amount' => round((float) $row->amount, 2),
                    'transaction_date' => optional($row->transaction_date)->toDateString(),
                    'note' => $row->note,
                    'proof_image' => $row->proof_image,
                    'proof_image_url' => $this->resolveProofImageUrl($row->proof_image),
                    'created_by' => [
                        'id' => $row->creator?->id,
                        'name' => $row->creator?->name,
                        'office_id' => $row->creator?->office_id,
                    ],
                ];
            })->values();

        return response()->json([
            'petty_cash_history' => $rows->where('transaction_type', 'credit')->values(),
            'expense_history' => $rows->where('transaction_type', 'debit')->values(),
        ]);
    }

    public function submitExpense(Request $request)
    {
        abort_unless($request->user()->role === 'attender', 403);

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'expense_date' => ['nullable', 'date'],
            'note' => ['required', 'string', 'max:255'],
            'proof_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $proofPath = null;
        if ($request->hasFile('proof_image')) {
            $proofPath = $this->storePublicImage($request->file('proof_image'), 'petty-cash-proofs');
        }

        PettyCashTransaction::create([
            'attender_id' => $request->user()->id,
            'created_by' => $request->user()->id,
            'transaction_type' => 'debit',
            'amount' => round((float) $validated['amount'], 2),
            'transaction_date' => $validated['expense_date'] ?? now()->toDateString(),
            'note' => trim((string) $validated['note']),
            'proof_image' => $proofPath,
        ]);

        $balance = $this->getAttenderBalance($request->user()->id);

        return response()->json([
            'message' => 'Expense recorded successfully.',
            'balance' => $balance,
            'is_low_balance' => $balance < self::LOW_BALANCE_THRESHOLD,
        ], 201);
    }
}
