'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { checkStudentStatus } from '../actions/checkStudent' // 💡 අලුත් සර්වර් ඇක්ෂන් එක ඉම්පෝර්ට් කරා
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

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

    // 💡 Input එකේ '@' නැත්නම් විතරක් ලමයෙක් විදිහට සලකනවා
    if (!inputVal.includes('@')) {
      const upperStudentId = inputVal.toUpperCase()
      email = `${upperStudentId.toLowerCase()}@system.com`

      // 🔐 සර්වර් ඇක්ෂන් එක හරහා ආරක්ෂිතව ස්ටේටස් එක බලනවා
      const check = await checkStudentStatus(upperStudentId)

      if (check.status === 'not_found') {
        setError('❌ මෙම සිසු අංකය පද්ධතියේ ලියාපදිංචි කර නැත!')
        setLoading(false)
        return
      }

      if (check.status === 'not_approved') {
        setError('⏳ ඔබගේ ගිණුම තවමත් සර් විසින් අනුමත (Approve) කර නැත!')
        setLoading(false)
        return
      }

      if (check.status === 'error') {
        setError('පද්ධතියේ දෝෂයක් පවතී. නැවත උත්සාහ කරන්න.')
        setLoading(false)
        return
      }
    }

    // 🔐 සාමාන්‍ය පරිදි Auth එක හරහා Sign In කිරීම
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: bookNumber.trim(),
      })

      if (authError) {
        setError('ඇතුලත් කල තොරතුරු වැරදියයි! (ID එක හෝ පොතේ අංකය නැවත පරීක්ෂා කරන්න)')
        setLoading(false)
        return
      }

      if (!inputVal.includes('@')) {
        router.push('/dashboard') // ශිෂ්‍යයා
      } else {
        router.push('/teacher') // ගුරුවරයා
      }

      router.refresh()
    } catch (err) {
      setError('ලොග් වීමට නොහැක. පද්ධතියේ දෝෂයකි.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-lg border border-slate-200 bg-white">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">පද්ධතියට ඇතුල් වන්න</CardTitle>
          <CardDescription>ඔබේ තොරතුරු ඇතුලත් කර ගිණුමට ලොග් වන්න</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">සිසු අංකය හෝ විද්‍යුත් තැපෑල (Student ID / Email)</Label>
              <Input 
                id="username" 
                required 
                placeholder="උදා: ET26-A1234 හෝ sir@gmail.com" 
                value={studentId} 
                onChange={(e) => setStudentId(e.target.value)}
                disabled={loading}
                className="bg-slate-50/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">මුරපදය / පොතේ අංකය (Password / Book ID)</Label>
              <Input 
                id="password" 
                required 
                type="password" 
                placeholder="ඔබේ පොතේ අංකය ඇතුලත් කරන්න" 
                value={bookNumber} 
                onChange={(e) => setBookNumber(e.target.value)}
                disabled={loading}
                className="bg-slate-50/50"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
            <Button type="submit" className="w-full font-semibold shadow-sm" disabled={loading}>
              {loading ? 'ඇතුල් වෙමින්...' : 'ඇතුල් වන්න (Log In)'}
            </Button>
            <p className="text-xs text-center text-slate-500">
              නව ශිෂ්‍යයෙක්ද? <Link href="/register" className="text-blue-600 font-semibold hover:underline">මෙහි ලියාපදිංචි වන්න</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}