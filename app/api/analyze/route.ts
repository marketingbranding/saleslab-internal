import { NextRequest, NextResponse } from 'next/server'

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

export async function POST(request: NextRequest) {
  try {
    const { scenario, transcript }: { scenario: Scenario; transcript: TranscriptEntry[] } = await request.json()
    const apiKey = process.env.GROQ_API_KEY

    if (!apiKey) {
      console.error('GROQ_API_KEY is not configured')
      return NextResponse.json(
        { error: 'GROQ_API_KEY not configured' },
        { status: 500 }
      )
    }

    const formattedTranscript = transcript
      .map(t => `${t.role.toUpperCase()}: ${t.text}`)
      .join('\n')

    const prompt = `
Analisis performa sales dalam transkrip roleplay berikut dalam Bahasa Indonesia yang santai tapi profesional.
Gunakan istilah sales kayak 'Closing', 'Opening', 'Objection Handling', dll.

SKENARIO: ${scenario.title}
TARGET: ${scenario.target}

TRANSCRIPT:
${formattedTranscript}

Berikan evaluasi terstruktur dalam format JSON murni tanpa markdown, dengan keys:
- overallScore: (number 0-100)
- strengths: (array of string)
- weaknesses: (array of string)
- keyObjectionsHandled: (array of string)
- missedOpportunities: (array of string)
- verdict: (string)
- actionableTips: (array of string)
`.trim()

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

    const cleaned = content.replace(/```json|```/g, '').trim()
    const analysis = JSON.parse(cleaned)

    return NextResponse.json(analysis)
  } catch (error: any) {
    console.error('Analyze API error:', error)
    return NextResponse.json(
      { error: error?.message || 'Gagal menganalisis performa. Silakan coba lagi.' },
      { status: 500 }
    )
  }
}
