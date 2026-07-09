# Plan: Localize UI to Indonesian (with English sales terms)

## Goal
Convert all user-facing UI text to Bahasa Indonesia. Keep frequently-used English sales/tech terms as-is: `Mission`, `Skill`, `Score`, `Grade`, `Dashboard`, `Profile`, `Settings`, `Training`, `XP`, `AI`, `Goal`, `Objective`, `Review`, `Edit`, `Delete`, `Save`, `Search`, `Filter`.

Already-Indonesian components (Dashboard, CreateScenarioModal, AllScenariosModal, CompleteProfileModal, FrustrationMeter, ScenarioCard, ScenarioBriefing, etc.) are left as-is since they already follow the desired pattern.

## Files to Modify (26 files)

### Navigation & Layout
| File | Change |
|------|--------|
| `components/layout/Sidebar.tsx` | `"Internal Hub"` → `"Internal Training"` |

### Main Screens — `app/page.tsx`
- Line 490: `"Loading..."` → `"Memuat..."`
- Line 542: `"AI Roleplay Training"` → keep
- Line 544-546: `"AI Consumer Status:"` → `"Status AI Consumer:"`, `"Online"` → keep
- Lines 553-556: `"Total Sims"`, `"Top Sales"`, `"Scenarios"`, `"Win Rate"` → keep
- Line 575: `"Dismiss notification"` → `"Tutup notifikasi"`
- Line 582: `"Scenario Library"` → `"Library Skenario"`
- Line 589: `"BUAT MISSION"` → keep (already Indo + English mix)
- Line 596: `"VIEW ALL"` → `"LIHAT SEMUA"`
- Lines 603-605: `"No Scenarios Yet"` → `"Belum Ada Skenario"`, description → `"Buat skenario training pertama Anda untuk memulai simulasi roleplay berbasis AI."`
- Line 612: `"Create Scenario"` → `"Buat Skenario"`
- Lines 663-666: `"Delete Scenario?"` → `"Hapus Skenario?"`, `"This scenario will be removed..."` → `"Skenario ini akan dihapus dari library training. Tindakan ini tidak bisa dibatalkan."`, `"Delete"` → `"Hapus"`, `"Cancel"` → `"Batal"`
- Lines 686-693: `"START MISSION"` → `"MULAI Mission"`, `"Ready to start this mission, {name}?"` → `"Siap memulai mission ini, {name}?"`, `"START CALL"` → `"MULAI Panggilan"`
- Lines 749-752: same as 663-666
- Line 791: `"Mission Complete"` → `"Mission Selesai"`
- Line 799: `"Processing transcript..."` → `"Memproses transkrip..."`
- Line 807: `"Analyzing communication..."` → `"Menganalisis komunikasi..."`
- Line 815: `"Generating mission report..."` → `"Menyusun laporan mission..."`
- Notification messages: `"Only admins can save scenarios."` → `"Hanya admin yang bisa menyimpan skenario."`, `"Please login first to save scenarios."` → `"Silakan login terlebih dahulu."`, `"Only admins can delete scenarios."` → `"Hanya admin yang bisa menghapus skenario."`, `"Scenario deleted successfully!"` → `"Skenario berhasil dihapus!"`, `"Failed to delete scenario: "` → `"Gagal menghapus skenario: "`, `"Only admins can edit scenarios."` → `"Hanya admin yang bisa mengedit skenario."`, `"Login error: "` → `"Error login: "`

### `components/CallInterface.tsx`
- Line 42: `"Customer hung up due to frustration!"` → `"Pelanggan menutup telepon karena frustrasi!"`
- Lines 251, 260: keep as-is (error messages, fine as English)
- Lines 469-484: Error messages → translate all to Indonesian (already partially done, standardize)
- Lines 521-526: `"Connecting..."` → `"Menghubungkan..."`, `"Connected • Ready"` → `"Terhubung • Siap"`, `"AI Speaking"` → `"AI Berbicara"`, `"Connection Lost"` → `"Koneksi Hilang"`, `"Call Error"` → `"Error Panggilan"`, `"Call Ended"` → `"Panggilan Selesai"`
- Line 553: `"Reconnecting to Gemini Live..."` → `"Menghubungkan ulang ke Gemini Live..."`, `"Connecting to Gemini Live..."` → `"Menghubungkan ke Gemini Live..."`
- Line 559: `"Gemini Live connection lost. Your transcript is preserved."` → `"Koneksi Gemini Live terputus. Transkrip Anda tetap aman."`
- Line 562: `"Reconnect"` → `"Hubungkan Ulang"`
- Line 565: `"End & Analyze"` → `"Akhiri & Analisis"`
- Line 573: `"AI"` → keep
- Line 629: `"Live Transcript"` → `"Transkrip Live"`
- Line 632: `"Waiting for conversation..."` → `"Menunggu percakapan..."`
- Line 657: `"Unmute microphone"` → `"Aktifkan mikrofon"`, `"Mute microphone"` → `"Nonaktifkan mikrofon"`
- Line 665: `"End call"` → `"Akhiri panggilan"`
- Lines 678-681: `"End Call?"` → `"Akhiri Panggilan?"`, message → `"Yakin ingin mengakhiri panggilan? Analisis akan dibuat berdasarkan percakapan sejauh ini."`, `"End Call"` → `"Akhiri Panggilan"`, `"Continue Call"` → `"Lanjutkan Panggilan"`
- Line 691: `"ENCRYPTED AI CALL"` → keep
- Line 699-701: `"FORCE EXIT"` → `"KELUAR PAKSA"`
- Line 609: `"TALKING..."` → `"BERBICARA..."`

### `components/FeedbackView.tsx`
- Lines 103-104: Error messages → `"Server sedang sibuk. Silakan tunggu sebentar dan coba lagi."`, `"Gagal menganalisis performa. Silakan coba lagi."`
- Line 137: `"Analyzing Sales Tactics..."` → `"Menganalisis Taktik Sales..."`
- Line 140: `"Saving transcript and evaluating performance benchmarks."` → `"Menyimpan transkrip dan mengevaluasi benchmark performa."`
- Line 152: `"Analysis Unavailable"` → `"Analisis Tidak Tersedia"`
- Line 161: `"Retry Analysis"` → `"Coba Analisis Ulang"`
- Line 167: `"Back to Dashboard"` → `"Kembali ke Dashboard"`
- Line 186: `"MISSION REPORT"` → `"LAPORAN Mission"`
- Line 192: `"Analysis Summary"` → `"Ringkasan Analisis"`
- Line 201: `"Transcript is very short ({n} exchanges). Analysis may be less accurate than usual."` → `"Transkrip sangat pendek ({n} pertukaran). Analisis mungkin kurang akurat."`
- Line 210: `"Final Score"` → `"Score Akhir"`
- Lines 219-220: `"Mission Debrief"` → `"Debrief Mission"`
- Line 237: `"Main Menu"` → `"Menu Utama"`
- Line 249: `"Strengths"` → `"Kekuatan"`
- Line 265: `"Areas to Improve"` → `"Area yang Perlu Ditingkatkan"`
- Line 281: `"Closing Tips"` → `"Tips Closing"`
- Line 299: `"Skill Breakdown"` → `"Rincian Skill"`
- Line 324: `"Suggested Better Responses"` → `"Respon yang Disarankan"`

### `components/ChatInterface.tsx`
- Line 134: Error message → `"Maaf, saya mengalami kendala. Silakan coba lagi."`
- Line 154: `"Status: Active Negotiation"` → `"Status: Negosiasi Aktif"`
- Line 166: `"END SESSION"` → `"AKHIRI Sesi"`
- Line 180: `"Your turn to start the conversation..."` → `"Giliran Anda untuk memulai percakapan..."`
- Line 212: `"Typing..."` → `"Mengetik..."`
- Line 221: `"Hint: Focus on Goal — {target}"` → `"Tips: Fokus pada Goal — {target}"`
- Line 229: `"Start by greeting the customer..."` → `"Mulai dengan menyapa pelanggan..."`, `"Type your response here..."` → `"Ketik respon Anda di sini..."`
- Line 242: `"v2.5 TRAINING HUB"` → keep
- Lines 249-252: `"End Session?"` → `"Akhiri Sesi?"`, message → `"Yakin ingin mengakhiri sesi ini? Analisis akan dibuat berdasarkan percakapan sejauh ini."`, `"End Session"` → `"Akhiri Sesi"`, `"Continue"` → `"Lanjutkan"`

### `components/TrainingScreen.tsx`
- Lines 26-27: Module descriptions → translate
- Line 97: `"Training Module"` → keep
- Line 100: `"Choose what skill to drill next."` → `"Pilih skill yang ingin Anda latih selanjutnya."`
- Line 103: `"Practice focused sales conversations, then jump into a live AI roleplay mission."` → `"Latih percakapan sales yang fokus, lalu langsung terjun ke mission roleplay AI live."`
- Lines 108-110: Metric labels → keep (`"Missions"`, `"Best"`, `"Library"`)
- Line 117: `"Skill Tracks"` → keep
- Line 118: `"4 modules"` → `"4 modul"`
- Line 144: `"Recommended Next"` → keep
- Line 145: `"Based on incomplete missions"` → `"Berdasarkan mission yang belum selesai"`
- Line 165: `"Scenario Library"` → `"Library Skenario"`
- Line 166: `"Filter missions by topic, persona, or difficulty."` → `"Filter mission berdasarkan topik, persona, atau kesulitan."`
- Line 174: `"Search scenario..."` → `"Cari skenario..."`
- Lines 183-186: `"All"` → `"Semua"`
- Line 190: `"New"` → `"Baru"`
- Line 198: `"No matching training scenario found."` → `"Tidak ada skenario training yang cocok."`

### `components/ProfileScreen.tsx`
- Line 34: `"Profile"` → keep
- Line 36: `"Account identity, progress, and training rank."` → `"Identitas akun, progress, dan rank training."`
- Line 64: `"Current Rank"` → keep
- Line 75: `"Progress"` → keep
- Line 76: `"XP and performance summary"` → keep
- Lines 94-97: `"Avg Score"` → keep, `"Best Score"` → keep, `"Streak"` → keep
- Line 103: `"achievements unlocked"` → `"pencapaian terbuka"`
- Line 104: `"Keep training to unlock more badges and XP rewards."` → `"Terus latih untuk membuka lebih banyak badge dan reward XP."`

### `components/SettingsScreen.tsx`
- Line 27: `"Current app preferences and AI runtime configuration."` → `"Preferensi aplikasi dan konfigurasi runtime AI."`
- Line 39: `"Read-only view. Admins can edit from Admin Settings."` → `"Tampilan read-only. Admin dapat mengedit dari Admin Settings."`
- Lines 44-49: Info row labels → keep
- Line 58: `"Admin Controls"` → keep
- Line 60: `"Scenario, persona, and AI configuration live in the admin panel."` → `"Konfigurasi skenario, persona, dan AI ada di admin panel."`
- Line 70: `"Open Admin Panel"` → `"Buka Admin Panel"`
- Line 75: `"Admin access is required to change global settings."` → `"Akses admin diperlukan untuk mengubah pengaturan global."`
- Line 81: `"Progress and sessions sync automatically via Firebase."` → `"Progress dan sesi sinkron otomatis via Firebase."`

### `components/LoginScreen.tsx`
- Line 82: `"SalesLab"` → keep, `"Internal Hub"` → `"Internal Training"`
- Line 90: `"AI Roleplay Training Simulator"` → keep
- Line 106: `"CONNECTING..."` → `"MENGHUBUNGKAN..."`
- Line 116: `"SIGN IN WITH GOOGLE"` → `"MASUK DENGAN GOOGLE"`
- Line 122: `"Internal Company Tool — Authorized Users Only"` → `"Internal Company Tool — Hanya untuk Pengguna Berwenang"`

### `components/ConfirmDialog.tsx`
- Lines 23-24: `"Confirm"` → `"Konfirmasi"`, `"Cancel"` → `"Batal"`

### `components/StreakDisplay.tsx`
- Line 29: `"STREAK"` → keep
- Line 37: `"days"` → `"hari"`
- Line 43: `"Start a mission to begin your streak!"` → `"Mulai mission untuk memulai streak Anda!"`
- Line 50: `"Best: {n} days"` → `"Terbaik: {n} hari"`

### `components/SyncIndicator.tsx`
- Line 24: `"Syncing..."` → `"Menyinkronkan..."`
- Line 32: `"Synced"` → `"Tersinkronisasi"`
- Line 40: `"Offline"` → `"Offline"`
- Line 48: `"Sync Error"` → `"Error Sinkronisasi"`

### `components/XpBar.tsx`
- Line 37: `"{xpCurrent} / {xpNext} XP"` → keep
- Line 43: `"{progress}% to next level"` → `"{progress}% ke level berikutnya"`

### `components/MissionHistory.tsx`
- Line 48: `"Mission History"` → keep
- Line 50: `"Review all your completed training missions"` → `"Tinjau semua mission training yang sudah selesai"`
- Line 60: `"Search by name..."` → `"Cari berdasarkan nama..."`
- Lines 71-74: `"All Difficulties"` → `"Semua Kesulitan"`
- Lines 81-84: `"All Scores"` → `"Semua Score"`, `"High (80+)"` → keep, `"Medium (60-79)"` → keep, `"Low (below 60)"` → keep
- Lines 92-110: Metric labels → keep English
- Line 122: `"No mission history yet"` → `"Belum ada riwayat mission"`
- Line 124: `"Complete your first call to generate a report."` → `"Selesaikan panggilan pertama Anda untuk menghasilkan laporan."`
- Lines 132-136: Table headers → keep English
- Line 162: `"Review"` → keep
- Line 188: `"Mission Report"` → `"Laporan Mission"`
- Line 211: `"Overall Score"` → keep

### `components/PerformanceScreen.tsx`
- Line 95: `"Performance"` → keep
- Line 97: `"Track your progress and skill growth over time"` → `"Lacak progress dan pertumbuhan skill Anda dari waktu ke waktu"`
- Line 108: `"No performance data yet"` → `"Belum ada data performa"`
- Line 110: `"Complete training missions to build your performance profile."` → `"Selesaikan mission training untuk membangun profile performa Anda."`
- Lines 119-143: Metric labels → keep English
- Line 151: `"Score Distribution"` → keep
- Lines 173-176: `"Strongest Skills"` → keep, `"Not enough data yet"` → `"Belum cukup data"`
- Lines 191-194: `"Needs Improvement"` → keep, `"All skills are doing well!"` → `"Semua skill baik-baik saja!"`
- Line 213: `"Recent Scores"` → keep

### `components/PerformanceDashboard.tsx`
- Line 95: `"PERFORMANCE OVERVIEW"` → `"IKHTISAR PERFORMANCE"`
- Line 99: `"No missions completed yet. Start your first mission to see your performance."` → `"Belum ada mission yang selesai. Mulai mission pertama Anda untuk melihat performa."`
- Lines 112-114: `"▲ Improving"` → keep, `"▼ Declining"` → keep, `"— Stable"` → keep
- Line 127: `"Performance Overview"` → `"Ikhtisar Performance"`
- Lines 138-168: Stat labels → keep English
- Line 184: `"Score Distribution"` → keep
- Line 212: `"Recent Missions"` → keep

### `components/AchievementsScreen.tsx`
- Line 80: `"Achievements"` → `"Pencapaian"`
- Line 82: `"Unlock badges and earn XP as you improve"` → `"Buka badge dan dapatkan XP seiring peningkatan Anda"`
- Lines 96-104: Labels → `"Achievements Unlocked"` → `"Pencapaian Terbuka"`, `"Total XP Earned"` → keep, `"Missions Completed"` → keep
- Line 149: `"Progress"` → keep

### `components/ScenarioBriefing.tsx`
- Line 39: `"Mission Briefing"` → keep
- Lines 67-68: `"Objective"` → keep
- Lines 78-94: Persona labels → keep
- Lines 105-106: `"Success Criteria"` → keep
- Lines 109-114: Criteria items → translate: `"Understand the customer's main concern"` → `"Pahami kekhawatiran utama pelanggan"`, `"Build rapport and trust"` → `"Bangun rapport dan kepercayaan"`, `"Present relevant solutions"` → `"Sajikan solusi yang relevan"`, `"Handle objections professionally"` → `"Tangani objection secara profesional"`, `"Close with clear next steps"` → `"Tutup dengan langkah selanjutnya yang jelas"`
- Line 128: `"Tip:"` → `"Tip:"`, `"Focus on discovery questions first. Let the customer speak — your job is to guide, not dominate."` → `"Fokus pada pertanyaan discovery terlebih dahulu. Biarkan pelanggan berbicara — tugas Anda adalah memandu, bukan mendominasi."`
- Line 138: `"START CALL"` → `"MULAI Panggilan"`

### `components/Header.tsx`
- Line 28: `"Close navigation menu"` → `"Tutup menu navigasi"`, `"Open navigation menu"` → `"Buka menu navigasi"`
- Line 44: `"day streak"` → `"hari streak"`
- Line 74: `"Logout"` → `"Keluar"`

### `components/AppLayout.tsx`
- Line 56: `"Skip to Content"` → `"Langsung ke Konten"`

### Admin components — `components/admin/`
- `AdminLayout.tsx`: `"Dashboard"`, `"Scenarios"`, `"Personas"`, `"AI Settings"` → keep English; `"← Back to App"` → `"← Kembali ke App"`
- `AdminDashboard.tsx`: Metric labels → keep English (Total Users, Sessions Today, Avg Score, etc.)
- `ScenarioList.tsx`: `"Search scenarios..."` → `"Cari skenario..."`, `"New Scenario"` → `"Skenario Baru"`, table headers → keep English; `"No scenarios found"` → `"Tidak ada skenario"`
- `ScenarioBuilder.tsx`: Already mostly in Indonesian, keep as-is
- `PersonaList.tsx`: `"Search personas..."` → `"Cari persona..."`, `"New Persona"` → `"Persona Baru"`, `"No personas found. Create one to get started."` → `"Tidak ada persona. Buat satu untuk memulai."`
- `PersonaBuilder.tsx`: Already partially Indonesian, keep as-is
- `AISettings.tsx`: `"Settings saved successfully!"` → `"Settings berhasil disimpan!"`, `"Failed to save settings."` → `"Gagal menyimpan settings."`, `"Connection Note:"` → `"Catatan Koneksi:"`, `"Gemini is configured via environment variables. No additional setup needed."` → `"Gemini dikonfigurasi via environment variables. Tidak perlu setup tambahan."`; buttons: `"SAVING..."` → `"MENYIMPAN..."`, `"SAVE SETTINGS"` → `"SIMPAN SETTINGS"`

### `components/Dashboard.tsx` — already mostly Indonesian, leave as-is
### `components/AdminPanel.tsx` — already mixed, leave as-is

## Execution Order
1. Navigation & layout (Sidebar, MobileNav, Header, AppLayout)
2. LoginScreen, CompleteProfileModal
3. app/page.tsx (main dashboard)
4. TrainingScreen, ProfileScreen, SettingsScreen
5. CallInterface, ChatInterface
6. FeedbackView, MissionHistory
7. ScenarioCard, ScenarioBriefing, ConfirmDialog, StreakDisplay, SyncIndicator, XpBar
8. AchievementsScreen, PerformanceScreen, PerformanceDashboard
9. Admin components
10. `npx next build` to verify

## Build Verification
After all changes, run `npx next build` and fix any TypeScript errors.