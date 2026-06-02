'use client'

import { useState } from 'react'
import { registerStudent } from '../actions/registerStudent'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import {
  Copy, CheckCircle2, ClipboardCheck, ArrowLeft,
  Phone, Mail, X, MessageCircle, Info, ChevronRight,
  UserRound, CalendarDays, BookMarked,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
type GuideKey = 'name' | 'className' | 'bookNumber' | null

// ── Quick Guide content ───────────────────────────────────────────────────────
const guides: Record<NonNullable<GuideKey>, { title: string; icon: React.ReactNode; steps: string[] }> = {
  name: {
    title: 'සම්පූර්ණ නම (Full Name)',
    icon: <UserRound className="h-4 w-4 text-blue-500" />,
    steps: [
      'ඔබගේ සම්පූර්ණ නම ඉංග්‍රීසි අකුරෙන් ලියන්න.',
      'e.g. "Pahan Chethana" — space සමග first + last name.',
      'ID card හෝ birth certificate ලෙස ලිවීම නිවැරදිම ය.',
    ],
  },
  className: {
    title: 'කණ්ඩායම / Class Year',
    icon: <CalendarDays className="h-4 w-4 text-blue-500" />,
    steps: [
      'ඔබ A/L ලියන වර්ෂය ලබාදෙන්න. e.g. 2026.',
      'ශ්‍රේණිය නොදත්නම් admin teacher ලෙස අමතන්න.',
    ],
  },
  bookNumber: {
    title: 'පොතේ අංකය (Book ID)',
    icon: <BookMarked className="h-4 w-4 text-blue-500" />,
    steps: [
      'ලොග් වීමේදී මෙම Book ID ම මුරපදය (password) ලෙස භාවිතා කෙරේ.',
      'ඔබේ ලිඛිත ID පොතේ ඇති book number ලබාදෙන්න.',
      'e.g. "B-1052" — teacher විසින් ලබාදෙනු ලැබේ.',
      'ගැටලු ඇත්නම් FAB button (? icon) ක්ලික් කර admin ට දන්වන්න.',
    ],
  },
}

// ── Contact Admin FAB ─────────────────────────────────────────────────────────
function ContactFAB() {
  const [open, setOpen] = useState(false)
  return (
    <div className="sinhala">
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={`fixed bottom-24 right-5 z-50 w-72 rounded-3xl bg-white border border-slate-200 shadow-2xl shadow-slate-200/60 transition-all duration-300 origin-bottom-right
          ${open ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-4 pointer-events-none'}`}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-0.5">Support</p>
            <h3 className="text-base font-black text-[#020617]">Admin සම්බන්ධ කරන්න</h3>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
          >
            <X className="h-3.5 w-3.5 text-slate-500" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <a
            href="tel:0743283805"
            className="flex items-center gap-3 p-3 rounded-2xl bg-blue-50 hover:bg-blue-100 transition-colors group"
          >
            <div className="h-9 w-9 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
              <Phone className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-widest text-blue-400">දුරකතන</p>
              <p className="text-sm font-bold text-blue-700 tabular-nums">0743 283 805</p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-blue-300 ml-auto group-hover:translate-x-0.5 transition-transform" />
          </a>

          <a
            href="mailto:pahanchandana740@gmail.com"
            className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group"
          >
            <div className="h-9 w-9 rounded-xl bg-slate-700 flex items-center justify-center shrink-0">
              <Mail className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">ඊමේල්</p>
              <p className="text-[11px] font-bold text-slate-700 truncate">pahanchandana740@gmail.com</p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300 ml-auto group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>

        <div className="px-5 pb-5">
          <p className="text-[10px] text-slate-400 leading-relaxed">
            ලියාපදිංචිය සම්බන්ධ ගැටලු හෝ Book ID නොදන්නේ නම් admin ට දන්වන්න.
          </p>
        </div>
      </div>

      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full shadow-xl shadow-blue-200/60 flex items-center justify-center transition-all duration-300
          ${open ? 'bg-slate-700 rotate-12 scale-95' : 'bg-blue-600 hover:bg-blue-700 hover:scale-110'}`}
        aria-label="Contact Admin"
      >
        {open
          ? <X className="h-5 w-5 text-white" />
          : <MessageCircle className="h-5 w-5 text-white" />
        }
      </button>
    </div>
  )
}

// ── Quick Guide Panel ─────────────────────────────────────────────────────────
function QuickGuide({ guideKey }: { guideKey: GuideKey }) {
  if (!guideKey) return null
  const g = guides[guideKey]
  return (
    <div className=" sinhala animate-in fade-in slide-in-from-top-2 duration-200 mt-2 p-4 rounded-2xl bg-blue-50 border border-blue-100">
      <div className="flex items-center gap-2 mb-3">
        {g.icon}
        <p className="text-xs font-bold text-blue-700">{g.title}</p>
      </div>
      <ol className="space-y-1.5">
        {g.steps.map((step, i) => (
          <li key={i} className="flex gap-2 text-xs text-blue-600 leading-relaxed">
            <span className="shrink-0 h-4 w-4 rounded-full bg-blue-200 text-blue-600 text-[9px] font-bold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const [name, setName] = useState('')
  const [className, setClassName] = useState('')
  const [bookNumber, setBookNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [generatedId, setGeneratedId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeGuide, setActiveGuide] = useState<GuideKey>(null)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setActiveGuide(null)

    const res = await registerStudent({ name, className, bookNumber })
    if (res.success && res.studentId) {
      setGeneratedId(res.studentId)
    } else {
      setError(res.error || 'දෝෂයක් සිදුවිය')
    }
    setLoading(false)
  }

  const copyToClipboard = () => {
    if (generatedId) {
      navigator.clipboard.writeText(generatedId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // ── Success state ────────────────────────────────────────────────────────────
  if (generatedId) {
    return (
      <div className="sinhala flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="w-full max-w-md">

          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Registration</p>
            <h1 className="text-3xl font-black text-[#020617] tracking-tight">ලියාපදිංචිය සාර්ථකයි!</h1>
            <p className="text-sm text-slate-500 mt-1">ඔබේ ගිණුම පද්ධතියට ඇතුලත් කරා.</p>
          </div>

          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">ඔබේ සිසු අංකය</p>
              <p className="text-2xl font-mono font-black text-blue-600 break-all">{generatedId}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="w-full mt-3 gap-2 rounded-xl border-slate-200"
              >
                {copied
                  ? <><ClipboardCheck className="h-4 w-4 text-emerald-600" /> පිටපත් කළා!</>
                  : <><Copy className="h-4 w-4" /> Student ID පිටපත් කරගන්න</>
                }
              </Button>
            </div>

            <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-700 font-medium">
              <span className="text-base leading-none mt-0.5">⏳</span>
              <span>සර් විසින් ගිණුම අනුමත කරන තෙක් රැඳී සිටින්න.</span>
            </div>

            <Button asChild className="w-full rounded-2xl h-11 font-bold bg-blue-600 hover:bg-blue-700">
              <Link href="/login">ලොගින් පිටුවට යන්න</Link>
            </Button>
          </div>
        </div>
        <ContactFAB />
      </div>
    )
  }

  // ── Form state ───────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
            <UserRound className="h-6 w-6 text-blue-600" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Student Portal</p>
          <h1 className="text-3xl font-black text-[#020617] tracking-tight">නව ශිෂ්‍ය ලියාපදිංචිය</h1>
          <p className="text-sm text-slate-500 mt-1">ඔබගේ නිවැරදි තොරතුරු ලබාදෙන්න</p>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 space-y-5">

          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600">
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="name" className="text-sm font-semibold text-[#020617]">සම්පූර්ණ නම</Label>
              <button
                type="button"
                onClick={() => setActiveGuide(prev => prev === 'name' ? null : 'name')}
                className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest transition-colors
                  ${activeGuide === 'name' ? 'text-blue-600' : 'text-slate-400 hover:text-blue-500'}`}
              >
                <Info className="h-3 w-3" /> Guide
              </button>
            </div>
            <Input
              id="name"
              required
              placeholder="e.g. Pahan Chethana"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setActiveGuide('name')}
              disabled={loading}
              className="rounded-xl border-slate-200 bg-slate-50 focus:border-blue-400 focus:ring-blue-100 h-11"
            />
            <QuickGuide guideKey={activeGuide === 'name' ? 'name' : null} />
          </div>

          {/* Class Year */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="className" className="text-sm font-semibold text-[#020617]">කණ්ඩායම / Class Year</Label>
              <button
                type="button"
                onClick={() => setActiveGuide(prev => prev === 'className' ? null : 'className')}
                className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest transition-colors
                  ${activeGuide === 'className' ? 'text-blue-600' : 'text-slate-400 hover:text-blue-500'}`}
              >
                <Info className="h-3 w-3" /> Guide
              </button>
            </div>
            <Input
              id="className"
              required
              type="number"
              placeholder="e.g. 2026"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              onFocus={() => setActiveGuide('className')}
              disabled={loading}
              className="rounded-xl border-slate-200 bg-slate-50 focus:border-blue-400 focus:ring-blue-100 h-11"
            />
            <QuickGuide guideKey={activeGuide === 'className' ? 'className' : null} />
          </div>

          {/* Book Number */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="bookNumber" className="text-sm font-semibold text-[#020617]">පොතේ අංකය (Book ID)</Label>
              <button
                type="button"
                onClick={() => setActiveGuide(prev => prev === 'bookNumber' ? null : 'bookNumber')}
                className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest transition-colors
                  ${activeGuide === 'bookNumber' ? 'text-blue-600' : 'text-slate-400 hover:text-blue-500'}`}
              >
                <Info className="h-3 w-3" /> Guide
              </button>
            </div>
            <Input
              id="bookNumber"
              required
              placeholder="e.g. B-1052"
              value={bookNumber}
              onChange={(e) => setBookNumber(e.target.value)}
              onFocus={() => setActiveGuide('bookNumber')}
              disabled={loading}
              className="rounded-xl border-slate-200 bg-slate-50 focus:border-blue-400 focus:ring-blue-100 h-11"
            />
            <QuickGuide guideKey={activeGuide === 'bookNumber' ? 'bookNumber' : null} />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            onClick={handleRegister}
            className="w-full rounded-2xl h-11 font-bold text-sm shadow-sm bg-blue-600 hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                ලියාපදිංචි වෙමින්...
              </span>
            ) : 'ලියාපදිංචි වන්න'}
          </Button>

        </div>

        <div className="mt-5 flex flex-col items-center gap-3">
          <p className="text-sm text-slate-500">
            දැනටමත් ගිණුමක් තිබේද?{' '}
            <Link href="/login" className="font-bold text-blue-600 hover:underline">
              ලොග් වන්න
            </Link>
          </p>
          <Link
            href="/"
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> ප්‍රධාන පිටුවට
          </Link>
        </div>
      </div>

      <ContactFAB />
    </div>
  )
}