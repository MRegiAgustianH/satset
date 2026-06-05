<?php

namespace App\Http\Controllers;

use App\Models\ThesisDraft;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ThesisController extends Controller
{
    /**
     * Display the thesis builder dashboard.
     */
    public function index()
    {
        return Inertia::render('Thesis/Index');
    }

    /**
     * Retrieve the Gemini API key from various sources.
     */
    private function getApiKey(Request $request)
    {
        return $request->input('api_key') 
            ?? $request->header('X-Gemini-Key') 
            ?? env('GEMINI_API_KEY') 
            ?? config('services.gemini.key');
    }

    /**
     * Recommend thesis titles and research methods based on department and topic.
     */
    public function recommendTitles(Request $request)
    {
        $request->validate([
            'fakultas' => 'required|string|max:255',
            'prodi' => 'required|string|max:255',
            'topik' => 'required|string|max:1000',
        ]);

        $apiKey = $this->getApiKey($request);

        if (!$apiKey) {
            return response()->json([
                'error' => 'API Key Gemini tidak ditemukan. Harap masukkan API Key di panel pengaturan.'
            ], 400);
        }

        $fakultas = $request->input('fakultas');
        $prodi = $request->input('prodi');
        $topik = $request->input('topik');

        $prompt = "Anda adalah pakar akademis pembimbing skripsi di Indonesia. Berdasarkan informasi berikut:
Fakultas: {$fakultas}
Program Studi: {$prodi}
Topik Penelitian: {$topik}

Berikan 4 rekomendasi judul skripsi yang menarik, inovatif, dan relevan. Untuk setiap judul, tentukan juga metode penelitian yang paling cocok (Khusus untuk bidang Informatika/IT/Teknologi, pilih metode teknis spesifik seperti Fuzzy Logic, K-Nearest Neighbors (KNN), Convolutional Neural Network (CNN), Support Vector Machine (SVM), Q-Learning, Random Forest, Naive Bayes, AHP, dll.) beserta penjelasan ringkas mengapa metode tersebut cocok untuk judul itu.

PENTING: Anda harus mengembalikan respon dalam format JSON array yang valid tanpa markup markdown atau teks lainnya. Struktur JSON harus persis seperti di bawah ini:
[
  {
    \"judul\": \"Judul Skripsi Rekomendasi 1\",
    \"metode\": \"Nama Metode yang Cocok\",
    \"penjelasan_metode\": \"Penjelasan mengapa metode ini cocok untuk kasus/judul ini.\"
  },
  ...
]";

        try {
            $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={$apiKey}";
            
            $response = Http::post($url, [
                'contents' => [
                    [
                        'parts' => [
                            ['text' => $prompt]
                        ]
                    ]
                ],
                'generationConfig' => [
                    'responseMimeType' => 'application/json'
                ]
            ]);

            if ($response->failed()) {
                $errorMsg = $response->json('error.message') ?? 'Terjadi kesalahan pada server Gemini.';
                return response()->json(['error' => $errorMsg], 500);
            }

            $resultText = $response->json('candidates.0.content.parts.0.text');
            $data = json_decode($resultText, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                // Fallback in case JSON mode returns slightly malformed JSON text
                return response()->json(['error' => 'Gagal mengurai respon dari AI. Silakan coba lagi.'], 500);
            }

            return response()->json($data);

        } catch (\Exception $e) {
            Log::error('Recommend titles error: ' . $e->getMessage());
            return response()->json(['error' => 'Koneksi ke API Gemini gagal: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Generate content for a specific thesis section.
     */
    public function generateSection(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:1000',
            'section' => 'required|string|max:255',
            'topik' => 'nullable|string|max:1000',
            'metode' => 'nullable|string|max:255',
            'section_title' => 'nullable|string|max:500',
            'bab_context' => 'nullable|string|max:255',
        ]);

        $apiKey = $this->getApiKey($request);

        if (!$apiKey) {
            return response()->json([
                'error' => 'API Key Gemini tidak ditemukan. Harap masukkan API Key di panel pengaturan.'
            ], 400);
        }

        $title = $request->input('title');
        $section = $request->input('section');
        $topik = $request->input('topik') ?? 'Sesuai judul';
        $metode = $request->input('metode') ?? 'Metode kualitatif/kuantitatif standar';

        // Handle dynamic section generation (for imported DOCX headings etc.)
        if ($section === '__dynamic__') {
            $sectionTitle = $request->input('section_title', 'Bagian ini');
            $babContext = $request->input('bab_context', 'BAB');

            $prompt = "Anda adalah penulis akademik skripsi Indonesia yang ahli. Tulis draf konten ilmiah untuk bagian berikut:

Judul Skripsi: {$title}
Topik: {$topik}
Metode: {$metode}
Konteks BAB: {$babContext}
Judul Sub-Bab: {$sectionTitle}

Ketentuan:
- Tulis dalam bahasa Indonesia akademis yang formal dan ilmiah
- Tulis minimal 2-3 paragraf yang mendalam dan relevan sesuai konteks bab dan judul sub-bab
- Sesuaikan gaya penulisan dengan konteks bab (misalnya: BAB I = pendahuluan/latar belakang, BAB II = tinjauan pustaka/teori, BAB III = metodologi, BAB IV = hasil/pembahasan, BAB V = penutup/kesimpulan)
- Jika judul sub-bab berkaitan dengan poin-poin (identifikasi, rumusan, kesimpulan, saran), sajikan dalam format poin bernomor

PENTING: Berikan LANGSUNG isi draf tulisan yang siap disalin tanpa teks sapaan pembuka (seperti 'Halo', 'Berikut adalah draf...') atau teks penutup. Tulis secara mendalam, rapi, dan ilmiah.";
        } else {
            // Tailor the prompt based on the specific section requested
            $sectionPrompts = [
            'latar_belakang' => "Tulis draf paragraf mendalam untuk bagian 'Latar Belakang Masalah' (BAB I) skripsi.
Judul Skripsi: {$title}
Topik: {$topik}
Metode: {$metode}
Ketentuan: Tulis dalam bahasa Indonesia akademis yang formal dan ilmiah. Deskripsikan urgensi masalah, kesenjangan antara kenyataan dengan teori (gap analysis), dan mengapa judul ini penting untuk diteliti. Tulis minimal 3 paragraf panjang.",

            'identifikasi_masalah' => "Tulis draf bagian 'Identifikasi Masalah' (BAB I) skripsi.
Judul Skripsi: {$title}
Topik: {$topik}
Ketentuan: Sajikan dalam bentuk poin-poin bernomor (minimal 3 poin) yang menjelaskan akar permasalahan utama yang melatarbelakangi penelitian ini.",

            'rumusan_masalah' => "Tulis draf bagian 'Rumusan Masalah' (BAB I) skripsi.
Judul Skripsi: {$title}
Topik: {$topik}
Ketentuan: Sajikan dalam bentuk kalimat tanya bernomor (minimal 2 atau 3 poin pertanyaan) yang akan dijawab melalui hasil penelitian skripsi ini.",

            'grand_theory' => "Tulis draf isi bagian 'Grand Theory' (BAB II Tinjauan Pustaka) skripsi.
Judul Skripsi: {$title}
Topik: {$topik}
Ketentuan: Grand Theory adalah teori makro atau teori induk yang menaungi variabel utama penelitian (contoh teori manajemen umum, teori sistem informasi, teori penerimaan teknologi makro). Jelaskan secara ilmiah apa teori utamanya, siapa pencetusnya, dan bagaimana hubungannya dengan konteks judul skripsi ini. Tulis 2 paragraf.",

            'middle_theory' => "Tulis draf isi bagian 'Middle Theory' (BAB II Tinjauan Pustaka) skripsi.
Judul Skripsi: {$title}
Topik: {$topik}
Ketentuan: Middle Range Theory berada di tingkat menengah yang menghubungkan Grand Theory dengan Applied/Micro Theory (contoh Technology Acceptance Model (TAM), DeLone & McLean, dll.). Jelaskan pengertian teori ini, dimensi atau variabel di dalamnya, serta relevansinya terhadap penelitian skripsi. Tulis 2 paragraf.",

            'applied_theory' => "Tulis draf isi bagian 'Applied Theory' atau 'Landasan Teori Operasional' (BAB II Tinjauan Pustaka) skripsi.
Judul Skripsi: {$title}
Topik: {$topik}
Metode: {$metode}
Ketentuan: Jelaskan landasan teori aplikatif atau variabel spesifik dan instrumen metode teknis yang digunakan untuk menyelesaikan masalah pada skripsi ini. Tulis 2 paragraf.",

            'penelitian_terdahulu' => "Tulis draf bagian 'Penelitian Terdahulu / Studi Literatur' (BAB II) skripsi.
Judul Skripsi: {$title}
Topik: {$topik}
Ketentuan: Buatlah paragraf deskriptif yang membandingkan minimal 2 atau 3 penelitian terdahulu yang relevan. Jelaskan persamaan dan perbedaan dengan penelitian yang dilakukan saat ini. Tulis 2 paragraf.",

            'desain_penelitian' => "Tulis draf bagian 'Desain / Pendekatan Penelitian' (BAB III Metodologi) skripsi.
Judul Skripsi: {$title}
Metode: {$metode}
Ketentuan: Jelaskan pendekatan metodologis penelitian yang digunakan (kuantitatif, kualitatif, R&D, eksperimental) serta alur penelitian secara umum. Tulis 1-2 paragraf.",

            'tempat_waktu' => "Tulis draf bagian 'Tempat dan Waktu Penelitian' (BAB III Metodologi) skripsi.
Judul Skripsi: {$title}
Ketentuan: Buatlah narasi akademis formal mengenai penetapan lokasi penelitian dan jadwal tahapan penelitian secara teoritis. Tulis 1 paragraf.",

            'pengumpulan_data' => "Tulis draf bagian 'Metode Pengumpulan Data' (BAB III Metodologi) skripsi.
Judul Skripsi: {$title}
Ketentuan: Jelaskan secara teoretis dan operasional teknik pengumpulan data yang dilakukan (survei/kuesioner, wawancara mendalam, observasi, studi dokumentasi, atau dataset sekunder). Tulis 2 paragraf.",

            'analisis_data' => "Tulis draf bagian 'Metode Analisis Data' (BAB III Metodologi) skripsi.
Judul Skripsi: {$title}
Metode: {$metode}
Ketentuan: Jelaskan teknik atau formula analisis data yang digunakan (seperti regresi linear, pengujian SmartPLS, rumus matematika metode Informatika seperti Fuzzy, KNN, dll.) untuk menjawab rumusan masalah. Tulis 2 paragraf.",

            'deskripsi_data' => "Tulis draf bagian 'Deskripsi dan Analisis Data' (BAB IV Hasil) skripsi.
Judul Skripsi: {$title}
Metode: {$metode}
Ketentuan: Buat simulasi narasi hasil pengolahan data penelitian (misalnya persentase kepuasan, uji kelayakan, atau akurasi sistem) secara formal dan ilmiah. Tulis 2-3 paragraf.",

            'pembahasan' => "Tulis draf bagian 'Pembahasan Hasil Penelitian' (BAB IV Hasil) skripsi.
Judul Skripsi: {$title}
Metode: {$metode}
Ketentuan: Diskusikan temuan utama hasil penelitian. Hubungkan hasil tersebut dengan teori-teori di BAB II dan interpretasikan implikasinya terhadap penelitian. Tulis 2-3 paragraf.",

            'kesimpulan' => "Tulis draf bagian 'Kesimpulan' (BAB V Penutup) skripsi.
Judul Skripsi: {$title}
Ketentuan: Tulis kesimpulan pokok penelitian ini (berbentuk poin bernomor) yang menjawab langsung rumusan masalah di BAB I secara ringkas namun padat. Tulis minimal 2-3 poin.",

            'saran' => "Tulis draf bagian 'Saran' (BAB V Penutup) skripsi.
Judul Skripsi: {$title}
Ketentuan: Tulis saran teoritis dan praktis bagi pembaca, universitas, atau peneliti selanjutnya berdasarkan keterbatasan penelitian ini. Tulis minimal 2-3 poin."
        ];

            $prompt = $sectionPrompts[$section] ?? "Tulis isi draf akademik formal dalam bahasa Indonesia untuk bagian {$section} skripsi dengan judul '{$title}'.";
        
            $prompt .= "\n\nPENTING: Berikan LANGSUNG isi draf tulisan yang siap disalin tanpa teks sapaan pembuka (seperti 'Halo', 'Berikut adalah draf...') atau teks penutup. Tulis secara mendalam, rapi, dan ilmiah.";
        }

        try {
            $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={$apiKey}";
            
            $response = Http::post($url, [
                'contents' => [
                    [
                        'parts' => [
                            ['text' => $prompt]
                        ]
                    ]
                ]
            ]);

            if ($response->failed()) {
                $errorMsg = $response->json('error.message') ?? 'Terjadi kesalahan pada server Gemini.';
                return response()->json(['error' => $errorMsg], 500);
            }

            $resultText = $response->json('candidates.0.content.parts.0.text');
            // Clean up backticks or raw markdown wrappers if Gemini insists on returning them
            $resultText = preg_replace('/^```html?\s*|\s*```$/i', '', trim($resultText));
            $resultText = trim($resultText);

            return response()->json(['content' => $resultText]);

        } catch (\Exception $e) {
            Log::error('Generate section error: ' . $e->getMessage());
            return response()->json(['error' => 'Koneksi ke API Gemini gagal: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Save draft state into database and JSON backup.
     */
    public function saveDraft(Request $request)
    {
        $request->validate([
            'filename' => 'required|string|max:255',
            'draft_data' => 'required|array'
        ]);

        $filename = $request->input('filename');
        $draftData = $request->input('draft_data');

        // Clean filename for safety
        $safeFilename = Str::slug($filename, '_');

        // 1. Save to File Storage as Backup
        try {
            Storage::put("thesis_drafts/{$safeFilename}.json", json_encode($draftData, JSON_PRETTY_PRINT));
            $fileSaved = true;
        } catch (\Exception $e) {
            Log::error('File save failed: ' . $e->getMessage());
            $fileSaved = false;
        }

        // 2. Save to Database
        $dbSaved = false;
        try {
            ThesisDraft::updateOrCreate(
                ['title' => $draftData['cover']['title'] ?? 'Untitled'],
                [
                    'author' => $draftData['cover']['author'] ?? 'Unknown',
                    'draft_data' => $draftData
                ]
            );
            $dbSaved = true;
        } catch (\Exception $e) {
            Log::warning('Database save failed (using file fallback): ' . $e->getMessage());
        }

        if ($fileSaved || $dbSaved) {
            return response()->json([
                'success' => true,
                'message' => 'Draft berhasil disimpan ' . ($dbSaved ? 'ke Database' : '') . ($fileSaved ? ' dan Penyimpanan Lokal' : '') . '.',
                'filename' => $safeFilename
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Gagal menyimpan draft baik di database maupun file penyimpanan.'
        ], 500);
    }

    /**
     * Retrieve all saved drafts.
     */
    public function listDrafts()
    {
        $drafts = collect();

        // 1. Load from DB if available
        try {
            $dbDrafts = ThesisDraft::orderBy('updated_at', 'desc')->get()->map(function($d) {
                return [
                    'id' => $d->id,
                    'title' => Str::limit($d->title, 60),
                    'author' => $d->author,
                    'updated_at' => $d->updated_at->diffForHumans(),
                    'source' => 'database',
                    'key' => 'db_' . $d->id
                ];
            });
            $drafts = $drafts->merge($dbDrafts);
        } catch (\Exception $e) {
            Log::warning('Failed loading drafts from database: ' . $e->getMessage());
        }

        // 2. Load from File Storage fallback
        try {
            $files = Storage::files("thesis_drafts");
            $fileDrafts = collect($files)->map(function($filePath) {
                $filename = basename($filePath, '.json');
                $lastModified = Storage::lastModified($filePath);
                
                // Read a small portion to get title and author
                $data = json_decode(Storage::get($filePath), true);
                $title = $data['cover']['title'] ?? str_replace('_', ' ', $filename);
                $author = $data['cover']['author'] ?? 'Unknown';

                return [
                    'id' => $filename,
                    'title' => Str::limit($title, 60),
                    'author' => $author,
                    'updated_at' => date('Y-m-d H:i', $lastModified),
                    'source' => 'file',
                    'key' => 'file_' . $filename
                ];
            });
            $drafts = $drafts->merge($fileDrafts);
        } catch (\Exception $e) {
            Log::error('Failed loading drafts from storage: ' . $e->getMessage());
        }

        // Unique by key or title
        return response()->json($drafts->unique('title')->values());
    }

    /**
     * Load a specific draft's JSON content.
     */
    public function loadDraft(Request $request)
    {
        $request->validate([
            'id' => 'required',
            'source' => 'required|string|in:database,file'
        ]);

        $id = $request->input('id');
        $source = $request->input('source');

        if ($source === 'database') {
            try {
                $draft = ThesisDraft::find($id);
                if ($draft) {
                    return response()->json($draft->draft_data);
                }
            } catch (\Exception $e) {
                Log::error('DB load failed: ' . $e->getMessage());
            }
        }

        // Fallback to file storage
        try {
            $filePath = "thesis_drafts/{$id}.json";
            if (Storage::exists($filePath)) {
                $content = json_decode(Storage::get($filePath), true);
                return response()->json($content);
            }
        } catch (\Exception $e) {
            Log::error('File load failed: ' . $e->getMessage());
        }

        return response()->json(['error' => 'Draft tidak ditemukan.'], 404);
    }

    /**
     * Delete a specific draft.
     */
    public function deleteDraft(Request $request)
    {
        $request->validate([
            'id' => 'required',
            'source' => 'required|string|in:database,file'
        ]);

        $id = $request->input('id');
        $source = $request->input('source');

        $deleted = false;

        if ($source === 'database') {
            try {
                $draft = ThesisDraft::find($id);
                if ($draft) {
                    $draft->delete();
                    $deleted = true;
                }
            } catch (\Exception $e) {
                Log::error('DB delete failed: ' . $e->getMessage());
            }
        } else {
            try {
                $filePath = "thesis_drafts/{$id}.json";
                if (Storage::exists($filePath)) {
                    Storage::delete($filePath);
                    $deleted = true;
                }
            } catch (\Exception $e) {
                Log::error('File delete failed: ' . $e->getMessage());
            }
        }

        return response()->json(['success' => $deleted]);
    }

    /**
     * Search and format academic citations using Gemini (Google Scholar & ResearchGate style).
     */
    public function searchCitation(Request $request)
    {
        $request->validate([
            'query' => 'required|string|max:500',
        ]);

        $apiKey = $this->getApiKey($request);

        if (!$apiKey) {
            return response()->json([
                'error' => 'API Key Gemini tidak ditemukan. Harap masukkan API Key di panel pengaturan.'
            ], 400);
        }

        $query = $request->input('query');

        $prompt = "Anda adalah pencari sitasi akademis. Cari referensi akademis nyata yang menyerupai pencarian di Google Scholar atau ResearchGate berdasarkan kata kunci berikut: \"{$query}\".

Berikan 2 alternatif referensi ilmiah nyata (misalnya satu format buku dan satu format jurnal ilmiah jika memungkinkan). Lengkapi dengan detail asli seperti nama penulis, tahun, judul publikasi, penerbit/kota, atau nama jurnal beserta Volume, Nomor, dan Halaman.

PENTING: Anda harus mengembalikan respon dalam format JSON array yang valid tanpa markup markdown atau teks lainnya. Struktur JSON harus persis seperti di bawah ini:
[
  {
    \"author\": \"Nama Penulis (contoh: Sugiyono, A. atau DeLone, W. H., & McLean, E. R.)\",
    \"year\": \"Tahun Publikasi (contoh: 2018)\",
    \"type\": \"book\" atau \"journal\" atau \"website\",
    \"title\": \"Judul Buku atau Artikel Jurnal\",
    \"publisher\": \"Penerbit & Kota (untuk buku) ATAU Nama Jurnal, Volume(Nomor), Halaman (untuk jurnal) (contoh: Alfabeta, Bandung atau MIS Quarterly, 27(1), 9-30)\",
    \"source\": \"Google Scholar\" atau \"ResearchGate\"
  },
  ...
]";

        try {
            $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={$apiKey}";
            
            $response = Http::post($url, [
                'contents' => [
                    [
                        'parts' => [
                            ['text' => $prompt]
                        ]
                    ]
                ],
                'generationConfig' => [
                    'responseMimeType' => 'application/json'
                ]
            ]);

            if ($response->failed()) {
                $errorMsg = $response->json('error.message') ?? 'Terjadi kesalahan pada server Gemini.';
                return response()->json(['error' => $errorMsg], 500);
            }

            $resultText = $response->json('candidates.0.content.parts.0.text');
            $data = json_decode($resultText, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                return response()->json(['error' => 'Gagal mengurai respon dari AI. Silakan coba lagi.'], 500);
            }

            return response()->json($data);

        } catch (\Exception $e) {
            Log::error('Search citation error: ' . $e->getMessage());
            return response()->json(['error' => 'Koneksi ke API Gemini gagal: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Upload and parse formatting guidelines from PDF, Word, or text files.
     */
    public function parseGuide(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:5120', // Max 5MB
        ]);

        $file = $request->file('file');
        $extension = strtolower($file->getClientOriginalExtension());
        $filePath = $file->getRealPath();

        $apiKey = $this->getApiKey($request);

        // If it is PDF and we have an API Key, send it directly to Gemini
        if ($extension === 'pdf') {
            if (!$apiKey) {
                return response()->json([
                    'error' => 'API Key Gemini diperlukan untuk membaca format PDF. Masukkan API Key di panel pengaturan.'
                ], 400);
            }

            try {
                $fileData = file_get_contents($filePath);
                $base64 = base64_encode($fileData);

                $prompt = "Anda adalah asisten akademik. Analisis dokumen panduan format skripsi/laporan ini dan tentukan konfigurasi format dokumen berdasarkan isinya.
Kembalikan hasilnya dalam format JSON dengan kunci-kunci berikut (abaikan markdown code block, berikan format JSON murni):
{
  \"fontFamily\": string (opsi: \"'Times New Roman', Times, serif\" atau \"Arial, Helvetica, sans-serif\" atau \"Georgia, serif\" atau null),
  \"fontSize\": string (opsi: \"12pt\" atau \"11pt\" atau null),
  \"lineSpacing\": string (opsi: \"1.0\" atau \"1.5\" atau \"2.0\" atau null),
  \"marginTop\": float (margin atas dalam cm, contoh: 4.0),
  \"marginLeft\": float (margin kiri dalam cm, contoh: 4.0),
  \"marginBottom\": float (margin bawah dalam cm, contoh: 3.0),
  \"marginRight\": float (margin kanan dalam cm, contoh: 3.0),
  \"paragraphIndent\": string (opsi: \"indented\" jika awal paragraf menjorok masuk ke dalam, \"flush\" jika rata kiri penuh tanpa menjorok),
  \"showPersetujuan\": boolean (true jika ada lembar persetujuan),
  \"showPengesahan\": boolean (true jika ada lembar pengesahan),
  \"showPernyataan\": boolean (true jika ada lembar pernyataan orisinalitas/keaslian),
  \"showAbstractIndo\": boolean (true jika ada lembar abstrak/abstrak indo),
  \"showAbstractEng\": boolean (true jika ada lembar abstract/abstrak inggris),
  \"coverAuthorLabel\": string (opsi: \"Disusun Oleh :\" atau \"Oleh :\" atau null)
}
Harap isi nilai-nilai di atas sesuai dengan panduan. Jika ada yang tidak disebutkan, isi dengan null. Jangan mengarang data.";

                $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={$apiKey}";
                
                $response = Http::post($url, [
                    'contents' => [
                        [
                            'parts' => [
                                [
                                    'inlineData' => [
                                        'mimeType' => 'application/pdf',
                                        'data' => $base64
                                    ]
                                ],
                                [
                                    'text' => $prompt
                                ]
                            ]
                        ]
                    ],
                    'generationConfig' => [
                        'responseMimeType' => 'application/json'
                    ]
                ]);

                if ($response->failed()) {
                    $errorMsg = $response->json('error.message') ?? 'Terjadi kesalahan pada server Gemini.';
                    return response()->json(['error' => $errorMsg], 500);
                }

                $resultText = $response->json('candidates.0.content.parts.0.text');
                $resultText = preg_replace('/^```json\s*|\s*```$/i', '', trim($resultText));
                $data = json_decode($resultText, true);

                if (json_last_error() !== JSON_ERROR_NONE) {
                    return response()->json(['error' => 'Gagal mengurai respon JSON dari AI. Silakan coba lagi.'], 500);
                }

                $filteredData = array_filter($data, function($value) {
                    return !is_null($value);
                });

                return response()->json([
                    'success' => true,
                    'detected' => $filteredData,
                    'method' => 'gemini_pdf'
                ]);

            } catch (\Exception $e) {
                Log::error('PDF Guide Parse Error: ' . $e->getMessage());
                return response()->json(['error' => 'Gagal memproses file PDF: ' . $e->getMessage()], 500);
            }
        }

        // For non-PDF files, extract the text first
        $extractedText = '';
        if ($extension === 'docx') {
            $extractedText = $this->parseDocx($filePath);
        } elseif ($extension === 'doc') {
            $extractedText = $this->parseDoc($filePath);
        } else {
            $extractedText = file_get_contents($filePath);
        }

        if (empty(trim($extractedText))) {
            return response()->json(['error' => 'Gagal mengekstrak teks dari file. Dokumen kosong atau format tidak didukung.'], 400);
        }

        // If we have API key, use Gemini to parse the extracted text
        if ($apiKey) {
            try {
                $prompt = "Anda adalah asisten akademik. Analisis teks panduan format skripsi/laporan berikut ini dan tentukan konfigurasi format dokumen berdasarkan isinya.\n\n" .
                    "Teks Panduan:\n" .
                    $extractedText . "\n\n" .
                    "Kembalikan hasilnya dalam format JSON dengan kunci-kunci berikut (abaikan markdown code block, berikan format JSON murni):\n" .
                    "{\n" .
                    "  \"fontFamily\": string (opsi: \"'Times New Roman', Times, serif\" atau \"Arial, Helvetica, sans-serif\" atau \"Georgia, serif\" atau null),\n" .
                    "  \"fontSize\": string (opsi: \"12pt\" atau \"11pt\" atau null),\n" .
                    "  \"lineSpacing\": string (opsi: \"1.0\" atau \"1.5\" atau \"2.0\" atau null),\n" .
                    "  \"marginTop\": float (margin atas dalam cm, contoh: 4.0),\n" .
                    "  \"marginLeft\": float (margin kiri dalam cm, contoh: 4.0),\n" .
                    "  \"marginBottom\": float (margin bawah dalam cm, contoh: 3.0),\n" .
                    "  \"marginRight\": float (margin kanan dalam cm, contoh: 3.0),\n" .
                    "  \"paragraphIndent\": string (opsi: \"indented\" jika awal paragraf menjorok masuk ke dalam, \"flush\" jika rata kiri penuh tanpa menjorok),\n" .
                    "  \"showPersetujuan\": boolean (true jika ada lembar persetujuan),\n" .
                    "  \"showPengesahan\": boolean (true jika ada lembar pengesahan),\n" .
                    "  \"showPernyataan\": boolean (true jika ada lembar pernyataan orisinalitas/keaslian),\n" .
                    "  \"showAbstractIndo\": boolean (true jika ada lembar abstrak/abstrak indo),\n" .
                    "  \"showAbstractEng\": boolean (true jika ada lembar abstract/abstrak inggris),\n" .
                    "  \"coverAuthorLabel\": string (opsi: \"Disusun Oleh :\" atau \"Oleh :\" atau null)\n" .
                    "}\n" .
                    "Harap isi nilai-nilai di atas sesuai dengan panduan. Jika ada yang tidak disebutkan, isi dengan null. Jangan mengarang data.";

                $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={$apiKey}";
                
                $response = Http::post($url, [
                    'contents' => [
                        [
                            'parts' => [
                                ['text' => $prompt]
                            ]
                        ]
                    ],
                    'generationConfig' => [
                        'responseMimeType' => 'application/json'
                    ]
                ]);

                if ($response->successful()) {
                    $resultText = $response->json('candidates.0.content.parts.0.text');
                    $resultText = preg_replace('/^```json\s*|\s*```$/i', '', trim($resultText));
                    $data = json_decode($resultText, true);

                    if (json_last_error() === JSON_ERROR_NONE) {
                        $filteredData = array_filter($data, function($value) {
                            return !is_null($value);
                        });
                        return response()->json([
                            'success' => true,
                            'detected' => $filteredData,
                            'method' => 'gemini_text'
                        ]);
                    }
                }
            } catch (\Exception $e) {
                Log::warning('Gemini text guide parsing failed, falling back to heuristics: ' . $e->getMessage());
            }
        }

        // Fallback to local regex heuristics on the extracted text
        $detected = $this->analyzeTextHeuristics($extractedText);
        
        return response()->json([
            'success' => true,
            'detected' => $detected,
            'method' => 'heuristics'
        ]);
    }

    private function parseDocx($filePath)
    {
        $zip = new \ZipArchive();
        if ($zip->open($filePath) === true) {
            $xml = $zip->getFromName('word/document.xml');
            $zip->close();
            if ($xml) {
                $dom = new \DOMDocument();
                libxml_use_internal_errors(true);
                $dom->loadXML($xml);
                libxml_clear_errors();
                $texts = [];
                $paragraphs = $dom->getElementsByTagName('p');
                foreach ($paragraphs as $paragraph) {
                    $pText = '';
                    $textNodes = $paragraph->getElementsByTagName('t');
                    foreach ($textNodes as $textNode) {
                        $pText .= $textNode->nodeValue;
                    }
                    if (trim($pText) !== '') {
                        $texts[] = trim($pText);
                    }
                }
                return implode("\n", $texts);
            }
        }
        return '';
    }

    private function parseDoc($filePath)
    {
        $fileData = file_get_contents($filePath);
        if ($fileData === false) return '';
        
        // Extract printable strings of at least 4 characters
        preg_match_all('/[\x20-\x7E]{4,}/', $fileData, $matches);
        return implode(' ', $matches[0]);
    }

    private function analyzeTextHeuristics($text)
    {
        $detected = [];
        $lower = strtolower($text);

        if (str_contains($lower, 'times new roman')) {
            $detected['fontFamily'] = "'Times New Roman', Times, serif";
        } elseif (str_contains($lower, 'arial')) {
            $detected['fontFamily'] = "Arial, Helvetica, sans-serif";
        } elseif (str_contains($lower, 'georgia')) {
            $detected['fontFamily'] = "Georgia, serif";
        }

        if (str_contains($lower, '12pt') || str_contains($lower, '12 pt') || str_contains($lower, 'ukuran 12')) {
            $detected['fontSize'] = '12pt';
        } elseif (str_contains($lower, '11pt') || str_contains($lower, '11 pt') || str_contains($lower, 'ukuran 11')) {
            $detected['fontSize'] = '11pt';
        }

        if (str_contains($lower, 'spasi 2') || str_contains($lower, '2.0') || str_contains($lower, 'double') || str_contains($lower, '2 spasi')) {
            $detected['lineSpacing'] = '2.0';
        } elseif (str_contains($lower, 'spasi 1.5') || str_contains($lower, '1.5')) {
            $detected['lineSpacing'] = '1.5';
        }

        if (str_contains($lower, '4 4 3 3') || str_contains($lower, '4cm 4cm 3cm 3cm') || str_contains($lower, 'kiri 4') || str_contains($lower, 'kiri: 4')) {
            $detected['marginTop'] = 4.0;
            $detected['marginLeft'] = 4.0;
            $detected['marginBottom'] = 3.0;
            $detected['marginRight'] = 3.0;
            $detected['preset'] = 'dikti';
        } elseif (str_contains($lower, '3 3 3 3') || str_contains($lower, '3cm 3cm 3cm 3cm') || str_contains($lower, 'kiri 3')) {
            $detected['marginTop'] = 3.0;
            $detected['marginLeft'] = 3.0;
            $detected['marginBottom'] = 3.0;
            $detected['marginRight'] = 3.0;
            $detected['preset'] = 'ringkas';
        }

        if (str_contains($lower, 'rata kiri') || str_contains($lower, 'tidak menjorok') || str_contains($lower, 'tanpa indent') || str_contains($lower, 'rata kiri sesuai margin')) {
            $detected['paragraphIndent'] = 'flush';
        } elseif (str_contains($lower, 'menjorok') || str_contains($lower, 'indentasi')) {
            $detected['paragraphIndent'] = 'indented';
        }

        if (str_contains($lower, 'persetujuan') || str_contains($lower, 'disetujui')) {
            $detected['showPersetujuan'] = true;
        }
        if (str_contains($lower, 'pengesahan') || str_contains($lower, 'disahkan')) {
            $detected['showPengesahan'] = true;
        }
        if (str_contains($lower, 'pernyataan') || str_contains($lower, 'orisinalitas') || str_contains($lower, 'keaslian')) {
            $detected['showPernyataan'] = true;
        }
        if (str_contains($lower, 'abstrak') || str_contains($lower, 'abstract')) {
            $detected['showAbstractIndo'] = true;
            $detected['showAbstractEng'] = true;
        }

        if (str_contains($lower, 'disusun oleh')) {
            $detected['coverAuthorLabel'] = 'Disusun Oleh :';
        } elseif (str_contains($lower, 'oleh saja') || str_contains($lower, 'label oleh')) {
            $detected['coverAuthorLabel'] = 'Oleh :';
        }

        return $detected;
    }
}
