'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { checkStudentStatus } from '../actions/checkStudent'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft, LogIn, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [studentId, setStudentId] = useState('')
  const [bookNumber, setBookNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const inputVal = studentId.trim()
    let email = inputVal

    if (!inputVal.includes('@')) {
      const upperStudentId = inputVal.toUpperCase()
      email = `${upperStudentId.toLowerCase()}@system.com`

      const check = await checkStudentStatus(upperStudentId)

      if (check.status === 'not_found') {
        setError('❌ මෙම සිසු අංකය පද්ධතියේ ලියාපදිංචි කර නැත!')
        setLoading(false)
        return
      }

      if (check.status === 'not_approved') {
        setError('⏳ ඔබගේ ගිණුම තවමත් සර් විසින් අනුමත කර නැත!')
        setLoading(false)
        return
      }

      if (check.status === 'error') {
        setError('පද්ධතියේ දෝෂයක් පවතී. නැවත උත්සාහ කරන්න.')
        setLoading(false)
        return
      }
    }

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: bookNumber.trim(),
      })

      if (authError) throw authError

      if (!inputVal.includes('@')) {
        router.push('/dashboard')
      } else {
        router.push('/teacher')
      }
      router.refresh()
    } catch (err) {
      setError('ඇතුලත් කල තොරතුරු වැරදියයි! (ID එක හෝ පොතේ අංකය නැවත පරීක්ෂා කරන්න)')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-0 sm:border sm:shadow-lg bg-white/90 backdrop-blur-sm sm:bg-white">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-2">
            <LogIn className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">පද්ධතියට ඇතුල් වන්න</CardTitle>
          <CardDescription>ඔබේ සිසු අංකය හෝ ඊමේල් ලබාදෙන්න</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">සිසු අංකය හෝ විද්‍යුත් තැපෑල</Label>
              <Input 
                id="username" 
                required 
                placeholder="උදා: ET26-A1234 හෝ sir@gmail.com" 
                value={studentId} 
                onChange={(e) => setStudentId(e.target.value)}
                disabled={loading}
                className="bg-slate-50 border-slate-200 focus:border-blue-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">මුරපදය / පොතේ අංකය</Label>
              <Input 
                id="password" 
                required 
                type="password" 
                placeholder="ඔබේ පොතේ අංකය ඇතුලත් කරන්න" 
                value={bookNumber} 
                onChange={(e) => setBookNumber(e.target.value)}
                disabled={loading}
                className="bg-slate-50 border-slate-200"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full rounded-full shadow-sm" disabled={loading}>
              {loading ? 'ඇතුල් වෙමින්...' : 'ඇතුල් වන්න'}
            </Button>
            <div className="text-center text-sm">
              <span className="text-slate-500">නව ශිෂ්‍යයෙක්ද? </span>
              <Link href="/register" className="text-blue-600 font-semibold hover:underline">
                ලියාපදිංචි වන්න
              </Link>
            </div>
            <Button variant="ghost" size="sm" asChild className="w-full text-slate-400">
              <Link href="/" className="flex items-center justify-center gap-1">
                <ArrowLeft className="h-3 w-3" /> ප්‍රධාන පිටුවට
              </Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}