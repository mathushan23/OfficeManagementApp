<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CommissionManagerAttender;
use App\Models\ProjectAssignment;
use App\Models\ProjectAssignmentCommissionAdvance;
use App\Models\User;
use Illuminate\Http\Request;

class CommissionController extends Controller
{
    private function assignedManagerAttenders()
    {
        return CommissionManagerAttender::query()
            ->with('attender:id,name,office_id,branch')
            ->orderByDesc('id')
            ->get();
    }

    private function ensureSelectedAttender(Request $request): void
    {
        $isAssigned = CommissionManagerAttender::query()
            ->where('attender_id', $request->user()->id)
            ->exists();
        abort_unless(
            $request->user()->role === 'attender' && $isAssigned,
            403,
            'You are not assigned by boss to maintain commission.'
        );
    }

    private function ensureCommissionViewer(Request $request): array
    {
        abort_unless(in_array($request->user()->role, ['boss', 'attender'], true), 403);

        $managerRows = $this->assignedManagerAttenders();
        $managerIds = $managerRows->pluck('attender_id')->map(fn ($id) => (int) $id)->all();
        $isSelectedAttender = $request->user()->role === 'attender' && in_array((int) $request->user()->id, $managerIds, true);

        if ($request->user()->role === 'attender' && !$isSelectedAttender) {
            abort(403, 'You are not assigned by boss to maintain commission.');
        }

        return [$managerRows, $isSelectedAttender];
    }

    public function setManager(Request $request)
    {
        abort_unless($request->user()->role === 'boss', 403);

        $validated = $request->validate([
            'attender_ids' => ['nullable', 'array'],
            'attender_ids.*' => ['required', 'integer', 'exists:users,id'],
        ]);

        $attenderIds = collect($validated['attender_ids'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values();

        if ($attenderIds->isNotEmpty()) {
            $invalid = User::query()
                ->whereIn('id', $attenderIds->all())
                ->where('role', '!=', 'attender')
                ->exists();
            abort_unless(!$invalid, 422, 'One or more selected users are not attenders');
        }

        CommissionManagerAttender::query()
            ->when($attenderIds->isNotEmpty(), fn ($q) => $q->whereNotIn('attender_id', $attenderIds->all()))
            ->when($attenderIds->isEmpty(), fn ($q) => $q)
            ->delete();

        foreach ($attenderIds as $attenderId) {
            CommissionManagerAttender::query()->updateOrCreate(
                ['attender_id' => $attenderId],
                ['assigned_by' => $request->user()->id]
            );
        }

        $managerRows = $this->assignedManagerAttenders();

        return response()->json([
            'manager_attenders' => $managerRows->map(fn ($row) => [
                'id' => $row->attender?->id,
                'name' => $row->attender?->name,
                'office_id' => $row->attender?->office_id,
                'branch' => $row->attender?->branch,
            ])->filter(fn ($row) => !empty($row['id']))->values(),
        ]);
    }

    public function overview(Request $request)
    {
        [$managerRows, $isSelectedAttender] = $this->ensureCommissionViewer($request);

        $rows = ProjectAssignment::query()
            ->with(['project:id,name', 'staff:id,name,office_id,branch', 'commissionAdvances:id,project_assignment_id,amount'])
            ->whereNotNull('commission_amount')
            ->where('commission_amount', '>', 0)
            ->orderByDesc('id')
            ->get()
            ->map(function (ProjectAssignment $assignment) {
                $advanceTotal = (float) $assignment->commissionAdvances->sum('amount');
                $commissionTotal = (float) ($assignment->commission_amount ?? 0);
                $balance = round(max(0, $commissionTotal - $advanceTotal), 2);

                return [
                    'project_assignment_id' => $assignment->id,
                    'project' => [
                        'id' => $assignment->project?->id,
                        'name' => $assignment->project?->name,
                    ],
                    'staff' => [
                        'id' => $assignment->staff?->id,
                        'name' => $assignment->staff?->name,
                        'office_id' => $assignment->staff?->office_id,
                        'branch' => $assignment->staff?->branch,
                    ],
                    'commission_total' => round($commissionTotal, 2),
                    'advance_total' => round($advanceTotal, 2),
                    'balance' => $balance,
                ];
            })
            ->values();

        return response()->json([
            'manager_attenders' => $managerRows->map(fn ($row) => [
                'id' => $row->attender?->id,
                'name' => $row->attender?->name,
                'office_id' => $row->attender?->office_id,
                'branch' => $row->attender?->branch,
            ])->filter(fn ($row) => !empty($row['id']))->values(),
            'can_manage_advance' => $isSelectedAttender,
            'rows' => $rows,
        ]);
    }

    public function advanceHistory(Request $request)
    {
        [$managerRows, $isSelectedAttender] = $this->ensureCommissionViewer($request);
        unset($managerRows, $isSelectedAttender);

        $validated = $request->validate([
            'project_assignment_id' => ['required', 'integer', 'exists:project_assignments,id'],
        ]);

        $assignment = ProjectAssignment::query()
            ->with(['project:id,name', 'staff:id,name,office_id,branch'])
            ->findOrFail((int) $validated['project_assignment_id']);

        $rows = ProjectAssignmentCommissionAdvance::query()
            ->with('attender:id,name,office_id,branch')
            ->where('project_assignment_id', $assignment->id)
            ->orderByDesc('id')
            ->get()
            ->map(fn (ProjectAssignmentCommissionAdvance $row) => [
                'id' => $row->id,
                'project_assignment_id' => $row->project_assignment_id,
                'staff_id' => $row->staff_id,
                'amount' => round((float) $row->amount, 2),
                'note' => $row->note,
                'attender' => [
                    'id' => $row->attender?->id,
                    'name' => $row->attender?->name,
                    'office_id' => $row->attender?->office_id,
                    'branch' => $row->attender?->branch,
                ],
                'created_at' => optional($row->created_at)?->toDateTimeString(),
            ])
            ->values();

        return response()->json([
            'project_assignment_id' => $assignment->id,
            'project' => [
                'id' => $assignment->project?->id,
                'name' => $assignment->project?->name,
            ],
            'staff' => [
                'id' => $assignment->staff?->id,
                'name' => $assignment->staff?->name,
                'office_id' => $assignment->staff?->office_id,
                'branch' => $assignment->staff?->branch,
            ],
            'rows' => $rows,
        ]);
    }

    public function addAdvance(Request $request)
    {
        $this->ensureSelectedAttender($request);

        $validated = $request->validate([
            'project_assignment_id' => ['required', 'integer', 'exists:project_assignments,id'],
            'amount' => ['required', 'numeric', 'gt:0'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $assignment = ProjectAssignment::query()
            ->with(['project:id,name', 'staff:id,name,office_id,branch'])
            ->findOrFail((int) $validated['project_assignment_id']);

        $commissionTotal = (float) ($assignment->commission_amount ?? 0);
        abort_unless($commissionTotal > 0, 422, 'Commission is not set for this project assignment.');

        $advanceTotal = (float) ProjectAssignmentCommissionAdvance::query()
            ->where('project_assignment_id', $assignment->id)
            ->sum('amount');
        $balance = round(max(0, $commissionTotal - $advanceTotal), 2);
        $amount = round((float) $validated['amount'], 2);
        if ($amount > $balance) {
            return response()->json([
                'message' => 'Advance amount cannot exceed current balance commission.',
                'balance' => $balance,
            ], 422);
        }

        $advance = ProjectAssignmentCommissionAdvance::create([
            'project_assignment_id' => $assignment->id,
            'staff_id' => $assignment->staff_id,
            'attender_id' => $request->user()->id,
            'amount' => $amount,
            'note' => isset($validated['note']) ? trim((string) $validated['note']) : null,
        ]);

        $newAdvanceTotal = round($advanceTotal + $amount, 2);
        $newBalance = round(max(0, $commissionTotal - $newAdvanceTotal), 2);

        return response()->json([
            'message' => 'Commission advance added successfully.',
            'advance' => [
                'id' => $advance->id,
                'project_assignment_id' => $assignment->id,
                'staff_id' => $assignment->staff_id,
                'attender_id' => $advance->attender_id,
                'amount' => $advance->amount,
                'note' => $advance->note,
                'created_at' => optional($advance->created_at)?->toDateTimeString(),
            ],
            'commission_total' => round($commissionTotal, 2),
            'advance_total' => $newAdvanceTotal,
            'balance' => $newBalance,
        ], 201);
    }
}
