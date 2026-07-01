import { GoogleGenAI } from "@google/genai";
import { getSettings } from "./firebase";
import { callOllama, OllamaMessage } from "./ollama";

let genAI: GoogleGenAI | null = null;

export async function getGenAI() {
  if (!genAI) {
    const { GoogleGenAI } = await import("@google/genai");
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("NEXT_PUBLIC_GEMINI_API_KEY is not set. Please set it in your environment variables.");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

export interface SalesScenario {
  id: string;
  title: string;
  description: string;
  target: string;
  consumerProfile: string;
  difficulty: "Easy" | "Medium" | "Hard";
  icon: string;
  name: string;
  gender: "Pria" | "Wanita";
  aggressiveness: number; // 1-10
  patience: number; // 1-10
  responseStyle: "To the point" | "Banyak Tanya" | "Ragu-ragu" | "Cerewet";
  firstSpeaker: "AI" | "Sales";
}

export const SCENARIOS: SalesScenario[] = [
  {
    id: "kpr-subsidi-bi-checking",
    title: "BI Checking Bermasalah",
    description: "Bantu calon pembeli yang takut nggak lolos BI Checking karena ada cicilan motor macet.",
    target: "Bikin dia mau kumpulin berkas buat pre-check.",
    consumerProfile: "Khawatir banget, skeptis sama bank, butuh rumah buru-buru buat keluarga.",
    difficulty: "Medium",
    icon: "ShieldAlert",
    name: "Pak Bambang",
    gender: "Pria",
    aggressiveness: 4,
    patience: 6,
    responseStyle: "Ragu-ragu",
    firstSpeaker: "AI",
  },
  {
    id: "dp-berat",
    title: "DP Keberatan",
    description: "Closing-in calon pembeli yang ngerasa DP 10-20 juta itu terlalu berat buat dia.",
    target: "Closing booking fee di tempat.",
    consumerProfile: "Kerja pabrik, gaji UMR, tabungan pas-pasan banget tapi pengen punya rumah.",
    difficulty: "Hard",
    icon: "Wallet",
    name: "Mas Agus",
    gender: "Pria",
    aggressiveness: 3,
    patience: 4,
    responseStyle: "To the point",
    firstSpeaker: "AI",
  },
  {
    id: "lokasi-jauh",
    title: "Lokasi Kejauhan",
    description: "Yakinin orang yang komplain lokasi perumahan subsidi kita kejauhan dari tempat kerja.",
    target: "Bikin dia mau survey lokasi minggu ini.",
    consumerProfile: "Capek di jalan, nyari yang strategis tapi budget-nya cuma masuk di subsidi.",
    difficulty: "Medium",
    icon: "MapPin",
    name: "Mbak Sirah",
    gender: "Wanita",
    aggressiveness: 6,
    patience: 5,
    responseStyle: "Cerewet",
    firstSpeaker: "Sales",
  },
  {
    id: "kualitas-bangunan",
    title: "Kualitas Bangunan",
    description: "Jelasin soal spek bangunan subsidi yang sering dianggap 'asal-asalan' sama calon pembeli.",
    target: "Bangun trust dan lanjut ke proses berkas.",
    consumerProfile: "Kritis, perfeksionis, trauma liat rumah subsidi temennya yang retak-retak.",
    difficulty: "Hard",
    icon: "Home",
    name: "Ibu Ratna",
    gender: "Wanita",
    aggressiveness: 8,
    patience: 3,
    responseStyle: "Banyak Tanya",
    firstSpeaker: "AI",
  }
];

export async function getConsumerResponse(
  scenario: SalesScenario,
  history: { role: "user" | "model"; parts: { text: string }[] }[],
  signal?: AbortSignal,
  mode: 'text' | 'call' = 'text'
) {
  const settings = await getSettings();

  const systemInstruction = `
    Anda adalah AI roleplay bot yang berakting sebagai konsumen spesifik dalam skenario penjualan rumah subsidi (KPR).
    Implementasikan materi 'Sales Path' dan 'Sales Funnel' secara implisit dalam perilaku Anda.
    Status Anda saat ini dalam funnel: ${history.length < 3 ? 'Suspect' : history.length < 6 ? 'Prospect' : 'Hot Prospect'}.

    Gunakan Bahasa Indonesia yang santai dan natural. JANGAN menggunakan istilah 'lo/gue'.
    Gunakan panggilan yang sopan.

    PROFIL KONSUMEN:
    - Nama: ${scenario.name}
    - Gender: ${scenario.gender}
    - Agresivitas: ${scenario.aggressiveness}/10
    - Kesabaran: ${scenario.patience}/10
    - Gaya Respon: ${scenario.responseStyle}
    - Latar Belakang: ${scenario.consumerProfile}

    SKENARIO: ${scenario.title}
    DESKRIPSI: ${scenario.description}
    GOAL SALES: ${scenario.target}

    ATURAN:
    1. Tetap dalam karakter. Sesuaikan respon Anda dengan seberapa baik Sales melakukan tahapan Sales Path (Approaching, Probing, Presenting, etc).
    2. Jika Sales langsung 'Closing' tanpa 'Probing' yang baik, jadilah lebih skeptis.
    3. Realistis. Jangan terlalu mudah diyakinkan kecuali Sales menyentuh 'Pain Point' Anda sesuai skenario.
    4. Respon singkat (1-3 kalimat).
    5. JANGAN menyebutkan istilah materi sales (seperti "Anda melakukan Probing yang bagus"). Bertindaklah saja sebagai konsumen yang merespon teknik tersebut.
    6. JANGAN berikan feedback saat chat.
  `;

  // Text mode uses Ollama, Audio call uses Gemini
  if (mode === 'text') {
    const ollamaMessages: OllamaMessage[] = [
      { role: 'system', content: systemInstruction },
      ...history.map(h => ({
        role: (h.role === 'user' ? 'user' : 'assistant') as any,
        content: h.parts[0].text
      }))
    ];

    if (history.length === 0 && scenario.firstSpeaker === 'AI') {
      ollamaMessages.push({ role: 'user', content: "Mulai obrolan sesuai skenario." });
    }

    return await callOllama(settings.ollamaUrl, settings.ollamaModel, ollamaMessages, signal);
  }

  // Audio call mode uses Gemini
  const ai = await getGenAI();

  // Check if request was aborted
  if (signal?.aborted) {
    throw new Error('Aborted');
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      { role: "user", parts: [{ text: "Siapkan diri untuk roleplay. Sebagai konsumen, mulailah atau berikan respon sesuai skenario." }] },
      ...history.map(h => ({
        role: h.role,
        parts: [{ text: h.parts[0].text }]
      }))
    ],
    config: {
      systemInstruction,
      temperature: 0.8,
    },
  });

  return response.text;
}

export async function analyzePerformance(
  scenario: SalesScenario,
  transcript: { role: string; text: string }[]
) {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario, transcript }),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || 'Gagal menganalisis performa. Silakan coba lagi.')
  }

  return data
}
