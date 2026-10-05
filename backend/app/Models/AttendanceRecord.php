<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToOrganization;

class AttendanceRecord extends Model
{
    use Auditable, BelongsToOrganization;

    protected $fillable = [
        'organization_id',
        'worker_id',
        'work_date',
        'status',
        'hours',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'hours' => 'float',
        ];
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }
}
