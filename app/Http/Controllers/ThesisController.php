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
    private array $aiConfig = [];
    /**
     * Display the thesis builder dashboard.
     */
    public function index()
    {
        return Inertia::render('Thesis/Index');
    }

    /**
     * Retrieve flexible AI configuration from request, headers, or env.
     */
    private function getApiKey(Request $request)
    {
        $provider = strtolower($request->header('X-AI-Provider') ?? env('AI_PROVIDER', 'gemini'));
        $model = $request->header('X-AI-Model') ?: env('AI_MODEL') ?: ($provider === 'gemini' ? 'gemini-2.5-flash' : 'openai/gpt-4o-mini');
        $baseUrl = rtrim($request->header('X-AI-Base-URL') ?: env('AI_BASE_URL', ''), '/');
        $apiKey = $request->input('api_key')
            ?? $request->header('X-AI-Key')
            ?? $request->header('X-Gemini-Key')
            ?? env('AI_API_KEY')
            ?? env('GEMINI_API_KEY')
            ?? config('services.gemini.key');

        $isLocalProxy = in_array(parse_url($baseUrl, PHP_URL_HOST), ['localhost', '127.0.0.1', '::1'], true);
        if (!$apiKey && $provider === 'custom' && $isLocalProxy) {
            $apiKey = 'local-proxy';
        }

        $this->aiConfig = [
            'provider' => in_array($provider, ['gemini', 'openrouter', 'openai', 'custom'], true) ? $provider : 'gemini',
            'model' => $model,
            'base_url' => $baseUrl,
            'api_key' => $apiKey,
        ];

        return $apiKey;
    }

    private function buildAcademicContext(?string $fakultas, ?string $prodi): string
    {
        $department = strtolower(($fakultas ?? '') . ' ' . ($prodi ?? ''));
        $base = "Konteks aplikasi: web ini membantu penyusunan laporan akademik untuk semua jurusan kuliah, dengan prioritas jurusan teknik. Gunakan gaya panduan akademik Indonesia yang lazim di perguruan tinggi besar seperti UI, UGM, ITB, ITS, UNPAD, dan kampus teknik lain tanpa mengarang nama dokumen spesifik.";

        if (str_contains($department, 'informatika') || str_contains($department, 'sistem informasi') || str_contains($department, 'komputer') || str_contains($department, 'teknologi informasi')) {
            return $base . " Fokus prodi Informatika/SI: arahkan pada pembuatan perangkat lunak, analisis kebutuhan, APSI, SDLC Waterfall/Agile/Prototype/Scrum, pengujian black-box/white-box/UAT, basis data, serta diagram BPMN, Use Case, Activity, Sequence, Class Diagram, dan ERD. Jika diminta diagram, berikan struktur node-relasi yang mudah digambar pada graph/canvas.";
        }

        if (str_contains($department, 'sipil')) {
            return $base . " Fokus Teknik Sipil: sesuaikan dengan struktur laporan perencanaan, struktur, transportasi, geoteknik, hidrologi, manajemen konstruksi, metode observasi lapangan/laboratorium, analisis standar teknis, serta penyajian data perhitungan, gambar kerja, dan tabel hasil uji secara akademik.";
        }

        if (str_contains($department, 'industri')) {
            return $base . " Fokus Teknik Industri: sesuaikan dengan ergonomi, optimasi, manajemen operasi, supply chain, quality control, lean manufacturing, simulasi, peramalan, tata letak fasilitas, pengukuran kerja, dan metode relevan seperti AHP, TOPSIS, ANP, Six Sigma, FMEA, QFD, EOQ, MRP, serta analisis produktivitas.";
        }

        return $base . " Untuk prodi non-teknik, tetap gunakan struktur laporan ilmiah umum: pendahuluan, tinjauan pustaka, metodologi, hasil-pembahasan, kesimpulan-saran, dan sesuaikan metode dengan disiplin ilmunya.";
    }


    private function buildResearchFocusContext(string $title, string $topik, string $metode, ?string $metodePengembangan, ?string $metodePengujian): string
    {
        $developmentMethod = $metodePengembangan ?: 'Tidak ditentukan; pilih hanya jika relevan dengan produk/sistem pada judul.';
        $testingMethod = $metodePengujian ?: 'Tidak ditentukan; sesuaikan dengan metode utama dan jenis luaran penelitian.';

        return "KONTRAK FOKUS PENELITIAN (WAJIB DIIKUTI):
- Judul utama penelitian adalah: {$title}
- Topik kerja yang boleh dibahas adalah: {$topik}
- Metode/algoritma utama penyelesaian masalah adalah: {$metode}
- Metode pengembangan produk/sistem adalah: {$developmentMethod}
- Metode pengujian/evaluasi adalah: {$testingMethod}
- Jangan mengganti objek penelitian, studi kasus, platform, penyakit/gejala, variabel, algoritma, metode pengembangan, atau metode pengujian yang sudah disebutkan.
- Jika judul adalah sistem pakar/SPK/aplikasi cerdas, bedakan peran metode: algoritma utama dipakai untuk penalaran/perhitungan keputusan, sedangkan metode pengembangan dipakai untuk tahapan pembangunan sistem.
- Semua contoh, data simulasi, tabel, rumusan, dan narasi harus mengacu pada judul ini. Jika perlu membuat contoh, buat contoh yang konsisten dengan objek dan metode pada judul, bukan topik lain.
- Jangan membahas e-learning, kepuasan mahasiswa, game online, thalassemia, atau contoh lain kecuali memang muncul pada judul/topik penelitian ini.";
    }

    private function buildActiveReferenceContext(array $references): string
    {
        $items = collect($references)
            ->filter(fn ($ref) => is_array($ref) && trim(($ref['title'] ?? '') . ($ref['author'] ?? '') . ($ref['publisher'] ?? '') . ($ref['url'] ?? '') . ($ref['doi'] ?? '')) !== '')
            ->take(30)
            ->values()
            ->map(function ($ref, $index) {
                $author = trim((string) ($ref['author'] ?? 'Tanpa penulis'));
                $year = trim((string) ($ref['year'] ?? 'n.d.'));
                $title = trim((string) ($ref['title'] ?? 'Tanpa judul'));
                $publisher = trim((string) ($ref['publisher'] ?? ''));
                $url = trim((string) ($ref['url'] ?? ''));
                $doi = trim((string) ($ref['doi'] ?? ''));
                $source = trim(implode('; ', array_filter([$publisher, $doi ? "DOI: {$doi}" : '', $url])));

                return ($index + 1) . ". {$author} ({$year}). {$title}" . ($source ? ". {$source}" : '') . ".";
            })
            ->implode("\n");

        if (!$items) {
            return "PUSTAKA AKTIF: Belum ada referensi aktif dari menu Pustaka. Jika membutuhkan sitasi baru, gunakan hanya sumber tepercaya yang benar-benar ada dan masukkan ke field references.";
        }

        return "PUSTAKA AKTIF DARI MENU PUSTAKA (PRIORITASKAN UNTUK SITASI):\n{$items}\n\nAturan pustaka: gunakan referensi di atas sebagai sumber utama ketika relevan dengan sub-bab. Jika content memakai sitasi dari pustaka aktif, salin item sumber tersebut ke field references agar menu Pustaka tetap tersinkron. Jika pustaka aktif tidak relevan atau belum cukup, boleh menambahkan referensi tepercaya/open access baru, tetapi jangan mengarang penulis, tahun, judul, URL, atau DOI.";
    }

    private function normalizedAiResponse(bool $failed, array $data)
    {
        return new class($failed, $data) {
            public function __construct(private bool $failed, private array $data) {}
            public function failed(): bool { return $this->failed; }
            public function successful(): bool { return !$this->failed; }
            public function json(?string $key = null, mixed $default = null): mixed
            {
                return $key === null ? $this->data : data_get($this->data, $key, $default);
            }
        };
    }

    private function callGeminiJson(string $apiKey, string $prompt)
    {
        $provider = $this->aiConfig['provider'] ?? 'gemini';
        $model = $this->aiConfig['model'] ?? 'gemini-2.5-flash';

        if ($provider === 'gemini') {
            return $this->postGemini($apiKey, [
                'contents' => [[
                    'parts' => [['text' => $prompt]],
                ]],
                'generationConfig' => [
                    'responseMimeType' => 'application/json',
                ],
            ]);
        }

        $baseUrl = $this->aiConfig['base_url'] ?: match ($provider) {
            'openrouter' => 'https://openrouter.ai/api/v1',
            'openai' => 'https://api.openai.com/v1',
            default => '',
        };

        if (!$baseUrl) {
            return $this->normalizedAiResponse(true, ['error' => ['message' => 'Base URL AI belum diisi untuk provider custom.']]);
        }

        $response = Http::timeout((int) env('AI_TIMEOUT_SECONDS', 120))->withHeaders([
            'Authorization' => "Bearer {$apiKey}",
            'Content-Type' => 'application/json',
            'HTTP-Referer' => config('app.url', 'http://localhost'),
            'X-Title' => config('app.name', 'Satset'),
        ])->post(rtrim($baseUrl, '/') . '/chat/completions', [
            'model' => $model,
            'messages' => [
                ['role' => 'system', 'content' => 'Anda adalah asisten akademik Indonesia. Selalu jawab dalam JSON valid jika diminta.'],
                ['role' => 'user', 'content' => $prompt],
            ],
            'temperature' => 0.35,
            'response_format' => ['type' => 'json_object'],
        ]);

        if ($response->failed()) {
            return $this->normalizedAiResponse(true, $response->json() ?? ['error' => ['message' => 'AI provider error.']]);
        }

        $text = $response->json('choices.0.message.content') ?? '';
        return $this->normalizedAiResponse(false, [
            'candidates' => [[
                'content' => [
                    'parts' => [['text' => $text]],
                ],
            ]],
        ]);
    }

    private function postGemini(string $apiKey, array $payload)
    {
        $model = ($this->aiConfig['provider'] ?? 'gemini') === 'gemini' ? ($this->aiConfig['model'] ?? 'gemini-2.5-flash') : 'gemini-2.5-flash';
        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";
        $verifySsl = filter_var(env('GEMINI_VERIFY_SSL', true), FILTER_VALIDATE_BOOL);

        return Http::timeout((int) env('AI_TIMEOUT_SECONDS', 120))->withOptions(['verify' => $verifySsl])->post($url, $payload);
    }

    private function buildDynamicSectionInstruction(string $sectionTitle): string
    {
        $normalizedTitle = strtolower($sectionTitle);

        if (str_contains($normalizedTitle, 'maksud') || str_contains($normalizedTitle, 'tujuan')) {
            return "ARAHAN KHUSUS SUB-BAB 'MAKSUD DAN TUJUAN':
- Jangan menulis Rumusan Masalah, Identifikasi Masalah, Latar Belakang, atau daftar pertanyaan penelitian.
- Awali dengan narasi singkat tentang maksud penelitian, yaitu alasan umum/arah besar penelitian dilakukan.
- Lanjutkan dengan tujuan penelitian dalam bentuk poin bernomor yang menjawab secara langsung rumusan masalah yang sudah ada sebelumnya.
- Gunakan frasa operasional seperti menganalisis, merancang, membangun, mengimplementasikan, menguji, mengevaluasi, atau mengukur sesuai judul penelitian.
- Jangan mengulang kalimat 'Rumusan Masalah disusun...' dan jangan membuat pertanyaan baru.";
        }

        if (str_contains($normalizedTitle, 'manfaat')) {
            return "ARAHAN KHUSUS SUB-BAB 'MANFAAT': tulis manfaat teoretis dan praktis. Jangan menulis rumusan masalah atau tujuan. Kelompokkan manfaat bagi peneliti, objek penelitian/instansi, pengguna, dan peneliti selanjutnya jika relevan.";
        }

        if (str_contains($normalizedTitle, 'batasan')) {
            return "ARAHAN KHUSUS SUB-BAB 'BATASAN MASALAH': awali dengan satu paragraf pembuka singkat, lalu tulis batas ruang lingkup penelitian dalam poin bernomor ringkas. Jangan menulis tujuan atau rumusan masalah. Batasan harus spesifik pada objek, fitur, data, metode, waktu, teknologi, atau ruang lingkup pengujian yang digunakan.";
        }

        if (str_contains($normalizedTitle, 'sistematika')) {
            return "ARAHAN KHUSUS SUB-BAB 'SISTEMATIKA PENULISAN': jelaskan isi setiap BAB secara ringkas dari BAB I sampai BAB terakhir. Jangan menulis rumusan masalah, tujuan, atau latar belakang.";
        }

        return "ARAHAN KHUSUS: Wajib fokus hanya pada judul sub-bab target. Jangan mengganti topik menjadi sub-bab lain seperti Rumusan Masalah, Latar Belakang, Identifikasi Masalah, Manfaat, atau Batasan Masalah kecuali judul target memang itu.";
    }



    private function enforceBackgroundParagraphs(string $content, string $style = 'structured'): string
    {
        $trimmed = trim($content);
        if ($trimmed === '') return $trimmed;

        $normalizeParagraphs = function (string $text): array {
            return array_values(array_filter(array_map('trim', preg_split('/\n\s*\n/', trim($text))), fn ($paragraph) => $paragraph !== ''));
        };

        $paragraphs = $normalizeParagraphs($trimmed);
        if (count($paragraphs) >= 4) {
            return implode("\n\n", array_slice($paragraphs, 0, 4));
        }

        $withTagBreaks = preg_replace('/\s*(\[Komentar\s+Alinea\s+\d+\s*:[^\]]+\])\s*/i', "\n\n$1\n", $trimmed);
        $withTagBreaks = preg_replace('/\s*(?=(?:Alinea|Paragraf)\s+[1-4]\s*[:.-])/i', "\n\n", $withTagBreaks);
        $withTagBreaks = trim(preg_replace("/\n{3,}/", "\n\n", $withTagBreaks));
        $tagParagraphs = $normalizeParagraphs($withTagBreaks);
        if (count($tagParagraphs) >= 4) {
            return implode("\n\n", array_slice($tagParagraphs, 0, 4));
        }

        $sentences = preg_split('/(?<=[.!?])\s+(?=[A-Z0-9\p{Lu}])/u', $trimmed, -1, PREG_SPLIT_NO_EMPTY);
        if (count($sentences) < 4) return $trimmed;

        $paragraphCount = 4;
        $perParagraph = (int) ceil(count($sentences) / $paragraphCount);
        $paragraphs = [];
        for ($i = 0; $i < $paragraphCount; $i++) {
            $chunk = array_slice($sentences, $i * $perParagraph, $perParagraph);
            if ($chunk) $paragraphs[] = trim(implode(' ', $chunk));
        }

        return implode("\n\n", $paragraphs);
    }

    private function enforceProblemPointFormat(string $content, string $section): string
    {
        $trimmed = trim($content);
        if ($trimmed === '') return $trimmed;

        $trimmed = preg_replace('/\s+(?=\d+\s*[\).]\s+)/u', "\n", $trimmed);
        preg_match_all('/(?:^|\R)\s*(\d+)\s*[\).]\s*(.*?)(?=(?:\R\s*\d+\s*[\).]\s*)|\z)/su', $trimmed, $matches, PREG_SET_ORDER);
        if (!$matches) {
            preg_match_all('/(?:^|\R)\s*[-•*]\s+(.*?)(?=(?:\R\s*[-•*]\s+)|\z)/su', $trimmed, $matches, PREG_SET_ORDER);
        }
        if (!$matches) {
            $sentences = preg_split('/(?<=[.!?])\s+/u', $trimmed, -1, PREG_SPLIT_NO_EMPTY);
            $matches = array_map(fn ($sentence) => [null, null, $sentence], $sentences);
        }

        $points = [];
        foreach ($matches as $match) {
            $text = trim(preg_replace('/\s+/', ' ', $match[2] ?? $match[1] ?? ''));
            $text = preg_replace('/\s*\([^)]*\b\d{4}\b[^)]*\)/u', '', $text);
            $text = preg_replace('/\s*\[[^\]]+\]/u', '', $text);
            $text = preg_replace('/^(Kesenjangan\s*\(Gap\)|Kesenjangan|Fenomena|Penyebab|Dampak|Kebutuhan|Masalah)\s*:\s*/i', '', $text);

            $sentences = preg_split('/(?<=[.!?])\s+/u', $text, -1, PREG_SPLIT_NO_EMPTY);
            if ($section === 'rumusan_masalah') {
                $firstSentence = trim($sentences[0] ?? $text);
                $firstSentence = $this->shortenProblemPoint($firstSentence, 170);
                $firstSentence = rtrim($firstSentence, '.;:?') . '?';
            } else {
                $firstSentence = trim($sentences[0] ?? $text);
                $firstSentence = $this->shortenProblemPoint($firstSentence, 160);
                $firstSentence = rtrim($firstSentence, ';:');
                if (!preg_match('/[.!?]$/u', $firstSentence)) $firstSentence .= '.';
            }

            if ($firstSentence !== '') $points[] = $firstSentence;
        }

        $numberedPoints = collect($points)
            ->take($section === 'rumusan_masalah' ? 4 : 6)
            ->values()
            ->map(fn ($point, $index) => ($index + 1) . '. ' . $point)
            ->implode("\n");

        if ($numberedPoints === '') return $trimmed;

        $opening = match ($section) {
            'rumusan_masalah' => 'Berdasarkan latar belakang dan identifikasi masalah yang telah diuraikan, maka rumusan masalah dalam penelitian ini adalah sebagai berikut:',
            'batasan_masalah' => 'Agar pembahasan penelitian lebih terarah dan tidak meluas dari ruang lingkup yang telah ditetapkan, maka batasan masalah dalam penelitian ini adalah sebagai berikut:',
            default => 'Berdasarkan latar belakang yang telah diuraikan, maka identifikasi masalah dalam penelitian ini adalah sebagai berikut:',
        };

        return $opening . "\n\n" . $numberedPoints;
    }

    private function shortenProblemPoint(string $text, int $maxLength): string
    {
        $text = trim(preg_replace('/\s+/', ' ', $text));
        $text = preg_replace('/\b(berdasarkan|menurut|sebagaimana|hal ini|oleh karena itu)\b.*$/iu', '', $text);

        foreach ([', sehingga ', ', karena ', ', yang ', ';', ':'] as $separator) {
            if (mb_strlen($text) <= $maxLength) break;
            $position = mb_stripos($text, $separator);
            if ($position !== false && $position >= 60) {
                $text = mb_substr($text, 0, $position);
                break;
            }
        }

        if (mb_strlen($text) > $maxLength) {
            $cut = mb_substr($text, 0, $maxLength);
            $lastSpace = mb_strrpos($cut, ' ');
            $text = trim(mb_substr($cut, 0, $lastSpace ?: $maxLength));
        }

        return trim($text, " \t\n\r\0\x0B.,;:");
    }

    private function resolveProblemSectionType(string $section, ?string $sectionTitle = null): ?string
    {
        if (in_array($section, ['identifikasi_masalah', 'rumusan_masalah', 'batasan_masalah'], true)) {
            return $section;
        }

        $normalizedTitle = strtolower($sectionTitle ?? '');
        if (str_contains($normalizedTitle, 'identifikasi masalah')) {
            return 'identifikasi_masalah';
        }
        if (str_contains($normalizedTitle, 'rumusan masalah')) {
            return 'rumusan_masalah';
        }
        if (str_contains($normalizedTitle, 'batasan masalah') || str_contains($normalizedTitle, 'batasan')) {
            return 'batasan_masalah';
        }

        return null;
    }

    private function cleanGeneratedSectionContent(string $content, string $sectionTitle = ''): string
    {
        $lines = preg_split('/\R/', trim($content));
        $cleanedLines = [];
        $skipHeadingPatterns = [
            '/^\s*BAB\s+[IVXLCDM0-9]+\s*$/i',
            '/^\s*(PENDAHULUAN|TINJAUAN\s+PUSTAKA|LANDASAN\s+TEORI|METODOLOGI\s+PENELITIAN|ANALISIS\s+DAN\s+PERANCANGAN|HASIL\s+DAN\s+PEMBAHASAN|PENUTUP)\s*$/i',
            '/^\s*\d+(?:\.\d+)+\s+(Rumusan\s+Masalah|Latar\s+Belakang|Identifikasi\s+Masalah|Maksud\s+dan\s+Tujuan|Tujuan\s+Penelitian|Manfaat\s+Penelitian|Batasan\s+Masalah)\s*$/i',
            '/^\s*(Rumusan\s+Masalah|Latar\s+Belakang\s+Masalah|Identifikasi\s+Masalah|Maksud\s+dan\s+Tujuan)\s*$/i',
        ];

        foreach ($lines as $line) {
            $shouldSkip = false;
            foreach ($skipHeadingPatterns as $pattern) {
                if (preg_match($pattern, $line)) {
                    $shouldSkip = true;
                    break;
                }
            }
            if (!$shouldSkip) {
                $cleanedLines[] = $line;
            }
        }

        $cleaned = trim(implode("\n", $cleanedLines));
        $normalizedTitle = strtolower($sectionTitle);

        if ((str_contains($normalizedTitle, 'maksud') || str_contains($normalizedTitle, 'tujuan'))
            && preg_match('/^\s*Rumusan\s+Masalah\b/i', $cleaned)) {
            $cleaned = preg_replace('/^\s*Rumusan\s+Masalah\b\s*/i', '', $cleaned);
        }

        return trim($cleaned);
    }
    public function testAiConnection(Request $request)
    {
        $apiKey = $this->getApiKey($request);

        if (!$apiKey) {
            return response()->json([
                'error' => 'API Key AI tidak ditemukan. Isi API Key terlebih dahulu.'
            ], 400);
        }

        $provider = $this->aiConfig['provider'] ?? 'gemini';
        $model = $this->aiConfig['model'] ?? 'default';
        $prompt = "Kembalikan JSON valid saja dengan format {\"ok\":true,\"message\":\"Koneksi AI berhasil\"}.";

        try {
            $response = $this->callGeminiJson($apiKey, $prompt);

            if ($response->failed()) {
                $errorMsg = $response->json('error.message') ?? 'Koneksi AI gagal.';
                return response()->json([
                    'ok' => false,
                    'provider' => $provider,
                    'model' => $model,
                    'error' => $errorMsg,
                ], 500);
            }

            $resultText = trim((string) $response->json('candidates.0.content.parts.0.text', ''));
            $data = json_decode($resultText, true);

            return response()->json([
                'ok' => true,
                'provider' => $provider,
                'model' => $model,
                'message' => $data['message'] ?? 'Koneksi AI berhasil.',
            ]);
        } catch (\Exception $e) {
            Log::error('AI connection test error: ' . $e->getMessage());
            return response()->json([
                'ok' => false,
                'provider' => $provider,
                'model' => $model,
                'error' => 'Koneksi AI gagal: ' . $e->getMessage(),
            ], 500);
        }
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
                'error' => 'API Key AI tidak ditemukan. Harap masukkan API Key di panel pengaturan AI.'
            ], 400);
        }

        $fakultas = $request->input('fakultas');
        $prodi = $request->input('prodi');
        $topik = $request->input('topik');

        $academicContext = $this->buildAcademicContext($fakultas, $prodi);

        $prompt = "Anda adalah pakar akademis pembimbing skripsi di Indonesia yang memahami lintas bidang dan tren riset terapan terbaru. Berdasarkan informasi berikut:
Fakultas: {$fakultas}
Program Studi: {$prodi}
Topik Penelitian: {$topik}

{$academicContext}

Tugas Anda:
1. Berikan 6 rekomendasi judul skripsi yang spesifik, operasional, menarik, inovatif, dan tetap realistis dikerjakan mahasiswa.
2. Perkaya variasi topik dari input kasar pengguna menjadi beberapa arah penelitian berbeda, misalnya pengembangan sistem, evaluasi kualitas, prediksi/klasifikasi, optimasi keputusan, analisis pengalaman pengguna, integrasi IoT/mobile/web, dashboard analitik, keamanan, atau peningkatan proses bisnis sesuai prodi.
3. Untuk setiap judul, pilih metode yang paling cocok dan spesifik sesuai jenis penelitian; jangan memakai istilah terlalu umum seperti \"metode kualitatif\" jika ada pendekatan yang lebih tepat.
4. Khusus Teknik Informatika/IT/Sistem Informasi, bedakan dengan tegas antara metode pengembangan produk, metode pengujian/evaluasi sistem, dan algoritma/model komputasi. Jangan menyebut Waterfall/Prototype sebagai algoritma, dan jangan menyebut K-Means/Naive Bayes/Fuzzy sebagai metode pengembangan aplikasi.
5. Jika judul berupa pembangunan aplikasi/sistem informasi, sistem pakar, sistem pendukung keputusan, atau produk perangkat lunak lain, isi field metode_pengembangan dengan metode pengembangan produk seperti Waterfall, Prototype, Agile/Scrum, RAD, Design Thinking, User Centered Design, atau Human Centered Design. Untuk kasus sistem pakar berbasis Fuzzy Tsukamoto/Mamdani/Sugeno, Certainty Factor, Forward Chaining, atau algoritma sejenis, field metode tetap berisi algoritma/model penyelesaian masalah, sedangkan field metode_pengembangan berisi proses pembuatan sistemnya.
6. Jika judul berupa klasifikasi, prediksi, clustering, rekomendasi, pengenalan citra/teks, atau analisis data, metode utama harus berupa algoritma/model seperti K-Means, Naive Bayes, KNN, Decision Tree/C4.5, Random Forest, SVM, Regresi, Neural Network, CNN, LSTM, Transformer sederhana, Apriori/FP-Growth, atau Fuzzy Logic; pada penjelasan metode sebut metrik evaluasi seperti akurasi, precision, recall, F1-score, RMSE/MAE, silhouette score, atau confusion matrix sesuai kasus.
7. Jika judul berupa sistem pendukung keputusan, metode utama harus berupa metode SPK/optimasi seperti AHP, ANP, SAW, TOPSIS, WP, MOORA, SMART, ELECTRE, PROMETHEE, Fuzzy AHP, Fuzzy TOPSIS, atau kombinasi pembobotan-perangkingan yang tepat.
8. Pastikan metode antar rekomendasi bervariasi dan tidak semuanya memakai metode yang sama.
9. Judul harus menggunakan objek/kasus yang jelas, variabel/fitur yang terukur, dan hindari judul yang terlalu luas.
10. Penjelasan metode harus menyebut kategori metode, alasan kecocokan, jenis data/input yang dibutuhkan, metode pengembangan produk jika relevan, dan bentuk evaluasi/keluaran yang diharapkan dalam 1-2 kalimat ringkas.

Daftar inspirasi metode yang boleh dipilih dan disesuaikan, bukan harus semuanya digunakan:
- Metode pengembangan produk/sistem: Waterfall, Prototype, Agile/Scrum, Rapid Application Development (RAD), Spiral, V-Model, DevOps sederhana, Design Thinking, User Centered Design (UCD), Human Centered Design (HCD).
- Metode testing dan evaluasi sistem: Black Box Testing, White Box Testing, Grey Box Testing, Unit Testing, Integration Testing, User Acceptance Testing (UAT), System Usability Scale (SUS), Heuristic Evaluation, ISO/IEC 25010, Technology Acceptance Model (TAM), WebQual, PIECES, EUCS, SERVQUAL.
- Algoritma/model analisis data dan AI: Fuzzy Logic Mamdani/Sugeno/Tsukamoto, K-Means, DBSCAN, Naive Bayes, K-Nearest Neighbors (KNN), Decision Tree/C4.5, Random Forest, Support Vector Machine (SVM), Logistic/Linear Regression, Neural Network/MLP, CNN, RNN/LSTM/GRU, Transfer Learning, Sentiment Analysis, Apriori/FP-Growth, Collaborative Filtering, Content-Based Filtering.
- Metode sistem pendukung keputusan/optimasi: AHP, ANP, SAW, TOPSIS, WP, MOORA, SMART, ELECTRE, PROMETHEE, Fuzzy AHP, Fuzzy TOPSIS, FMEA, QFD, Six Sigma, Lean, EOQ, MRP, Forecasting, Linear Programming, Simulasi Monte Carlo/Discrete Event.
- Teknik Sipil/Industri dan bidang lain: observasi lapangan, eksperimen/laboratorium, survei kuantitatif, studi kasus, regresi, SEM-PLS, analisis risiko, analisis produktivitas, analisis biaya-manfaat, hidrologi, geoteknik, transportasi, struktur, ergonomi, tata letak fasilitas, supply chain.

Khusus jika prodi mengarah ke Informatika/IT/Sistem Informasi, prioritaskan kombinasi judul yang mencakup minimal beberapa kategori berikut: pengembangan aplikasi dengan metode pengembangan produk, evaluasi kualitas/usability dengan metode testing/evaluasi, data mining/AI dengan algoritma/model, sistem pakar atau sistem pendukung keputusan dengan algoritma/metode SPK sekaligus metode pengembangan produk, dan perancangan proses/UML/ERD/BPMN bila relevan.

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
            $response = $this->callGeminiJson($apiKey, $prompt);

            if ($response->failed()) {
                $errorMsg = $response->json('error.message') ?? 'Terjadi kesalahan pada server AI.';
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
            return response()->json(['error' => 'Koneksi ke API AI gagal: ' . $e->getMessage()], 500);
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
            'metode_pengembangan' => 'nullable|string|max:255',
            'metode_pengujian' => 'nullable|string|max:255',
            'fakultas' => 'nullable|string|max:255',
            'prodi' => 'nullable|string|max:255',
            'section_title' => 'nullable|string|max:500',
            'bab_context' => 'nullable|string|max:255',
            'ai_write_style' => 'nullable|string|max:255',
            'year_start' => 'nullable|integer',
            'year_end' => 'nullable|integer',
            'additional_prompt' => 'nullable|string|max:1000',
            'references' => 'nullable|array|max:30',
            'references.*.type' => 'nullable|string|max:50',
            'references.*.author' => 'nullable|string|max:500',
            'references.*.year' => 'nullable|string|max:50',
            'references.*.title' => 'nullable|string|max:1000',
            'references.*.publisher' => 'nullable|string|max:1000',
            'references.*.url' => 'nullable|string|max:1000',
            'references.*.doi' => 'nullable|string|max:255',
        ]);

        $apiKey = $this->getApiKey($request);

        if (!$apiKey) {
            return response()->json([
                'error' => 'API Key AI tidak ditemukan. Harap masukkan API Key di panel pengaturan AI.'
            ], 400);
        }

        $title = $request->input('title');
        $section = $request->input('section');
        $topik = $request->input('topik') ?? 'Sesuai judul';
        $metode = $request->input('metode') ?? 'Sesuai judul';
        $metodePengembangan = $request->input('metode_pengembangan');
        $metodePengujian = $request->input('metode_pengujian');
        $fakultas = $request->input('fakultas') ?? '';
        $prodi = $request->input('prodi') ?? '';
        $problemSectionType = $this->resolveProblemSectionType($section, $request->input('section_title'));
        $academicContext = $this->buildAcademicContext($fakultas, $prodi);
        $researchFocusContext = $this->buildResearchFocusContext($title, $topik, $metode, $metodePengembangan, $metodePengujian);
        $activeReferenceContext = $this->buildActiveReferenceContext($request->input('references', []));
        $aiWriteStyle = $request->input('ai_write_style', 'structured');
        $yearStart = $request->input('year_start') ?? (date('Y') - 10);
        $yearEnd = $request->input('year_end') ?? date('Y');

        // Handle dynamic section generation (for imported DOCX headings etc.)
        if ($section === '__dynamic__') {
            $sectionTitle = $request->input('section_title', 'Bagian ini');
            $babContext = $request->input('bab_context', 'BAB');
            $dynamicSectionInstruction = $this->buildDynamicSectionInstruction($sectionTitle);

            $prompt = "Anda adalah penulis akademik skripsi Indonesia yang ahli dan dosen pembimbing senior. Tulis draf konten ilmiah yang sangat terfokus, mendalam, dan spesifik untuk bagian sub-bab berikut:

Judul Skripsi: {$title}
Fakultas/Prodi: {$fakultas} / {$prodi}
Topik Penelitian: {$topik}
Metode/Algoritma Utama: {$metode}
Metode Pengembangan Sistem/Produk: {$metodePengembangan}
Metode Pengujian/Evaluasi: {$metodePengujian}
Konteks BAB: {$babContext}
Judul Sub-Bab: {$sectionTitle}

{$academicContext}

{$researchFocusContext}

{$activeReferenceContext}

{$dynamicSectionInstruction}

Ketentuan Gaya & Penulisan:
1. Tulis dalam bahasa Indonesia akademis yang sangat formal, ilmiah, mengalir, dan presisi (sesuai PUEBI/EYD).
2. Tulis konten yang secara langsung sesuai dengan Judul Sub-Bab '{$sectionTitle}', bukan judul sub-bab sebelumnya atau berikutnya.
3. DILARANG memulai jawaban dengan nama sub-bab lain. Contoh: jika Judul Sub-Bab adalah 'Maksud dan Tujuan', jangan menulis 'Rumusan Masalah ...'.
4. Tulis minimal 2-3 paragraf atau poin bernomor bila format sub-bab secara akademik lebih tepat memakai poin.
5. JANGAN menulis ringkasan umum dari seluruh alur penelitian atau bab jika judul sub-bab merujuk ke aktivitas/proses spesifik (seperti 'Communication', 'Akuisisi Pengetahuan', 'Desain Antarmuka', dll.). Bahaslah secara terfokus mengenai detail pelaksanaan dan luaran sub-bab tersebut.
6. DILARANG menyertakan heading seperti 'BAB I', 'PENDAHULUAN', '1.3 Rumusan Masalah', atau judul sub-bab apapun di dalam content. Isi hanya badan paragraf/poin untuk sub-bab target.
7. Struktur penulisan sub-bab harus mencakup aspek berikut bila sesuai dengan jenis sub-bab, tetapi seluruh substansi wajib tetap merujuk pada judul, objek, metode utama, metode pengembangan, dan pengujian yang tercantum pada KONTRAK FOKUS PENELITIAN:
   - Paragraf 1 (Definisi & Relevansi): Jelaskan apa itu [Judul Sub-Bab] dalam konteks metodologi/sistem yang dibangun. Hubungkan langsung dengan Judul Skripsi, Topik, dan Metode/Algoritma yang digunakan.
   - Paragraf 2 (Tujuan & Detail Proses): Terangkan secara konkret bagaimana proses atau tahapan tersebut dilakukan secara riil (misalnya jika tentang 'Communication' atau 'Akuisisi Pengetahuan', jelaskan komunikasi/wawancara dengan pakar/praktisi yang relevan seperti dokter/psikolog/ahli terkait topik skripsi, observasi lapangan, atau studi literatur).
   - Paragraf 3 (Hasil/Output & Dampak): Jelaskan output nyata/konkret yang didapatkan dari tahap ini sesuai judul aktif, misalnya kebutuhan sistem, data penelitian, aturan/metode, rancangan, hasil evaluasi, atau dasar untuk tahap berikutnya.

PENTING: Sebelum menulis, pastikan semua paragraf menjawab sub-bab target dan tetap konsisten dengan KONTRAK FOKUS PENELITIAN. Jangan mengambil contoh objek/metode dari prompt contoh jika berbeda dari judul pengguna. Terapkan gaya akademik ke sub-bab '{$sectionTitle}' dengan menyesuaikannya secara logis dan ilmiah terhadap Judul Skripsi ('{$title}'), Topik ('{$topik}'), Metode/Algoritma Utama ('{$metode}'), Metode Pengembangan ('{$metodePengembangan}'), dan Metode Pengujian ('{$metodePengujian}') Anda. Abaikan contoh jika contoh tersebut tidak sesuai dengan jenis sub-bab target.
Berikan LANGSUNG isi draf tulisan yang siap disalin tanpa teks sapaan pembuka (seperti 'Halo', 'Berikut adalah draf...') atau teks penutup. Tulis secara mendalam, rapi, dan ilmiah.";
        } else {
            // Build tailored background prompt if section is latar_belakang
            $latarBelakangPrompt = "";
            if ($aiWriteStyle === 'structured') {
                $latarBelakangPrompt = "Tulis draf akademis terstruktur untuk bagian 'Latar Belakang Masalah' (BAB I) skripsi.
Judul Skripsi: {$title}
Topik: {$topik}
Metode: {$metode}

Anda HARUS menyusun draf latar belakang ini dengan pola piramida terbalik dalam tepat 4 alinea deduktif yang semakin mengerucut dari teori umum menuju pengangkatan judul. Setiap alinea HARUS diawali dengan baris komentar panduan dalam format [Komentar Alinea X: ...].

Berikut adalah ketentuan detail piramida untuk masing-masing alinea:

1. [Komentar Alinea 1: Teori Umum dan Landasan Konsep]
   - Alinea pertama berisi teori-teori umum, konsep dasar, definisi, atau landasan ilmiah yang relevan dengan topik dan judul penelitian.
   - Ambil teori dari referensi yang relevan, tepercaya, dan terbaru bila memungkinkan; bagian ini menjadi dasar ideal/das sollen.
   - Jangan langsung membahas masalah lapangan terlalu spesifik; bangun konteks akademik umum terlebih dahulu.
   - Wajib menyertakan minimal 1-2 sitasi tepercaya langsung di dalam alinea, misalnya (Nama, Tahun), dan sumbernya harus ada di field references.

2. [Komentar Alinea 2: Permasalahan yang Terjadi]
   - Alinea kedua berisi permasalahan nyata yang terjadi pada objek, pengguna, proses, sistem, atau fenomena penelitian.
   - Fokus pada fakta, gejala, kendala, kebutuhan, atau kondisi lapangan tanpa membahas teori baru.
   - Tunjukkan kesenjangan antara kondisi ideal pada alinea pertama dengan kondisi nyata yang terjadi.
   - Jika data faktual tidak tersedia, gunakan narasi observasi awal yang masuk akal, hati-hati, dan tetap sesuai judul.

3. [Komentar Alinea 3: Solusi dari Permasalahan]
   - Alinea ketiga menjelaskan solusi yang ditawarkan untuk menjawab permasalahan pada alinea kedua.
   - Hubungkan solusi dengan metode/algoritma utama, metode pengembangan produk, dan metode pengujian bila relevan.
   - Jelaskan alasan solusi tersebut tepat, manfaat yang diharapkan, dan bagaimana solusi membantu mengurangi gap masalah.
   - Wajib menyertakan sitasi pendukung terkait metode/algoritma/pendekatan solusi jika relevan, langsung di dalam alinea, dan sumbernya harus ada di field references.

4. [Komentar Alinea 4: Pengangkatan Judul Penelitian]
   - Alinea keempat mengerucutkan pembahasan menjadi alasan pengangkatan judul penelitian.
   - Tegaskan urgensi, sasaran akhir, kontribusi praktis/akademik, dan keterkaitan langsung antara masalah, solusi, metode, serta judul.
   - Akhiri dengan kalimat naratif yang mengantar pembaca menuju rumusan masalah tanpa menulis daftar pertanyaan rumusan masalah.
   - Harus paling spesifik dan paling dekat dengan judul penelitian.
Ketentuan Batasan:
- Total panjang tulisan keseluruhan maksimal setara 2 halaman A4 (buatlah draf yang padat, berbobot, dan mengalir dengan baik).
- Setiap alinea wajib memiliki MINIMAL 3 kalimat akademis yang bermakna mendalam.
- WAJIB pisahkan setiap alinea dengan satu baris kosong (dua karakter newline: \n\n). Jangan menggabungkan 4 alinea menjadi satu paragraf panjang.
- Minimal gunakan 2-3 referensi tepercaya pada keseluruhan latar belakang dan masukkan semua sumber sitasi ke field references.
- WAJIB menulis sitasi di dalam paragraf, bukan hanya mengisi references. Format sitasi gunakan gaya penulis-tahun seperti (Penulis, Tahun). Alinea 1 wajib bersitasi, alinea 3 wajib bersitasi, dan alinea 4 minimal menyebut sitasi bila menguatkan urgensi/metode.
- Gaya bahasa harus formal, ilmiah, menggunakan bahasa Indonesia akademis (PUEBI/EYD).
- PENTING: Tuliskan baris komentar panduan di awal setiap paragraf seperti ini:
  [Komentar Alinea 1: Teori Umum dan Landasan Konsep]
  (Teks isi Alinea 1...)

  [Komentar Alinea 2: Permasalahan yang Terjadi]
  (Teks isi Alinea 2...)

  ... dan seterusnya. Jangan memberikan kata pengantar pembuka atau penutup.";
            } else {
                $latarBelakangPrompt = "Tulis draf paragraf mendalam untuk bagian 'Latar Belakang Masalah' (BAB I) skripsi secara langsung mengalir tanpa menyertakan komentar panduan alinea.
Judul Skripsi: {$title}
Topik: {$topik}
Metode: {$metode}
Ketentuan: Tulis dalam bahasa Indonesia akademis yang formal dan ilmiah memakai pola piramida deduktif 4 alinea: teori umum/landasan konsep dari referensi relevan, permasalahan nyata yang terjadi tanpa teori baru, solusi dari permasalahan, lalu pengangkatan judul penelitian. Gunakan minimal 2-3 sitasi tepercaya di dalam paragraf dengan format penulis-tahun seperti (Penulis, Tahun), terutama pada alinea 1 dan alinea 3, lalu masukkan semua sumber ke field references. Deskripsikan urgensi masalah, gap antara kondisi ideal dan kenyataan, solusi, serta alasan judul penting diteliti. Tulis tepat 4 paragraf yang mengerucut dan pisahkan setiap paragraf dengan satu baris kosong (\n\n).";
            }

            // Tailor the prompt based on the specific section requested
            $sectionPrompts = [
            'latar_belakang' => $latarBelakangPrompt,

            'identifikasi_masalah' => "Tulis draf bagian 'Identifikasi Masalah' (BAB I) skripsi.
Judul Skripsi: {$title}
Topik: {$topik}
Ketentuan: Awali dengan satu paragraf pembuka singkat: Berdasarkan latar belakang yang telah diuraikan, maka identifikasi masalah dalam penelitian ini adalah sebagai berikut: lalu sajikan poin-poin bernomor 1 sampai 4 atau 5. Setiap poin harus berupa garis besar masalah yang teridentifikasi, maksimal 1 kalimat pendek (idealnya 12-20 kata), bukan paragraf panjang. Isi poin harus mencakup unsur yang relevan seperti kesenjangan (gap antara kondisi ideal dan fakta lapangan), fenomena/gejala masalah, penyebab utama, dampak/risiko, dan kebutuhan penelitian. DILARANG menulis sitasi, rujukan penulis-tahun, teori, definisi, atau paragraf naratif di bawah setiap nomor. Field references harus kosong untuk bagian ini. Contoh gaya: 1. Belum tersedia media simulasi serangan DDoS yang aman dan terarah untuk pembelajaran keamanan jaringan.",

            'rumusan_masalah' => "Tulis draf bagian 'Rumusan Masalah' (BAB I) skripsi.
Judul Skripsi: {$title}
Topik: {$topik}
Ketentuan: Awali dengan satu paragraf pembuka singkat: Berdasarkan latar belakang dan identifikasi masalah yang telah diuraikan, maka rumusan masalah dalam penelitian ini adalah sebagai berikut: lalu sajikan pertanyaan penelitian bernomor 1 sampai 3 atau 4. Setiap nomor harus berisi satu kalimat tanya pendek, spesifik, dan langsung berkaitan dengan masalah pada judul. DILARANG membuat paragraf penjelasan panjang di bawah nomor. DILARANG menulis sitasi, teori, atau rujukan penulis-tahun; rumusan masalah adalah daftar pertanyaan penelitian, bukan pembahasan. Field references harus kosong untuk bagian ini. Contoh gaya: 1. Bagaimana merancang media simulasi serangan DDoS yang aman untuk pembelajaran keamanan jaringan?",

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
            $prompt = "{$academicContext}\n\n{$researchFocusContext}\n\n{$activeReferenceContext}\n\nFakultas/Prodi: {$fakultas} / {$prodi}\n" . $prompt;
        
            $prompt .= "\n\nPENTING: Sebelum menulis, pastikan semua paragraf menjawab sub-bab target dan tetap konsisten dengan KONTRAK FOKUS PENELITIAN. Jika instruksi tambahan pengguna meminta hal yang keluar dari judul/topik/metode, sesuaikan agar tetap relevan, jangan mengganti topik. Berikan LANGSUNG isi draf tulisan yang siap disalin tanpa teks sapaan pembuka (seperti 'Halo', 'Berikut adalah draf...') atau teks penutup. Tulis secara mendalam, rapi, dan ilmiah.";
        }

        $additionalPrompt = $request->input('additional_prompt');
        if ($additionalPrompt) {
            $prompt .= "\n\nInstruksi tambahan dari pengguna (HARUS dipenuhi): \"{$additionalPrompt}\"";
        }

        if ($section === 'latar_belakang' || ($section === '__dynamic__' && isset($sectionTitle) && str_contains(strtolower($sectionTitle), 'latar belakang'))) {
            $prompt .= "\n\nATURAN FINAL KHUSUS LATAR BELAKANG: Field content WAJIB berisi tepat 4 alinea utuh sesuai piramida: (1) teori umum/landasan konsep dengan sitasi, (2) permasalahan nyata tanpa teori baru, (3) solusi yang mengaitkan metode dengan sitasi pendukung, (4) pengangkatan judul. Pisahkan alinea dengan karakter newline ganda (\\n\\n). Jangan mengembalikan content satu paragraf panjang. Setiap sitasi yang tertulis dalam content wajib punya pasangan di field references.";
        }

        if ($problemSectionType) {
            $prompt .= "\n\nATURAN FINAL KHUSUS BAGIAN MASALAH/BATASAN: Field content WAJIB diawali satu paragraf pembuka singkat, lalu daftar bernomor. Satu nomor hanya boleh berisi satu kalimat pendek. Jangan menulis paragraf panjang, uraian definisi, teori, sitasi, rujukan penulis-tahun, atau penjelasan tambahan di bawah nomor. Identifikasi masalah berisi garis besar masalah yang teridentifikasi; rumusan masalah berisi pertanyaan penelitian ringkas; batasan masalah berisi ruang lingkup yang dibatasi seperti objek, fitur, data, metode, teknologi, waktu, atau pengujian. Field references WAJIB berupa array kosong [].";
        }
        
        $jsonInstruction = "\n\nPENTING: Anda HARUS mengembalikan respon dalam format JSON yang valid dengan skema berikut:
{
  \"content\": \"Draf teks tulisan skripsi yang lengkap dan mendalam (berisi beberapa paragraf sesuai ketentuan). JANGAN menyertakan format markdown bold/italic seperti **, *, __, _ di dalam teks ini.\",
  \"table\": null,
  \"references\": []
}

Field references WAJIB diisi jika content memuat sitasi, daftar pustaka, kajian teori, penelitian terdahulu, BAB II, atau rujukan akademik apa pun. Prioritaskan PUSTAKA AKTIF DARI MENU PUSTAKA yang sudah diberikan di prompt; jika dipakai dalam content, salin kembali itemnya ke field references agar menu Pustaka tetap tersinkron. Setiap item references harus memakai skema: {\"type\": \"journal/book/proceeding/report\", \"author\": \"Nama penulis\", \"year\": \"2024\", \"title\": \"Judul sumber\", \"publisher\": \"Nama jurnal/penerbit/prosiding, volume(issue), halaman jika ada\", \"url\": \"URL halaman sumber atau PDF\", \"doi\": \"DOI jika ada\"}. Jika pustaka aktif belum cukup, tambahkan sumber tepercaya yang gratis, open access, dan memiliki link PDF langsung dari penerbit resmi, repository kampus, arXiv, DOAJ, PubMed Central, Semantic Scholar, CORE, Garuda, Sinta, Neliti, atau repositori institusi. Jangan mengarang DOI, penulis, judul, tahun, atau URL; jika tidak yakin sumber benar-benar ada, jangan masukkan ke references.

Jika pengguna secara spesifik meminta tabel (misalnya dalam instruksi tambahan) ATAU jika sub-bab ini secara akademis sangat membutuhkan tabel (misalnya jadwal penelitian, perbandingan metode, hasil pengujian, dll.), isi field \"table\" dengan objek dengan skema berikut:
{
  \"title\": \"Judul Tabel (contoh: 'Tabel 3.1 Perbandingan Metode Sistem Pakar')\",
  \"headers\": \"Header kolom dipisahkan koma (contoh: 'No, Metode, Karakteristik, Kelebihan, Kekurangan, Alasan Tidak Dipilih')\",
  \"rows\": [
    [\"1\", \"Metode Utama\", \"Mengolah data sesuai karakteristik penelitian...\", \"Relevan dengan tujuan penelitian\", \"Membutuhkan data/parameter yang valid\", \"Dipilih karena sesuai dengan tujuan dan karakteristik data pada judul penelitian ini...\"],
    [\"2\", \"Forward Chaining\", \"Penelusuran berdasarkan rule IF-THEN...\", \"Mudah dipahami dan diterapkan\", \"Tidak menghasilkan tingkat keyakinan\", \"Kurang sesuai karena penelitian membutuhkan nilai keyakinan...\"]
  ]
}

PENTING: Khusus jika tabel tersebut berupa perbandingan metode atau algoritma sistem pakar/kecerdasan buatan, Anda WAJIB menggunakan kolom-kolom persis seperti di atas:
Headers: No, Metode, Karakteristik, Kelebihan, Kekurangan, Alasan Tidak Dipilih.
Sesuaikan isian barisnya (metode, kelebihan, kekurangan, dan alasan) dengan KONTRAK FOKUS PENELITIAN, Judul Skripsi ('{$title}'), Metode/Algoritma Utama ('{$metode}'), Metode Pengembangan ('{$metodePengembangan}'), dan Metode Pengujian ('{$metodePengujian}') Anda. Untuk metode yang terpilih, jelaskan alasan mengapa ia dipilih (Dipilih karena...). Untuk metode lainnya, jelaskan alasan mengapa tidak dipilih (Kurang sesuai karena...).

Untuk setiap sitasi dalam content, pastikan ada item yang sesuai di references. Jangan menampilkan daftar pustaka di content karena sistem akan memasukkannya ke panel Pustaka otomatis. Sebelum mengembalikan JSON, lakukan pemeriksaan internal: content tidak boleh mengganti judul/topik/metode, tidak boleh memakai studi kasus contoh yang berbeda, dan setiap paragraf harus relevan dengan sub-bab target. Pastikan respon Anda murni merupakan string JSON yang valid agar dapat diproses dengan `json_decode`. Jangan menyertakan teks pembuka atau penutup di luar JSON tersebut.";

        $prompt .= $jsonInstruction;

        try {
            $response = $this->callGeminiJson($apiKey, $prompt);

            if ($response->failed()) {
                $errorMsg = $response->json('error.message') ?? 'Terjadi kesalahan pada server AI.';
                return response()->json(['error' => $errorMsg], 500);
            }

            $resultText = $response->json('candidates.0.content.parts.0.text');
            // Clean up backticks or raw markdown wrappers if Gemini insists on returning them
            $resultText = preg_replace('/^```json\s*|^```html?\s*|\s*```$/i', '', trim($resultText));
            $resultText = trim($resultText);
            
            $jsonData = json_decode($resultText, true);
            if (json_last_error() === JSON_ERROR_NONE && isset($jsonData['content'])) {
                $content = $jsonData['content'];
                $table = $jsonData['table'] ?? null;
                $generatedReferences = $jsonData['references'] ?? [];
            } else {
                // Fallback: treat the entire resultText as content
                $content = $resultText;
                $table = null;
                $generatedReferences = [];
            }
            
            // Clean markdown
            $content = preg_replace('/\*\*([^*]+)\*\*/', '$1', $content);
            $content = preg_replace('/\*([^*]+)\*/', '$1', $content);
            $content = preg_replace('/__([^_]+)__/', '$1', $content);
            $content = preg_replace('/_([^_]+)_/', '$1', $content);
            $content = $this->cleanGeneratedSectionContent($content, $section === '__dynamic__' ? ($sectionTitle ?? '') : '');
            if ($section === 'latar_belakang' || ($section === '__dynamic__' && isset($sectionTitle) && str_contains(strtolower($sectionTitle), 'latar belakang'))) {
                $content = $this->enforceBackgroundParagraphs($content, $aiWriteStyle);
            }
            if ($problemSectionType) {
                $content = $this->enforceProblemPointFormat($content, $problemSectionType);
                $generatedReferences = [];
            }
            
            if ($table && isset($table['headers'])) {
                $table['title'] = preg_replace('/\*\*([^*]+)\*\*/', '$1', $table['title'] ?? '');
                $table['title'] = preg_replace('/\*([^*]+)\*/', '$1', $table['title']);
                $table['headers'] = preg_replace('/\*\*([^*]+)\*\*/', '$1', $table['headers']);
                $table['headers'] = preg_replace('/\*([^*]+)\*/', '$1', $table['headers']);
                if (isset($table['rows']) && is_array($table['rows'])) {
                    foreach ($table['rows'] as &$row) {
                        if (is_array($row)) {
                            foreach ($row as &$cell) {
                                $cell = preg_replace('/\*\*([^*]+)\*\*/', '$1', $cell);
                                $cell = preg_replace('/\*([^*]+)\*/', '$1', $cell);
                            }
                        }
                    }
                }
            }
            
            return response()->json([
                'content' => trim($content),
                'table' => $table,
                'references' => is_array($generatedReferences) ? $generatedReferences : []
            ]);

        } catch (\Exception $e) {
            Log::error('Generate section error: ' . $e->getMessage());
            return response()->json(['error' => 'Koneksi ke API AI gagal: ' . $e->getMessage()], 500);
        }
    }

    public function aiChat(Request $request)
    {
        $request->validate([
            'message' => 'required|string|max:1500',
            'history' => 'nullable|array|max:10',
            'history.*.role' => 'required_with:history|string|in:user,assistant',
            'history.*.content' => 'required_with:history|string|max:1500',
            'title' => 'nullable|string|max:1000',
            'fakultas' => 'nullable|string|max:255',
            'prodi' => 'nullable|string|max:255',
            'topik' => 'nullable|string|max:1000',
        ]);

        $apiKey = $this->getApiKey($request);

        if (!$apiKey) {
            return response()->json(['error' => 'API Key AI tidak ditemukan. Harap masukkan API Key di panel pengaturan AI.'], 400);
        }

        $message = $request->input('message');
        $title = $request->input('title', 'Belum ditentukan');
        $fakultas = $request->input('fakultas', '');
        $prodi = $request->input('prodi', '');
        $topik = $request->input('topik', '');
        $academicContext = $this->buildAcademicContext($fakultas, $prodi);
        $historyText = collect($request->input('history', []))
            ->take(-8)
            ->map(fn ($item) => strtoupper($item['role']) . ': ' . $item['content'])
            ->implode("\n");

        $prompt = "Anda adalah AI Chat khusus untuk membantu mahasiswa menyusun laporan, skripsi, tugas akhir, KP, dan dokumen akademik.

BATASAN WAJIB:
1. Jangan menjawab topik di luar penyusunan laporan akademik. Jika pengguna bertanya di luar topik, tolak singkat dan arahkan kembali ke laporan.
2. Jangan mengarang referensi, nama jurnal, kutipan, standar, atau aturan kampus yang tidak diberikan pengguna. Jika perlu referensi, sarankan pengguna memverifikasi ke pedoman kampus/dosen.
3. Jawab ringkas, praktis, dan bisa langsung dipakai untuk menyusun laporan.
4. Untuk Informatika/SI, pahami SDLC Waterfall/Agile/Prototype/Scrum, APSI, kebutuhan fungsional/non-fungsional, UML, BPMN, Use Case, Activity, Sequence, Class Diagram, ERD, database, dan pengujian.
5. Untuk Teknik Sipil dan Industri, gunakan pendekatan akademik teknik yang relevan dan konservatif; jangan mengklaim berasal dari UI/UGM/UNPAD/ITB/ITS kecuali pengguna memberi dokumen spesifik.

{$academicContext}

Konteks dokumen:
Judul: {$title}
Fakultas/Prodi: {$fakultas} / {$prodi}
Topik: {$topik}

Riwayat percakapan terbaru:
{$historyText}

Pertanyaan pengguna:
{$message}

Kembalikan JSON valid: {\"content\":\"jawaban chat dalam bahasa Indonesia\"}";

        try {
            $response = $this->callGeminiJson($apiKey, $prompt);

            if ($response->failed()) {
                $errorMsg = $response->json('error.message') ?? 'Terjadi kesalahan pada server AI.';
                return response()->json(['error' => $errorMsg], 500);
            }

            $resultText = $response->json('candidates.0.content.parts.0.text');
            $data = json_decode($resultText, true);

            if (json_last_error() !== JSON_ERROR_NONE || !isset($data['content'])) {
                return response()->json(['error' => 'Gagal mengurai respon dari AI Chat. Silakan coba lagi.'], 500);
            }

            return response()->json(['content' => $data['content']]);
        } catch (\Exception $e) {
            Log::error('AI chat error: ' . $e->getMessage());
            return response()->json(['error' => 'Koneksi ke API AI gagal: ' . $e->getMessage()], 500);
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

        return $this->persistDraftData(
            $request->input('filename'),
            $request->input('draft_data')
        );
    }

    /**
     * Save a large draft through small chunks so it is not blocked by PHP post_max_size.
     */
    public function saveDraftChunk(Request $request)
    {
        $request->validate([
            'filename' => 'required|string|max:255',
            'upload_id' => 'required|string|max:80|regex:/^[A-Za-z0-9_-]+$/',
            'chunk_index' => 'required|integer|min:0',
            'total_chunks' => 'required|integer|min:1|max:500',
            'chunk' => 'required|string',
        ]);

        $filename = $request->input('filename');
        $uploadId = $request->input('upload_id');
        $chunkIndex = (int) $request->input('chunk_index');
        $totalChunks = (int) $request->input('total_chunks');
        $chunk = $request->input('chunk');

        if ($chunkIndex >= $totalChunks) {
            return response()->json([
                'success' => false,
                'message' => 'Urutan chunk draft tidak valid.'
            ], 422);
        }

        $chunkDir = "thesis_draft_chunks/{$uploadId}";
        Storage::put("{$chunkDir}/{$chunkIndex}.part", $chunk);

        $storedChunks = Storage::files($chunkDir);
        if (count($storedChunks) < $totalChunks) {
            return response()->json([
                'success' => true,
                'complete' => false,
                'message' => 'Chunk draft diterima.',
                'chunk_index' => $chunkIndex,
                'total_chunks' => $totalChunks,
            ], 202);
        }

        $json = '';
        for ($i = 0; $i < $totalChunks; $i++) {
            $chunkPath = "{$chunkDir}/{$i}.part";
            if (!Storage::exists($chunkPath)) {
                return response()->json([
                    'success' => false,
                    'message' => "Chunk draft ke-{$i} belum lengkap."
                ], 422);
            }
            $json .= Storage::get($chunkPath);
        }

        Storage::deleteDirectory($chunkDir);

        $draftData = json_decode($json, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($draftData)) {
            return response()->json([
                'success' => false,
                'message' => 'Draft besar gagal dirakit. Data JSON tidak valid.'
            ], 422);
        }

        return $this->persistDraftData($filename, $draftData, true);
    }

    private function persistDraftData(string $filename, array $draftData, bool $chunked = false)
    {
        // Clean filename for safety
        $safeFilename = Str::slug($filename, '_') ?: 'draft_skripsi';

        $jsonDraft = json_encode($draftData, JSON_PRETTY_PRINT);
        if ($jsonDraft === false) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengubah draft menjadi JSON.'
            ], 422);
        }

        // 1. Save to File Storage as Backup
        try {
            Storage::put("thesis_drafts/{$safeFilename}.json", $jsonDraft);
            $fileSaved = true;
        } catch (\Exception $e) {
            Log::error('File save failed: ' . $e->getMessage());
            $fileSaved = false;
        }

        // 2. Save to Database - keyed by the user's filename (slug) so each named
        // draft maps to exactly one row, regardless of cover title changes.
        $dbSaved = false;
        try {
            ThesisDraft::updateOrCreate(
                ['slug' => $safeFilename],
                [
                    'title' => $draftData['cover']['title'] ?? 'Untitled',
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
                'message' => 'Draft berhasil disimpan ' . ($dbSaved ? 'ke Database' : '') . ($fileSaved ? ' dan Penyimpanan Lokal' : '') . ($chunked ? ' (mode chunk untuk draft besar)' : '') . '.',
                'filename' => $safeFilename,
                'slug' => $safeFilename,
                'save_mode' => $chunked ? 'chunked' : 'direct',
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
                    'slug' => $d->slug,
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

        // Collect DB slugs so file entries that already exist as DB rows are not shown twice
        $dbSlugs = $drafts->pluck('slug')->filter()->values()->all();

        // 2. Load from File Storage fallback (skip files that already exist as a DB draft)
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
                    'slug' => $filename,
                    'title' => Str::limit($title, 60),
                    'author' => $author,
                    'updated_at' => date('Y-m-d H:i', $lastModified),
                    'source' => 'file',
                    'key' => 'file_' . $filename
                ];
            })->filter(function($f) use ($dbSlugs) {
                return !in_array($f['slug'], $dbSlugs);
            });
            $drafts = $drafts->merge($fileDrafts);
        } catch (\Exception $e) {
            Log::error('Failed loading drafts from storage: ' . $e->getMessage());
        }

        // Show every distinct saved draft (unique DB row / file slug)
        return response()->json($drafts->unique('key')->values());
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
                    // Also remove the matching file backup so it doesn't reappear in the list
                    $slug = $draft->slug ?: Str::slug($draft->title ?? '', '_');
                    if ($slug) {
                        $filePath = "thesis_drafts/{$slug}.json";
                        if (Storage::exists($filePath)) {
                            Storage::delete($filePath);
                        }
                    }
                    $draft->delete();
                    $deleted = true;
                }
            } catch (\Exception $e) {
                Log::error('DB delete failed: ' . $e->getMessage());
            }
        } else {
            try {
                // 'file' source: $id is the filename (slug)
                $filePath = "thesis_drafts/{$id}.json";
                if (Storage::exists($filePath)) {
                    Storage::delete($filePath);
                    $deleted = true;
                }
                // Also remove any DB rows tied to this same slug so it's fully gone
                $rows = ThesisDraft::where('slug', $id)->get();
                foreach ($rows as $row) {
                    $row->delete();
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
            'year_start' => 'nullable|integer',
            'year_end' => 'nullable|integer',
        ]);

        $apiKey = $this->getApiKey($request);

        if (!$apiKey) {
            return response()->json([
                'error' => 'API Key AI tidak ditemukan. Harap masukkan API Key di panel pengaturan AI.'
            ], 400);
        }

        $query = $request->input('query');
        $yearStart = $request->input('year_start') ?? (date('Y') - 10);
        $yearEnd = $request->input('year_end') ?? date('Y');

        $prompt = "Anda adalah pencari sitasi akademis. Cari referensi akademis nyata yang menyerupai pencarian di Google Scholar atau ResearchGate berdasarkan kata kunci berikut: \"{$query}\".
        
Referensi yang Anda kembalikan HARUS dipublikasikan antara tahun {$yearStart} sampai {$yearEnd} (inklusif). 

Berikan 2 alternatif referensi ilmiah nyata (misalnya satu format buku dan satu format jurnal ilmiah jika memungkinkan) yang sesuai. Lengkapi dengan detail asli seperti nama penulis, tahun publikasi (harus berada dalam rentang {$yearStart}-{$yearEnd}), judul publikasi, penerbit/kota, atau nama jurnal beserta Volume, Nomor, dan Halaman.

PENTING: Setiap referensi HARUS menyertakan tautan/URL asli yang valid dan dapat diakses (misalnya dari researchgate.net, scholar.google.com, sciencedirect.com, ieeexplore.ieee.org, atau repository universitas terpercaya) yang mengarah ke publikasi tersebut atau file PDF unduhannya. Masukkan tautan ini pada atribut \"url\" di bawah.

PENTING: Anda harus mengembalikan respon dalam format JSON array yang valid tanpa markup markdown atau teks lainnya. Struktur JSON harus persis seperti di bawah ini:
[
  {
    \"author\": \"Nama Penulis (contoh: Sugiyono, A. atau DeLone, W. H., & McLean, E. R.)\",
    \"year\": \"Tahun Publikasi (contoh: 2018)\",
    \"type\": \"book\" atau \"journal\" atau \"website\",
    \"title\": \"Judul Buku atau Artikel Jurnal\",
    \"publisher\": \"Penerbit & Kota (untuk buku) ATAU Nama Jurnal, Volume(Nomor), Halaman (untuk jurnal) (contoh: Alfabeta, Bandung atau MIS Quarterly, 27(1), 9-30)\",
    \"source\": \"Google Scholar\" atau \"ResearchGate\",
    \"url\": \"Tautan/URL lengkap yang valid dan dapat diakses langsung untuk melihat/mengunduh PDF (contoh: https://www.researchgate.net/profile/Delone/publication/220272097_The_DeLone_and_McLean_Model_of_Information_Systems_Success_A_Ten-Year_Update/links/54e76a6e0cf27a6de10cdbb8.pdf)\"
  },
  ...
]";

        try {
            $response = $this->callGeminiJson($apiKey, $prompt);

            if ($response->failed()) {
                $errorMsg = $response->json('error.message') ?? 'Terjadi kesalahan pada server AI.';
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
            return response()->json(['error' => 'Koneksi ke API AI gagal: ' . $e->getMessage()], 500);
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

                $response = $this->postGemini($apiKey, [
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
                    $errorMsg = $response->json('error.message') ?? 'Terjadi kesalahan pada server AI.';
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

                $response = $this->postGemini($apiKey, [
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
        
        // 1. Try to extract UTF-16LE text blocks (common in binary .doc Word 97-2003 files)
        // Match printable ASCII, Latin-1 Supplement, and common control characters (CR, LF, Tab) followed by \x00
        preg_match_all('/(?:[\x09\x0A\x0D\x20-\x7E\xA0-\xFF]\x00){4,}/', $fileData, $utf16Matches);
        $extractedText = '';
        if (!empty($utf16Matches[0])) {
            foreach ($utf16Matches[0] as $match) {
                $converted = mb_convert_encoding($match, 'UTF-8', 'UTF-16LE');
                $extractedText .= $converted . "\n";
            }
        }
        
        // 2. Try to extract ANSI/ASCII text blocks
        preg_match_all('/[\x09\x0A\x0D\x20-\x7E\xA0-\xFF]{4,}/', $fileData, $ansiMatches);
        if (!empty($ansiMatches[0])) {
            foreach ($ansiMatches[0] as $match) {
                // Ignore matching binary headers/metadata structures
                if (!preg_match('/^(?:Microsoft|WordDocument|SummaryInformation|DocumentSummary|CompObj|ObjectPool|MSWordDoc|Word\.Document)/i', $match)) {
                    $extractedText .= $match . "\n";
                }
            }
        }
        
        // Clean up common OLE2 binary metadata words
        $garbage = [
            'WordDocument', 'SummaryInformation', 'DocumentSummaryInformation',
            'CompObj', 'ObjectPool', 'Microsoft Word', 'MSWordDoc', 'Word.Document.8'
        ];
        foreach ($garbage as $word) {
            $extractedText = str_ireplace($word, '', $extractedText);
        }
        
        // Normalize line breaks and spaces
        $extractedText = preg_replace('/[ \t]+/', ' ', $extractedText);
        $extractedText = preg_replace('/\n+/', "\n", $extractedText);
        
        return trim($extractedText);
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
