// Frustration Engine — Pure heuristic analysis for salesperson message quality.
// No React, no state — just math. Easily unit-testable.

export interface FrustrationConfig {
  patience: number;    // 1-10 from scenario (higher = more patient customer)
  sensitivity: number; // 1-10 from admin settings (higher = meter reacts faster)
}

export interface AnalysisContext {
  currentFrustration: number;
  lastUserMessages: string[];     // last N user messages for repetition detection
  lastAiMessage: string | null;   // most recent AI (customer) message
}

export interface AnalysisResult {
  delta: number;         // final delta to add to frustration (clamped to [-10, +30])
  reasons: string[];     // human-readable reasons for the delta
}

// Indonesian filler words — kosa kata pengisi yang bikin customer ilfeel
const FILLER_WORDS = [
  "anu", "eee", "hmm", "gitu", "mungkin", "kayaknya", "cuman",
  "sebenarnya", "sebenernya", "jadi", "terus", "kayak", "sih",
  "deh", "loh", "dong", "nah", "emang", "kan", "kok", "lho",
  "gitu loh", "kayak gitu", "intinya sih", "yang jelas", "onestly"
];

function countWords(text: string): string[] {
  return text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
}

function countFillerWords(text: string): number {
  const lower = text.toLowerCase();
  let count = 0;
  for (const filler of FILLER_WORDS) {
    const regex = new RegExp(`\\b${filler.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const matches = lower.match(regex);
    if (matches) count += matches.length;
  }
  return count;
}

// Bigram-based Jaccard similarity
function bigramSimilarity(a: string, b: string): number {
  const getBigrams = (s: string): Set<string> => {
    const words = countWords(s);
    const bigrams = new Set<string>();
    for (let i = 0; i < words.length - 1; i++) {
      bigrams.add(`${words[i]}_${words[i + 1]}`);
    }
    // If only one word, use unigrams
    if (bigrams.size === 0) {
      words.forEach(w => bigrams.add(w));
    }
    return bigrams;
  };

  const bigramsA = getBigrams(a);
  const bigramsB = getBigrams(b);

  let intersection = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) intersection++;
  }

  const union = bigramsA.size + bigramsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function analyzeFrustration(
  message: string,
  context: AnalysisContext,
  config: FrustrationConfig
): AnalysisResult {
  // Skip empty or very short messages
  if (!message || message.trim().length < 3) {
    return { delta: 0, reasons: [] };
  }

  const reasons: string[] = [];
  let rawDelta = 0;

  const words = countWords(message);
  const wordCount = words.length;
  const charCount = message.length;
  const sentences = message.split(/[.!?]+\s*/).filter(s => s.trim().length > 0);

  // ─── HEURISTIC 1: Message Length (Panjang Pesan) ───
  if (charCount > 300) {
    const excess = Math.min(12, Math.floor((charCount - 300) / 20) + 12);
    rawDelta += excess;
    reasons.push(`Respon terlalu panjang (${charCount} karakter)`);
  } else if (charCount > 200) {
    rawDelta += 6;
    reasons.push(`Respon cukup panjang`);
  } else if (charCount > 100) {
    rawDelta += 2;
  } else if (charCount < 40 && charCount > 5) {
    rawDelta -= 2;
    reasons.push('Respon singkat & jelas');
  }

  // ─── HEURISTIC 2: Filler Words (Kata Pengisi) ───
  const fillerCount = countFillerWords(message);
  const fillerRatio = wordCount > 0 ? fillerCount / wordCount : 0;
  const fillerDelta = Math.min(18, fillerCount * 2);
  if (fillerDelta > 0) {
    rawDelta += fillerDelta;
    reasons.push(`Banyak kata pengisi (${fillerCount} kali)`);
  }
  if (fillerRatio > 0.08) {
    rawDelta += 6;
    reasons.push('Dominasi kata pengisi');
  }

  // ─── HEURISTIC 3: Repetition (Pengulangan) ───
  let hasRepetition = false;
  if (context.lastUserMessages.length > 0) {
    for (const prevMsg of context.lastUserMessages) {
      const similarity = bigramSimilarity(message, prevMsg);
      if (similarity > 0.5) {
        rawDelta += 10;
        hasRepetition = true;
        reasons.push('Mengulang poin yang sama');
        break;
      }
    }
  }

  // ─── HEURISTIC 4: Question Evasion (Menghindari Pertanyaan) ───
  if (context.lastAiMessage && context.lastAiMessage.includes('?')) {
    const answerIndicators = ['iya', 'tentu', 'bisa', 'sudah', 'ada', 'betul', 'baik', 'oke', 'siap', 'insyaallah', 'insya allah', 'no', 'tidak', 'nggak', 'belum', 'belum bisa', 'maaf'];
    const lowerMessage = message.toLowerCase();
    const hasAnswer = answerIndicators.some(ind => lowerMessage.includes(ind));

    if (!hasAnswer && charCount < 40) {
      rawDelta += 8;
      reasons.push('Tidak menjawab pertanyaan');
    }
  }

  // ─── HEURISTIC 5: Good Response Bonus (Bonus Jawaban Bagus) ───
  if (
    charCount >= 20 && charCount <= 100 &&
    fillerCount === 0 &&
    !hasRepetition &&
    sentences.length <= 3
  ) {
    rawDelta -= 5;
    reasons.push('Respon relevan & efektif');
  }

  // ─── CLAMP RAW DELTA ───
  rawDelta = Math.max(-10, Math.min(30, rawDelta));

  // ─── APPLY MULTIPLIERS ───
  // patience: higher → customer is more patient → frustration grows SLOWER
  const patienceMultiplier = (11 - config.patience) / 10; // patience=1 → 1.0, patience=10 → 0.1
  // sensitivity: higher → meter reacts FASTER
  const sensitivityMultiplier = config.sensitivity / 10;  // sensitivity=1 → 0.1, sensitivity=10 → 1.0

  const effectiveDelta = Math.round(rawDelta * patienceMultiplier * sensitivityMultiplier);

  // ─── APPLY TO CURRENT FRUSTRATION ───
  const newFrustration = Math.max(0, Math.min(100, context.currentFrustration + effectiveDelta));

  return {
    delta: newFrustration - context.currentFrustration,
    reasons
  };
}
