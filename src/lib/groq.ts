// lib/groq.ts
// Groq API helper — Engineering Technology A/L AI Assistant

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface StudentContext {
  studentName: string
  studentId: string
  classRank: number
  classSize: number
  avgTotal: number
  avgMcqPct: number
  avgStrPct: number
  avgEssPct: number
  weakAreas: string[]       // e.g. ['SQ3', 'EQ2']
  papers: {
    name: string
    total: number
    mcqPct: number
    structuredPct: number
    essayPct: number
  }[]
}

// Build system prompt with student's real data
function buildSystemPrompt(ctx: StudentContext): string {
  const weakList = ctx.weakAreas.length > 0
    ? ctx.weakAreas.join(', ')
    : 'No specific weak areas identified yet'

  return `You are an expert AI study assistant for Sri Lankan Advanced Level (A/L) Engineering Technology students. You specialize in the full A/L Engineering Technology syllabus and help students improve their exam performance.

## Student Profile
- Name: ${ctx.studentName}
- Student ID: ${ctx.studentId}
- Class Rank: #${ctx.classRank} out of ${ctx.classSize} students
- Average Total Score: ${ctx.avgTotal}/100
- MCQ Average: ${ctx.avgMcqPct}%
- Structured Questions Average: ${ctx.avgStrPct}%
- Essay Questions Average: ${ctx.avgEssPct}%
- Identified Weak Areas: ${weakList}

## Paper History
${ctx.papers.map(p => `- ${p.name}: Total ${p.total}/100 (MCQ: ${p.mcqPct}%, Structured: ${p.structuredPct}%, Essay: ${p.essayPct}%)`).join('\n')}

## Your Role
1. Analyze this student's performance data and give PERSONALIZED advice
2. Answer questions about A/L Engineering Technology syllabus topics
3. Help with structured and essay question techniques
4. Suggest which topics/questions need the most attention based on their weak areas
5. Provide model answers and marking hints for past paper questions
6. Motivate and guide toward improving rank

## Response Style
- Be direct and specific — reference the student's actual scores
- Use Sinhala occasionally if it helps explain (mixed Sinhala-English is fine)
- For technical questions, give step-by-step structured answers
- Keep answers concise but complete
- Always end study advice with 1 actionable next step

## A/L Engineering Technology Syllabus Focus Areas
- Engineering Drawing & Design
- Materials Science & Technology  
- Manufacturing Technology
- Electrical & Electronics Technology
- Fluid Mechanics & Pneumatics
- Structures & Mechanisms
- Computer Aided Design & Manufacturing
- Quality Control & Management`
}

// Detect weak areas from chart data
export function detectWeakAreas(papers: StudentContext['papers']): string[] {
  if (papers.length === 0) return []

  const avgMcq = papers.reduce((s, p) => s + p.mcqPct, 0) / papers.length
  const avgStr = papers.reduce((s, p) => s + p.structuredPct, 0) / papers.length
  const avgEss = papers.reduce((s, p) => s + p.essayPct, 0) / papers.length

  const weak: string[] = []
  if (avgMcq < 50)  weak.push(`MCQ (avg ${avgMcq.toFixed(0)}%)`)
  if (avgStr < 50)  weak.push(`Structured Questions (avg ${avgStr.toFixed(0)}%)`)
  if (avgEss < 50)  weak.push(`Essay Questions (avg ${avgEss.toFixed(0)}%)`)

  return weak
}

// Main chat function — streams response
export async function chatWithGroq(
  messages: ChatMessage[],
  studentContext: StudentContext,
  imageBase64?: string,   // optional image (past paper photo)
): Promise<ReadableStream<string>> {
  const systemPrompt = buildSystemPrompt(studentContext)

  // Build messages array — inject system prompt
  const groqMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ]

  // If image provided, attach to last user message as vision content
  if (imageBase64 && groqMessages.length > 0) {
    const lastIdx = groqMessages.length - 1
    const lastMsg = groqMessages[lastIdx]
    if (lastMsg.role === 'user') {
      groqMessages[lastIdx] = {
        role: 'user',
        content: JSON.stringify([
          { type: 'text', text: lastMsg.content },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
        ]),
      }
    }
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: groqMessages,
      max_tokens: 1500,
      temperature: 0.7,
      stream: true,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Groq API error: ${response.status} — ${err}`)
  }

  // Return a ReadableStream of text chunks
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()

  return new ReadableStream<string>({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) { controller.close(); return }

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))

        for (const line of lines) {
          const data = line.slice(6).trim()
          if (data === '[DONE]') { controller.close(); return }
          try {
            const json = JSON.parse(data)
            const text = json.choices?.[0]?.delta?.content
            if (text) controller.enqueue(text)
          } catch { /* skip malformed chunks */ }
        }
      }
    },
  })
}