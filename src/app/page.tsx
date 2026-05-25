// src/app/page.tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Navbar */}
      <header className="px-6 h-16 flex items-center justify-between bg-white border-b shadow-sm">
        <div className="flex items-center space-x-2">
          <span className="text-xl font-bold text-blue-600 tracking-tight">Progress Tracker</span>
        </div>
        <Button asChild variant="outline">
          <Link href="/login">ඇතුල් වන්න (Login)</Link>
        </Button>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-12 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-2xl space-y-6">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            ඔබේ පේපර් ලකුණු මට්ටම <br />
            <span className="text-blue-600">ක්ෂණිකව පරීක්ෂා කරගන්න!</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-lg mx-auto leading-relaxed">
            පන්තියේ පවත්වන ලද පරීක්ෂණවල MCQ, ව්‍යුහගත සහ රචනා ප්‍රශ්නවල ලකුණු ප්‍රස්ථාර ඇසුරින් ලස්සනට විශ්ලේෂණය කර ඔබේ දක්ෂතා වර්ධනය කරගන්න.
          </p>
          <div className="pt-4">
            <Button size="lg" asChild className="px-8 py-6 text-md font-semibold shadow-md">
              <Link href="/login">ලකුණු බලන්න මෙතනින් යන්න</Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-slate-500 border-t bg-white">
        © {new Date().getFullYear()} Progress Tracker. Powered by Next.js & Supabase.
      </footer>
    </div>
  )
}