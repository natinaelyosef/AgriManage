<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToOrganization;

class IrrigationEvent extends Model
{
    use Auditable, BelongsToOrganization;

    protected $fillable = [
        'organization_id',
        'field_id',
        'farm_id',
        'irrigation_date',
        'method',
        'source',
        'duration_minutes',
        'volume_m3',
        'cost',
        'performed_by',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'volume_m3' => 'float',
            'cost' => 'float',
            'duration_minutes' => 'integer',
        ];
    }

    public function field(): BelongsTo
    {
        return $this->belongsTo(Field::class);
    }

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class, 'performed_by');
    }
}
