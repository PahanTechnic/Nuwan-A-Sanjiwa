'use client'

import { useState } from 'react'
import { registerStudent } from '../actions/registerStudent'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Copy, CheckCircle2, ClipboardCheck, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [className, setClassName] = useState('')
  const [bookNumber, setBookNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [generatedId, setGeneratedId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

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

  if (generatedId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
        <Card className="w-full max-w-md shadow-xl border-0 sm:border">
          <CardHeader className="text-center">
            <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto mb-3" />
            <CardTitle className="text-2xl font-bold">ලියාපදිංචිය සාර්ථකයි!</CardTitle>
            <CardDescription>ඔබේ ගිණුම සාර්ථකව පද්ධතියට ඇතුලත් කරා.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 text-center">
            <div className="p-4 bg-slate-100 rounded-xl border">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">ඔබේ සිසු අංකය</span>
              <span className="text-2xl font-mono font-bold text-blue-600 break-all">{generatedId}</span>
              <Button variant="outline" size="sm" onClick={copyToClipboard} className="w-full mt-3 gap-2 rounded-full">
                {copied ? <ClipboardCheck className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                {copied ? 'පිටපත් කළා!' : 'Student ID පිටපත් කරගන්න'}
              </Button>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-sm text-amber-800 font-medium">
              ⏳ සර් විසින් මෙම ගිණුම අනුමත කරන තෙක් රැඳී සිටින්න.
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button asChild className="w-full rounded-full">
              <Link href="/login">ප්‍රධාන පිටුවට යන්න</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-0 sm:border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">නව ශිෂ්‍ය ලියාපදිංචිය</CardTitle>
          <CardDescription>පද්ධතියට ඇතුලත් වීමට ඔබගේ නිවැරදි තොරතුරු ලබාදෙන්න</CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">සම්පූර්ණ නම</Label>
              <Input id="name" required placeholder="උදා: Pahan Chethana" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="className">කණ්ඩායම/වසර (Class Year)</Label>
              <Input id="className" required type="number" placeholder="උදා: 2026" value={className} onChange={(e) => setClassName(e.target.value)} disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bookNumber">පොතේ අංකය (Book ID)</Label>
              <Input id="bookNumber" required placeholder="උදා: B-1052" value={bookNumber} onChange={(e) => setBookNumber(e.target.value)} disabled={loading} />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
            <Button type="submit" className="w-full rounded-full" disabled={loading}>
              {loading ? 'ලියාපදිංචි වෙමින්...' : 'ලියාපදිංචි වන්න'}
            </Button>
            <p className="text-xs text-center text-slate-500">
              දැනටමත් ගිණුමක් තිබේද? <Link href="/login" className="text-blue-600 font-semibold">ලොග් වන්න</Link>
            </p>
            <Button variant="ghost" size="sm" asChild className="text-slate-400">
              <Link href="/" className="flex items-center justify-center gap-1"><ArrowLeft className="h-3 w-3" /> ප්‍රධාන පිටුවට</Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}