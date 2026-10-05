<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToOrganization;

class MaintenanceRecord extends Model
{
    use Auditable, BelongsToOrganization;

    protected $fillable = [
        'organization_id',
        'equipment_id',
        'title',
        'type',
        'status',
        'performed_date',
        'next_due_date',
        'cost',
        'performed_by',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'cost' => 'float',
        ];
    }

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class);
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class, 'performed_by');
    }
}
