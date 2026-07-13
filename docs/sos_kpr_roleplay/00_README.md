# SOS KPR Subsidi AI Roleplay — Knowledge & Implementation Pack

## Tujuan

Paket ini mengubah materi **Solution Oriented Selling (SOS)** menjadi spesifikasi yang dapat digunakan AI coding agent untuk mengembangkan aplikasi roleplay sales rumah subsidi yang sudah ada.

Paket ini dirancang untuk tiga fungsi:

1. Menjadi knowledge base bagi AI customer persona.
2. Menjadi standar evaluasi performa sales.
3. Menjadi spesifikasi implementasi bagi coding agent.

## Prinsip Utama

Framework utama tetap mengikuti struktur SOS:

1. Prospecting
2. Approaching
3. Probing
4. Presenting Solution
5. Handling Objection
6. Negotiation
7. Closing
8. Maintaining / After Sales

Framework pendukung:

- **SPIN** digunakan sebagai metode menggali kebutuhan.
- **HOME** digunakan sebagai checklist data kelayakan rumah subsidi.
- **FAB** digunakan untuk menyampaikan solusi.
- **BATNA, Possible, Target, Critical** digunakan untuk negosiasi.
- **Buying signals** digunakan untuk menentukan waktu closing.

## Batasan Penting

Knowledge base ini tidak boleh dianggap sebagai sumber hukum atau regulasi pemerintah terbaru.

Semua nilai numerik, batas penghasilan, syarat dokumen, ketentuan bank, subsidi, biaya, bonus, dan SOP proyek harus berasal dari:

- konfigurasi admin;
- database produk;
- SOP perusahaan;
- aturan bank yang aktif;
- regulasi pemerintah yang telah diverifikasi.

AI tidak boleh mengarang aturan.

## Struktur Paket

- `01_DOMAIN_MODEL.md`
- `02_SOS_FRAMEWORK.md`
- `03_SPIN_HOME_PROBING.md`
- `04_FAB_PRESENTATION.md`
- `05_OBJECTION_HANDLING.md`
- `06_NEGOTIATION.md`
- `07_CLOSING_AND_AFTER_SALES.md`
- `08_PERSONA_SCHEMA.md`
- `09_SCENARIO_SCHEMA.md`
- `10_ROLEPLAY_ENGINE_RULES.md`
- `11_EVALUATION_RUBRIC.md`
- `12_EVENT_AND_STATE_MODEL.md`
- `13_IMPLEMENTATION_PLAN.md`
- `14_AGENT_PROMPT.md`

## Definition of Done

Implementasi dianggap berhasil bila aplikasi dapat:

- menjalankan roleplay suara atau teks;
- membuat AI berperan konsisten sebagai prospek;
- menyembunyikan informasi tertentu sampai sales bertanya;
- melacak tahapan SOS dan SPIN;
- mendeteksi objection, buying signal, dan closing attempt;
- mengevaluasi sales berdasarkan bukti percakapan;
- membedakan fakta produk, SOP perusahaan, dan regulasi;
- menghasilkan skor, ringkasan, kekuatan, kelemahan, dan saran latihan;
- mendukung penambahan persona dan skenario dari panel admin.
