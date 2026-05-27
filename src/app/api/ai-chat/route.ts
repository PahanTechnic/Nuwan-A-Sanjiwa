// app/api/ai-chat/route.ts
// Streaming chat endpoint — Groq + Google Sheets logger + Supabase image upload

import { NextRequest } from 'next/server'
import { chatWithGroq, StudentContext } from '@/lib/groq'
import { appendChatSession, ensureSheetHeaders } from '@/lib/sheets'
import { createClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'

export const runtime = 'nodejs'   // need Node for google-auth-library

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    // ── Parse fields ─────────────────────────────────────────────────────────
    const messages      = JSON.parse(formData.get('messages') as string)
    const studentCtx    = JSON.parse(formData.get('studentContext') as string) as StudentContext
    const sessionId     = (formData.get('sessionId') as string) || uuidv4()
    const imageFile     = formData.get('image') as File | null

    let imageBase64: string | undefined
    let imageUploaded = false

    // ── Upload image to Supabase Storage if provided ──────────────────────────
    if (imageFile && imageFile.size > 0) {
      const supabase = createClient()
      const bytes    = await imageFile.arrayBuffer()
      const buffer   = Buffer.from(bytes)

      // Convert to base64 for Groq vision
      imageBase64 = buffer.toString('base64')

      // Upload to Supabase storage bucket: 'ai-chat-images'
      const filename = `${studentCtx.studentId}/${sessionId}/${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('ai-chat-images')
        .upload(filename, buffer, {
          contentType: imageFile.type || 'image/jpeg',
          upsert: false,
        })

      if (uploadError) {
        console.error('Supabase image upload error:', uploadError)
        // Don't fail the request — just skip storage
      } else {
        imageUploaded = true
      }
    }

    // ── Stream from Groq ──────────────────────────────────────────────────────
    const stream = await chatWithGroq(messages, studentCtx, imageBase64)

    // Collect full response for Sheets logging (while streaming to client)
    let fullResponse = ''
    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        const reader = stream.getReader()
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            fullResponse += value
            controller.enqueue(encoder.encode(value))
          }
        } finally {
          controller.close()

          // ── Log to Google Sheets after stream completes ───────────────────
          try {
            await ensureSheetHeaders()
            await appendChatSession({
              studentId:    studentCtx.studentId,
              studentName:  studentCtx.studentName,
              sessionId,
              timestamp:    new Date().toISOString(),
              messageCount: messages.length + 1,
              messages:     [
                ...messages,
                { role: 'assistant', content: fullResponse },
              ],
              imageUploaded,
              weakAreas:    studentCtx.weakAreas,
            })
          } catch (sheetErr) {
            // Don't fail the request if Sheets logging fails
            console.error('Google Sheets log error:', sheetErr)
          }
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Session-Id': sessionId,
      },
    })

  } catch (err: any) {
    console.error('AI chat route error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}