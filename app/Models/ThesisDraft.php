<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ThesisDraft extends Model
{
    protected $fillable = ['slug', 'title', 'author', 'draft_data'];

    protected $casts = [
        'draft_data' => 'array',
    ];
}
