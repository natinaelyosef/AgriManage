<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Payment;
use App\Models\Sale;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Manual payment capture + human verification.
 * A payment is ALWAYS created as `pending`; verification is a separate,
 * permission-checked action that can never be triggered by the payer.
 */
class PaymentController extends ResourceController
{
    protected string $model = Payment::class;

    protected string $permission = 'payment';

    protected array $with = ['sale.customer', 'verifier'];

    protected array $searchable = ['reference', 'method', 'status', 'sale.invoice_number'];

    protected array $sortable = ['paid_at', 'amount', 'status', 'method', 'created_at'];

    protected array $rules = [
        'direction' => 'sometimes|in:in,out',
        'amount' => 'required|numeric|min:0.01',
        'method' => 'required|string|max:32',
        'reference' => 'nullable|string|max:64',
        'receipt_url' => 'nullable|string|max:255',
        'paid_at' => 'nullable|date',
        'sale_id' => 'nullable|exists:sales,id',
        'expense_id' => 'nullable|exists:expenses,id',
        'currency' => 'nullable|string|max:8',
        'notes' => 'nullable|string',
    ];

    protected function applyFilters(Builder $query, Request $request): void
    {
        parent::applyFilters($query, $request);

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('direction')) {
            $query->where('direction', $request->query('direction'));
        }

        if ($request->filled('from')) {
            $query->whereDate('paid_at', '>=', $request->query('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('paid_at', '<=', $request->query('to'));
        }
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize($request, 'create');

        $data = $request->validate($this->rules);
        $this->ensureTenantReferences($request, $data);

        if (($data['sale_id'] ?? null) === null && ($data['expense_id'] ?? null) === null) {
            return response()->json(['message' => 'A payment must be linked to a sale or an expense.'], 422);
        }

        $data['status'] = 'pending';
        $data['paid_at'] = $data['paid_at'] ?? now();

        $payment = Payment::create($data + [
            'organization_id' => $request->user()->organization_id,
        ]);

        \App\Models\AppNotification::create([
            'organization_id' => $request->user()->organization_id,
            'user_id' => $request->user()->id,
            'type' => 'payment',
            'severity' => 'INFO',
            'title' => ucfirst($payment->direction === 'in' ? 'Incoming' : 'Outgoing').' payment awaiting verification',
            'message' => number_format($payment->amount, 2).' '.$payment->currency.' via '.$payment->method
                .($payment->reference ? ' (ref '.$payment->reference.')' : '').' — manual verification required.',
            'entity_type' => 'Payment',
            'entity_id' => $payment->id,
            'action_url' => '/app/finance/payments?status=pending',
        ]);

        return $this->data($this->newQuery()->with($this->with)->findOrFail($payment->getKey()), 201);
    }

    public function verify(Request $request, int $id): JsonResponse
    {
        $this->authorize($request, 'verify');

        $payment = $this->newQuery()->findOrFail($id);

        if ($payment->status === 'verified') {
            return $this->data($payment);
        }

        DB::transaction(function () use ($payment, $request) {
            $payment->update([
                'status' => 'verified',
                'verified_by' => $request->user()->id,
                'verified_at' => now(),
                'rejection_reason' => null,
            ]);

            if ($payment->direction === 'in' && $payment->sale_id !== null) {
                $sale = Sale::query()->findOrFail($payment->sale_id);
                $sale->paid_amount = round($sale->paid_amount + $payment->amount, 2);
                $sale->payment_status = $sale->paid_amount + 0.0001 >= $sale->total
                    ? 'paid'
                    : 'partial';
                $sale->save();
            }

            if ($payment->direction === 'out' && $payment->expense_id !== null) {
                $payment->expense()->update(['status' => 'paid']);
            }
        });

        return $this->data($this->newQuery()->with($this->with)->findOrFail($payment->getKey()));
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        $this->authorize($request, 'verify');

        $data = $request->validate([
            'reason' => 'required|string|max:255',
        ]);

        $payment = $this->newQuery()->findOrFail($id);

        $payment->update([
            'status' => 'rejected',
            'verified_by' => $request->user()->id,
            'verified_at' => now(),
            'rejection_reason' => $data['reason'],
        ]);

        return $this->data($this->newQuery()->with($this->with)->findOrFail($payment->getKey()));
    }
}
