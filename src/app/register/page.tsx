"use client"

import { useState, useEffect } from "react"
import { registerStudent } from "../actions/registerStudent"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { Copy, CheckCircle2, ClipboardCheck, ArrowLeft, Info, UserRound, CalendarDays, BookMarked, Clock, X, Phone, Mail, MessageCircle, ChevronRight } from "lucide-react"

type GuideKey = "name" | "className" | "bookNumber" | null

type Guide = {
  title: string
  icon: React.ReactNode
  steps: string[]
}

const guides: Record<NonNullable<GuideKey>, Guide> = {
  name: {
    title: "සම්පූර්ණ නම (Full Name)",
    icon: <UserRound className="h-4 w-4 text-zinc-600" />,
    steps: [
      "ඔබගේ සම්පූර්ණ නම ඉංග්‍රීසි අකුරෙන් ලියන්න.",
      'e.g. "Pahan Chethana" — space සමග first + last name.',
      "ID card හෝ birth certificate ලෙස ලිවීම නිවැරදිම ය.",
    ],
  },
  className: {
    title: "කණ්ඩායම / Class Year",
    icon: <CalendarDays className="h-4 w-4 text-zinc-600" />,
    steps: [
      "ඔබ A/L ලියන වර්ෂය ලබාදෙන්න. e.g. 2026.",
      "ශ්‍රේණිය නොදත්නම් admin teacher ලෙස අමතන්න.",
    ],
  },
  bookNumber: {
    title: "පොතේ අංකය (Book ID)",
    icon: <BookMarked className="h-4 w-4 text-zinc-600" />,
    steps: [
      "ලොග් වීමේදී මෙම Book ID ම මුරපදය (password) ලෙස භාවිතා කෙරේ.",
      "ඔබේ ලිඛිත ID පොතේ ඇති book number ලබාදෙන්න.",
      'e.g. "B-1052" — teacher විසින් ලබාදෙනු ලැබේ.',
      "ගැටලු ඇත්නම් පහත support බොත්තම ක්ලික් කර admin ට දන්වන්න.",
    ],
  },
}

export default function RegisterPage() {
  const [name, setName] = useState("")
  const [className, setClassName] = useState("")
  const [bookNumber, setBookNumber] = useState("")
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
      setError(res.error || "දෝෂයක් සිදුවිය")
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

  // ── Success state ──────────────────────────────────────────────
  if (generatedId) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-50 p-4 dark:bg-zinc-950">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-100 shadow-sm dark:bg-emerald-950/30 dark:border-emerald-900">
              <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-450" />
            </div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Registration
            </p>
            <h1 className="sinhala text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl dark:text-white">
              ලියාපදිංචිය සාර්ථකයි!
            </h1>
            <p className="sinhala mt-1 text-sm text-zinc-500 dark:text-zinc-400">ඔබේ ගිණුම පද්ධතියට ඇතුලත් කරා.</p>
          </div>

          <div className="bg-white border border-zinc-200 shadow-md rounded-3xl p-6 space-y-4 dark:bg-zinc-900 dark:border-zinc-800">
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 text-center dark:border-zinc-800 dark:bg-zinc-950">
              <p className="sinhala mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                ඔබේ සිසු අංකය
              </p>
              <p className="break-all font-mono text-2xl font-black text-zinc-900 dark:text-white">{generatedId}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="sinhala mt-3 w-full gap-2 rounded-xl border-zinc-200 bg-white shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-850 dark:text-zinc-200"
              >
                {copied ? (
                  <>
                    <ClipboardCheck className="h-4 w-4 text-emerald-600" /> පිටපත් කළා!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 text-zinc-500" /> Student ID පිටපත් කරගන්න
                  </>
                )}
              </Button>
            </div>

            <div className="sinhala flex items-start gap-2.5 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 text-sm font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
              <span>සර් විසින් ගිණුම අනුමත කරන තෙක් රැඳී සිටින්න.</span>
            </div>

            <Button asChild className="sinhala h-11 w-full rounded-2xl font-bold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950">
              <Link href="/login">ලොගින් පිටුවට යන්න</Link>
            </Button>
          </div>
        </div>
        <ContactFAB note="ලියාපදිංචිය සම්බන්ධ ගැටලු ඇත්නම් admin ට දන්වන්න." />
      </div>
    )
  }

  // ── Form state ─────────────────────────────────────────────────
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-50 p-4 dark:bg-zinc-950">
      <form onSubmit={handleRegister} className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white border border-zinc-200 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
            <UserRound className="h-6 w-6 text-zinc-800 dark:text-zinc-200" />
          </div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Student Portal
          </p>
          <h1 className="sinhala text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl dark:text-white">
            නව ශිෂ්‍ය ලියාපදිංචිය
          </h1>
          <p className="sinhala mt-1 text-sm text-zinc-500 dark:text-zinc-400">ඔබගේ නිවැරදි තොරතුරු ලබාදෙන්න</p>
        </div>

        <div className="bg-white border border-zinc-200/80 shadow-md shadow-zinc-100 dark:bg-zinc-900 dark:border-zinc-800 dark:shadow-none space-y-5 rounded-3xl p-6 sm:p-7">
          {error && (
            <div className="sinhala flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/30 dark:border-red-900 dark:text-red-400">
              <span className="font-medium">{error}</span>
            </div>
          )}

          <Field
            id="name"
            label="සම්පූර්ණ නම"
            placeholder="e.g. Pahan Chethana"
            value={name}
            onChange={setName}
            onGuide={() => setActiveGuide("name")}
            active={activeGuide === "name"}
            disabled={loading}
            required
          />

          <Field
            id="className"
            label="කණ්ඩායම / Class Year"
            placeholder="e.g. 2026"
            type="number"
            value={className}
            onChange={setClassName}
            onGuide={() => setActiveGuide("className")}
            active={activeGuide === "className"}
            disabled={loading}
            required
          />

          <Field
            id="bookNumber"
            label="පොතේ අංකය (Book ID)"
            placeholder="e.g. B-1052"
            value={bookNumber}
            onChange={setBookNumber}
            onGuide={() => setActiveGuide("bookNumber")}
            active={activeGuide === "bookNumber"}
            disabled={loading}
            required
          />

          <Button type="submit" disabled={loading} className="sinhala h-11 w-full rounded-2xl text-sm font-bold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 shadow-sm transition-colors">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ලියාපදිංචි වෙමින්...
              </span>
            ) : (
              "ලියාපදිංචි වන්න"
            )}
          </Button>
        </div>

        <div className="mt-5 flex flex-col items-center gap-3">
          <p className="sinhala text-sm text-zinc-500 dark:text-zinc-400">
            දැනටමත් ගිණුමක් තිබේද?{" "}
            <Link href="/login" className="font-bold text-zinc-900 dark:text-white underline-offset-4 hover:underline">
              ලොග් වන්න
            </Link>
          </p>
          <Link
            href="/"
            className="sinhala flex items-center gap-1 text-xs text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <ArrowLeft className="h-3 w-3" /> ප්‍රධාන පිටුවට
          </Link>
        </div>
      </form>

      <QuickGuideDialog
        open={activeGuide !== null}
        guide={activeGuide ? guides[activeGuide] : null}
        onClose={() => setActiveGuide(null)}
      />
      <ContactFAB note="ලියාපදිංචිය සම්බන්ධ ගැටලු හෝ Book ID නොදන්නේ නම් admin ට දන්වන්න." />
    </div>
  )
}

function Field({
  id,
  label,
  placeholder,
  value,
  onChange,
  onGuide,
  active,
  disabled,
  type = "text",
  required,
}: {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  onGuide: () => void
  active: boolean
  disabled?: boolean
  type?: string
  required?: boolean
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="sinhala text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          {label}
        </Label>
        <button
          type="button"
          onClick={onGuide}
          className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest transition-colors ${
            active ? "text-zinc-900 dark:text-white" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          }`}
        >
          <Info className="h-3 w-3" /> Guide
        </button>
      </div>
      <Input
        id={id}
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="sinhala h-11 rounded-xl border-zinc-200 bg-zinc-50/50 px-3 text-sm focus-visible:ring-1 focus-visible:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"
      />
    </div>
  )
}

// ── Quick Guide Component ────────────────────────────────────────
function QuickGuideDialog({ open, guide, onClose }: { open: boolean; guide: Guide | null; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open || !guide) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true">
      <button onClick={onClose} className="absolute inset-0 bg-zinc-950/20 backdrop-blur-[1px] animate-in fade-in duration-200" aria-label="Close" />
      <div className="relative w-full max-w-sm rounded-3xl bg-white border border-zinc-200 shadow-2xl p-6 dark:bg-zinc-900 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 shrink-0">
              {guide.icon}
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Quick Guide</p>
              <h3 className="sinhala text-sm font-black leading-tight text-zinc-900 dark:text-white">{guide.title}</h3>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-50 text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700">
            <X className="h-4 w-4" />
          </button>
        </div>
        <ol className="space-y-2.5">
          {guide.steps.map((step, i) => (
            <li key={i} className="sinhala flex gap-3 rounded-2xl bg-zinc-50 p-3 text-sm leading-relaxed text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white dark:bg-zinc-100 dark:text-zinc-950">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

// ── Contact FAB Component ────────────────────────────────────────
function ContactFAB({ note }: { note?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {open && <button className="fixed inset-0 z-40 bg-zinc-950/10 backdrop-blur-[1px]" onClick={() => setOpen(false)} />}
      <div className={`fixed bottom-24 right-4 z-50 w-[calc(100vw-2rem)] max-w-xs rounded-3xl bg-white border border-zinc-200 shadow-xl transition-all duration-300 dark:bg-zinc-900 dark:border-zinc-800 ${open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"}`}>
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 pb-3 pt-5 dark:border-zinc-850">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Support</p>
            <h3 className="sinhala text-base font-black text-zinc-900 dark:text-white">Admin සම්බන්ධ කරන්න</h3>
          </div>
          <button onClick={() => setOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-50 dark:bg-zinc-800">
            <X className="h-3.5 w-3.5 text-zinc-500" />
          </button>
        </div>
        <div className="space-y-3 px-5 py-4">
          <a href="tel:0743283805" className="flex items-center gap-3 rounded-2xl bg-zinc-50 p-3 hover:bg-zinc-100 dark:bg-zinc-800/50">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"><Phone className="h-4 w-4" /></div>
            <div className="sinhala min-w-0"><p className="text-[10px] text-zinc-400">දුරකතන</p><p className="text-sm font-bold text-zinc-900 dark:text-white">0743 283 805</p></div>
            <ChevronRight className="ml-auto h-3.5 w-3.5 text-zinc-400" />
          </a>
          <a href="mailto:pahanchandana740@gmail.com" className="flex items-center gap-3 rounded-2xl bg-zinc-50 p-3 hover:bg-zinc-100 dark:bg-zinc-800/50">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"><Mail className="h-4 w-4" /></div>
            <div className="sinhala min-w-0"><p className="text-[10px] text-zinc-400">ඊමේල්</p><p className="truncate text-[11px] font-bold text-zinc-900 dark:text-white">pahanchandana740@gmail.com</p></div>
            <ChevronRight className="ml-auto h-3.5 w-3.5 text-zinc-400" />
          </a>
        </div>
        <div className="px-5 pb-5"><p className="sinhala text-[10px] text-zinc-400 leading-relaxed">{note}</p></div>
      </div>
      <button onClick={() => setOpen(!open)} className="fixed bottom-5 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg shadow-zinc-200 dark:shadow-none dark:bg-zinc-100 dark:text-zinc-950 hover:scale-105 transition-transform">
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>
    </>
  )
}