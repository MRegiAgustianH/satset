<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

use App\Http\Controllers\ThesisController;

Route::get('/', [ThesisController::class, 'index'])->name('thesis.index');

Route::prefix('thesis')->group(function () {
    Route::post('/recommend-titles', [ThesisController::class, 'recommendTitles'])->name('thesis.recommend_titles');
    Route::post('/generate', [ThesisController::class, 'generateSection'])->name('thesis.generate');
    Route::post('/ai-chat', [ThesisController::class, 'aiChat'])->name('thesis.ai_chat');
    Route::post('/save', [ThesisController::class, 'saveDraft'])->name('thesis.save');
    Route::post('/save-chunk', [ThesisController::class, 'saveDraftChunk'])->name('thesis.save_chunk');
    Route::get('/list', [ThesisController::class, 'listDrafts'])->name('thesis.list');
    Route::post('/load', [ThesisController::class, 'loadDraft'])->name('thesis.load');
    Route::post('/delete', [ThesisController::class, 'deleteDraft'])->name('thesis.delete');
    Route::post('/search-citation', [ThesisController::class, 'searchCitation'])->name('thesis.search_citation');
    Route::post('/parse-guide', [ThesisController::class, 'parseGuide'])->name('thesis.parse_guide');
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
