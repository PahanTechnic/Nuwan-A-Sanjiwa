'use client'

// components/AIChatPanel.tsx
// AI Study Assistant — Engineering Technology A/L
// Design matches StudentDashboardUI: slate/white, rounded-3xl, clean minimal

import { useRef, useState, useEffect } from 'react'
import { Brain, Send, ImagePlus, X, Loader2, Sparkles, AlertCircle } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { detectWeakAreas, type StudentContext } from '@/lib/groq'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  imagePreview?: string   // local blob URL for display
  timestamp: Date
}

interface AIChatPanelProps {
  studentName: string
  studentId: string
  classRank: number
  classSize: number
  avgTotal: number
  avgMcqPct: number
  avgStrPct: number
  avgEssPct: number
  papers: {
    name: string
    total: number
    mcqPct: number
    structuredPct: number
    essayPct: number
  }[]
}

// ── Quick prompt suggestions ──────────────────────────────────────────────────
const QUICK_PROMPTS = [
  'මගේ weak areas ගැන explain කරන්න',
  'Rank improve කරන්න plan දෙන්න',
  'Structured question tips දෙන්න',
  'Essay writing technique explain කරන්න',
]

// ── Markdown-ish simple renderer ──────────────────────────────────────────────
function renderContent(text: string) {
  return text
    .split('\n')
    .map((line, i) => {
      if (line.startsWith('## '))
        return <p key={i} className="font-black text-[#020617] text-sm mt-3 mb-1">{line.slice(3)}</p>
      if (line.startsWith('# '))
        return <p key={i} className="font-black text-[#020617] text-base mt-3 mb-1">{line.slice(2)}</p>
      if (line.startsWith('- ') || line.startsWith('• '))
        return <p key={i} className="text-sm text-slate-700 pl-3 before:content-['•'] before:mr-2 before:text-slate-400">{line.slice(2)}</p>
      if (line.startsWith('**') && line.endsWith('**'))
        return <p key={i} className="font-bold text-sm text-[#020617]">{line.slice(2, -2)}</p>
      if (line.trim() === '')
        return <div key={i} className="h-1" />
      return <p key={i} className="text-sm text-slate-700 leading-relaxed">{line}</p>
    })
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AIChatPanel({
  studentName, studentId, classRank, classSize,
  avgTotal, avgMcqPct, avgStrPct, avgEssPct, papers,
}: AIChatPanelProps) {

  const [messages, setMessages]     = useState<Message[]>([])
  const [input, setInput]           = useState('')
  const [isLoading, setIsLoading]   = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [sessionId]                 = useState(() => uuidv4())
  const [pendingImage, setPendingImage] = useState<{ file: File; preview: string } | null>(null)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const fileRef    = useRef<HTMLInputElement>(null)
  const textRef    = useRef<HTMLTextAreaElement>(null)

  const weakAreas = detectWeakAreas(papers)

  const studentContext: StudentContext = {
    studentName, studentId, classRank, classSize,
    avgTotal, avgMcqPct, avgStrPct, avgEssPct,
    weakAreas, papers,
  }

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content && !pendingImage) return
    if (isLoading) return

    setError(null)
    const userMsg: Message = {
      id: uuidv4(),
      role: 'user',
      content: content || '(Image uploaded — please analyze this)',
      imagePreview: pendingImage?.preview,
      timestamp: new Date(),
    }

    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)

    // Placeholder for streaming assistant reply
    const assistantId = uuidv4()
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }])

    try {
      // Build FormData for API route
      const fd = new FormData()
      fd.append('messages', JSON.stringify(
        updatedMessages.map(m => ({ role: m.role, content: m.content }))
      ))
      fd.append('studentContext', JSON.stringify(studentContext))
      fd.append('sessionId', sessionId)
      if (pendingImage) {
        fd.append('image', pendingImage.file)
      }

      setPendingImage(null)

      const res = await fetch('/api/ai-chat', { method: 'POST', body: fd })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)

      // Stream response
      const reader  = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullText  = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        fullText += chunk
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: fullText } : m
        ))
      }

    } catch (err: any) {
      setError(err.message || 'Something went wrong. Try again.')
      setMessages(prev => prev.filter(m => m.id !== assistantId))
    } finally {
      setIsLoading(false)
    }
  }

  // ── Image pick ────────────────────────────────────────────────────────────
  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    setPendingImage({ file, preview })
    e.target.value = ''
  }

  // ── Textarea auto-resize + Enter to send ─────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // ── Welcome state ─────────────────────────────────────────────────────────
  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-[70vh] min-h-[500px] max-h-[800px]">

      {/* ── Welcome banner (shown when no messages) ── */}
      {isEmpty && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 gap-6">

          {/* Icon */}
          <div className="h-16 w-16 rounded-3xl border border-slate-200 bg-white shadow-sm flex items-center justify-center">
            <Brain className="h-7 w-7 text-slate-700" />
          </div>

          <div className="text-center max-w-sm">
            <h2 className="text-2xl font-black text-[#020617]">AI Study Assistant</h2>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Engineering Technology A/L syllabus target කරගත් AI assistant. ඔයාගේ marks data analyze කරලා personalized advice දෙනවා.
            </p>
          </div>

          {/* Weak areas pill */}
          {weakAreas.length > 0 && (
            <div className="w-full max-w-sm border border-amber-200 bg-amber-50 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-1">Focus Areas</p>
                  <p className="text-sm text-amber-700">
                    {weakAreas.join(' · ')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Quick prompts */}
          <div className="w-full max-w-sm space-y-2">
            <p className="text-xs font-medium uppercase tracking-widest text-slate-400 text-center mb-3">Quick Start</p>
            {QUICK_PROMPTS.map(p => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                className="w-full text-left text-sm px-4 py-3 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Message list ── */}
      {!isEmpty && (
        <div className="flex-1 overflow-y-auto px-1 py-2 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

              {/* Assistant avatar */}
              {msg.role === 'assistant' && (
                <div className="h-8 w-8 rounded-xl border border-slate-200 bg-white flex items-center justify-center shrink-0 mt-0.5">
                  <Brain className="h-3.5 w-3.5 text-slate-600" />
                </div>
              )}

              <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>

                {/* Image preview */}
                {msg.imagePreview && (
                  <img
                    src={msg.imagePreview}
                    alt="uploaded"
                    className="rounded-2xl max-h-40 object-cover border border-slate-200"
                  />
                )}

                {/* Bubble */}
                <div className={`rounded-3xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-[#020617] text-white rounded-br-md'
                    : 'bg-slate-50 border border-slate-200 rounded-bl-md'
                }`}>
                  {msg.role === 'user' ? (
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  ) : msg.content === '' ? (
                    <div className="flex items-center gap-1.5 py-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                    </div>
                  ) : (
                    <div className="space-y-0.5">{renderContent(msg.content)}</div>
                  )}
                </div>

                {/* Timestamp */}
                <p className="text-xs text-slate-400 px-1">
                  {msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* ── Error banner ── */}
      {error && (
        <div className="mx-1 mb-2 flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-2.5">
          <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
          <p className="text-xs text-rose-700 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Input area ── */}
      <div className="border-t border-slate-100 pt-4 mt-2">

        {/* Image preview strip */}
        {pendingImage && (
          <div className="mb-3 flex items-center gap-2">
            <div className="relative">
              <img
                src={pendingImage.preview}
                alt="pending"
                className="h-14 w-14 rounded-xl object-cover border border-slate-200"
              />
              <button
                onClick={() => setPendingImage(null)}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-[#020617] text-white flex items-center justify-center"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
            <p className="text-xs text-slate-400">Past paper image ready to send</p>
          </div>
        )}

        {/* Input row */}
        <div className="flex items-end gap-2">

          {/* Image upload button */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={isLoading}
            className="h-11 w-11 shrink-0 rounded-2xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors disabled:opacity-40"
            title="Upload past paper image"
          >
            <ImagePlus className="h-4 w-4" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImagePick}
          />

          {/* Text area */}
          <textarea
            ref={textRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            rows={1}
            placeholder="Ask anything about your papers or A/L syllabus…"
            className="flex-1 resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm text-[#020617] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50 min-h-[44px] max-h-[120px]"
            style={{ height: 'auto' }}
            onInput={e => {
              const t = e.currentTarget
              t.style.height = 'auto'
              t.style.height = Math.min(t.scrollHeight, 120) + 'px'
            }}
          />

          {/* Send button */}
          <button
            onClick={() => sendMessage()}
            disabled={isLoading || (!input.trim() && !pendingImage)}
            className="h-11 w-11 shrink-0 rounded-2xl bg-[#020617] text-white flex items-center justify-center hover:bg-slate-800 transition-colors disabled:opacity-40"
          >
            {isLoading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />
            }
          </button>
        </div>

        <p className="text-xs text-slate-400 mt-2 text-center">
          Enter to send · Shift+Enter for new line · Chat history saved automatically
        </p>
      </div>
    </div>
  )
}