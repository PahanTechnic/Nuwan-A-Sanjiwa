"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { checkStudentStatus } from "../actions/checkStudent"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { LogIn, AlertCircle, ArrowLeft, Info, BookOpen, Hash, X, Phone, Mail, MessageCircle, ChevronRight } from "lucide-react"

type GuideKey = "studentId" | "password" | null

type Guide = {
  title: string
  icon: React.ReactNode
  steps: string[]
}

const guides: Record<NonNullable<GuideKey>, Guide> = {
  studentId: {
    title: "සිසු අංකය සොයා ගන්නේ කෙසේද?",
    icon: <Hash className="h-4 w-4 text-zinc-600" />,
    steps: [
      "ලියාපදිංචිය සාර්ථකවීමෙන් පසු ඔබට Student ID ලබා දෙනු ලැබේ.",
      "ඒ ID ආකෘතිය: ET26-A1234 (class year + letter + number).",
      'ලියාපදිංචිය නොකළේ නම් "ලියාපදිංචි වන්න" ක්ලික් කරන්න.',
      "ලොග් නොවිය හැකි නම් admin අමතන්න.",
    ],
  },
  password: {
    title: "මුරපදය / පොතේ අංකය",
    icon: <BookOpen className="h-4 w-4 text-zinc-600" />,
    steps: [
      'ලියාපදිංචිවීමේදී ඔබ ලබා දුන් "Book ID" (e.g. B-1052) මෙහි භාවිතා කරන්න.',
      "admin teacher ඔබේ book number set කරයි.",
      "admin ලිපිනය ලබා ගැනීමට පහත support බොත්තම ක්ලික් කරන්න.",
    ],
  },
}

export default function LoginPage() {
  const [studentId, setStudentId] = useState("")
  const [bookNumber, setBookNumber] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeGuide, setActiveGuide] = useState<GuideKey>(null)

  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setActiveGuide(null)

    const inputVal = studentId.trim()
    let email = inputVal

    if (!inputVal.includes("@")) {
      const upperStudentId = inputVal.toUpperCase()
      email = `${upperStudentId.toLowerCase()}@system.com`

      const check = await checkStudentStatus(upperStudentId)

      if (check.status === "not_found") {
        setError("මෙම සිසු අංකය පද්ධතියේ ලියාපදිංචි කර නැත!")
        setLoading(false)
        return
      }
      if (check.status === "not_approved") {
        setError("ඔබගේ ගිණුම තවමත් සර් විසින් අනුමත කර නැත!")
        setLoading(false)
        return
      }
      if (check.status === "error") {
        setError("පද්ධතියේ දෝෂයක් පවතී. නැවත උත්සාහ කරන්න.")
        setLoading(false)
        return
      }
    }

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: bookNumber.trim(),
      })
      if (authError) throw authError
      router.push(inputVal.includes("@") ? "/teacher" : "/dashboard")
      router.refresh()
    } catch {
      setError("ඇතුලත් කල තොරතුරු වැරදියයි! (ID එක හෝ පොතේ අංකය නැවත පරීක්ෂා කරන්න)")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-50 p-4 dark:bg-zinc-950">
      <form onSubmit={handleLogin} className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white border border-zinc-200 shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
            <LogIn className="h-6 w-6 text-zinc-800 dark:text-zinc-200" />
          </div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Student Portal
          </p>
          <h1 className="sinhala text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl dark:text-white">
            පද්ධතියට ඇතුල් වන්න
          </h1>
          <p className="sinhala mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            ඔබේ සිසු අංකය හෝ ගුරු ඊමේල් ලබාදෙන්න
          </p>
        </div>

        <div className="bg-white border border-zinc-200/80 shadow-md shadow-zinc-100 dark:bg-zinc-900 dark:border-zinc-800 dark:shadow-none space-y-5 rounded-3xl p-6 sm:p-7">
          {error && (
            <div className="sinhala flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:bg-red-950/30 dark:border-red-900 dark:text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <Field
            id="username"
            label="සිසු අංකය හෝ විද්‍යුත් තැපෑල"
            placeholder="උදා: ET26-A1234 හෝ sir@gmail.com"
            value={studentId}
            onChange={setStudentId}
            onGuide={() => setActiveGuide("studentId")}
            active={activeGuide === "studentId"}
            disabled={loading}
            required
          />

          <Field
            id="password"
            label="මුරපදය / පොතේ අංකය"
            placeholder="ඔබේ Book ID ඇතුලත් කරන්න"
            type="password"
            value={bookNumber}
            onChange={setBookNumber}
            onGuide={() => setActiveGuide("password")}
            active={activeGuide === "password"}
            disabled={loading}
            required
          />

          <Button type="submit" disabled={loading} className="sinhala h-11 w-full rounded-2xl text-sm font-bold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 shadow-sm transition-colors">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ඇතුල් වෙමින්...
              </span>
            ) : (
              "ඇතුල් වන්න"
            )}
          </Button>
        </div>

        <div className="mt-5 flex flex-col items-center gap-3">
          <p className="sinhala text-sm text-zinc-500 dark:text-zinc-400">
            නව ශිෂ්‍යයෙක්ද?{" "}
            <Link href="/register" className="font-bold text-zinc-900 dark:text-white underline-offset-4 hover:underline">
              ලියාපදිංචි වන්න
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
      <ContactFAB note="මුරපදය අමතක නම් හෝ ගිණුම් ගැටලු ඇත්නම් admin ට දන්වන්න." />
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