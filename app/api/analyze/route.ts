import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

interface Scenario {
  id: string
  title: string
  description: string
  target: string
  consumerProfile: string
  difficulty: string
  icon: string
  name: string
  gender: string
  aggressiveness: number
  patience: number
  responseStyle: string
  firstSpeaker: string
}

interface TranscriptEntry {
  role: string
  text: string
}

function extractJson(content: string) {
  const cleaned = content.replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start === -1 || end === -1 || end <= start) throw new Error('AI response did not contain valid JSON')
    return JSON.parse(cleaned.slice(start, end + 1))
  }
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : []
}

function normalizeAnalysis(raw: any) {
  const overallScore = Number(raw?.overallScore ?? raw?.overall_score ?? 0)
  const safeScore = Number.isFinite(overallScore) ? Math.max(0, Math.min(100, Math.round(overallScore))) : 0
  const skillScores = Array.isArray(raw?.skillScores)
    ? raw.skillScores.map((skill: any) => ({
        skill: String(skill?.skill || skill?.skill_label || 'Skill'),
        score: Math.max(0, Math.min(100, Math.round(Number(skill?.score ?? 0)))),
        evidence: asStringArray(skill?.evidence),
      }))
    : []

  return {
    overallScore: safeScore,
    grade: String(raw?.grade || (safeScore >= 90 ? 'A' : safeScore >= 80 ? 'B' : safeScore >= 70 ? 'C' : safeScore >= 60 ? 'D' : 'E')),
    summary: String(raw?.summary || raw?.verdict || 'Analysis completed.'),
    strengths: asStringArray(raw?.strengths),
    weaknesses: asStringArray(raw?.weaknesses),
    keyObjectionsHandled: asStringArray(raw?.keyObjectionsHandled || raw?.key_objections_handled),
    missedOpportunities: asStringArray(raw?.missedOpportunities || raw?.missed_opportunities),
    verdict: String(raw?.verdict || raw?.summary || 'Mission report generated.'),
    actionableTips: asStringArray(raw?.actionableTips || raw?.action_plan),
    skillScores,
    suggestedResponses: asStringArray(raw?.suggestedResponses || raw?.suggested_responses),
    recommendedNextScenario: raw?.recommendedNextScenario ? String(raw.recommendedNextScenario) : null,
    actionPlan: asStringArray(raw?.actionPlan || raw?.action_plan),
  }
}

export async function POST(request: NextRequest) {
  try {
    const { scenario, transcript }: { scenario: Scenario; transcript: TranscriptEntry[] } = await request.json()
    const apiKey = process.env.GROQ_API_KEY

    const formattedTranscript = transcript
      .map(t => `${t.role.toUpperCase()}: ${t.text}`)
      .join('\n')

    const prompt = `
Analisis performa sales dalam transkrip roleplay berikut dalam Bahasa Indonesia yang santai tapi profesional.
Gunakan istilah sales kayak 'Closing', 'Opening', 'Objection Handling', dll.
Jika transkrip pendek atau hanya berisi ucapan sales, tetap berikan analisis terbatas berdasarkan bukti yang ada dan jelaskan keterbatasannya di summary.

SKENARIO: ${scenario.title}
TARGET: ${scenario.target}

TRANSCRIPT:
${formattedTranscript}

Berikan JSON murni valid tanpa markdown. Gunakan schema persis ini:
{
  "overallScore": number,
  "grade": string,
  "summary": string,
  "strengths": string[],
  "weaknesses": string[],
  "keyObjectionsHandled": string[],
  "missedOpportunities": string[],
  "verdict": string,
  "actionableTips": string[],
  "skillScores": [{ "skill": string, "score": number, "evidence": string[] }],
  "suggestedResponses": string[],
  "recommendedNextScenario": string | null,
  "actionPlan": string[]
}
`.trim()

    if (!apiKey && !process.env.GEMINI_API_KEY && !process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      console.error('No analysis provider key is configured')
      return NextResponse.json(
        { error: 'Analysis provider is not configured.' },
        { status: 500 }
      )
    }

    if (!apiKey) {
      const geminiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
      const ai = new GoogleGenAI({ apiKey: geminiKey! })
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { temperature: 0.7 },
      })
      const analysis = normalizeAnalysis(extractJson(response.text || ''))
      return NextResponse.json(analysis)
    }

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Groq API error:', response.status, errorText)
      return NextResponse.json(
        { error: `Analisis gagal: server AI sedang sibuk. Coba lagi nanti.` },
        { status: 502 }
      )
    }

    const data = await response.json()
    const content: string = data.choices?.[0]?.message?.content || ''

    if (!content) {
      return NextResponse.json(
        { error: 'Analisis gagal: AI tidak memberikan respons.' },
        { status: 502 }
      )
    }

    const analysis = normalizeAnalysis(extractJson(content))

    return NextResponse.json(analysis)
  } catch (error: any) {
    console.error('Analyze API error:', error)
    return NextResponse.json(
      { error: error?.message || 'Gagal menganalisis performa. Silakan coba lagi.' },
      { status: 500 }
    )
  }
}
