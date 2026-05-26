// src/app/page.tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, LineChart, Users, ShieldCheck, Smartphone, Award } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navbar - Mobile Friendly */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-sm border-b shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              ProgressTracker
            </span>
          </div>
          <Button asChild variant="default" size="sm" className="rounded-full shadow-sm">
            <Link href="/login">ඇතුල් වන්න</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-12 md:py-20 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium bg-blue-50 text-blue-700 border-blue-200">
              <Award className="h-4 w-4 mr-1" />
              ශිෂ්‍ය ප්‍රගති විශ්ලේෂණය
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
              ඔබේ පේපර් ලකුණු මට්ටම{' '}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                ක්ෂණිකව පරීක්ෂා කරගන්න!
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              MCQ, ව්‍යුහගත සහ රචනා ප්‍රශ්නවල ලකුණු ප්‍රස්ථාර ඇසුරින් විශ්ලේෂණය කර ඔබේ දක්ෂතා වර්ධනය කරගන්න.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" asChild className="px-8 py-6 text-md font-semibold shadow-md rounded-full">
                <Link href="/register">නව ලියාපදිංචිය</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="px-8 py-6 text-md rounded-full">
                <Link href="/login">ලොග් වන්න</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Grid - Mobile Responsive */}
        <section className="container mx-auto px-4 py-12 md:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border shadow-sm hover:shadow-md transition-all">
              <CardHeader>
                <LineChart className="h-8 w-8 text-blue-600 mb-2" />
                <CardTitle>ප්‍රගති ප්‍රස්ථාර</CardTitle>
                <CardDescription>කාලයත් සමඟ ඔබේ මුළු ලකුණු වර්ධනය දෘශ්‍යමාන කරන්න</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">සෑම පේපරයකම වෙනස්වීම් රේඛා ප්‍රස්ථාරයෙන් නිරීක්ෂණය කරන්න.</p>
              </CardContent>
            </Card>
            <Card className="border shadow-sm hover:shadow-md transition-all">
              <CardHeader>
                <Users className="h-8 w-8 text-blue-600 mb-2" />
                <CardTitle>ප්‍රශ්න මට්ටම්</CardTitle>
                <CardDescription>MCQ, ව්‍යුහගත, රචනා අතර වෙනස</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">එක් එක් ප්‍රශ්න කොටසේ ලකුණු වෙන වෙනම බලන්න.</p>
              </CardContent>
            </Card>
            <Card className="border shadow-sm hover:shadow-md transition-all">
              <CardHeader>
                <ShieldCheck className="h-8 w-8 text-blue-600 mb-2" />
                <CardTitle>ආරක්ෂිත පිවිසුම</CardTitle>
                <CardDescription>ගුරු අනුමැතිය සහිත ගිණුම්</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">ගුරුවරයා විසින් අනුමත කළ පසු පමණක් ලොග් විය හැක.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-12 md:py-16 mt-8">
          <div className="container mx-auto px-4 text-center space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold">අදම ඔබේ ප්‍රගතිය ආරම්භ කරන්න</h2>
            <p className="text-blue-100 max-w-md mx-auto">ගුරුවරයාගෙන් ලබාගත් පොත් අංකය සමඟ ලියාපදිංචි වන්න.</p>
            <Button asChild size="lg" variant="secondary" className="rounded-full">
              <Link href="/register">ලියාපදිංචි වන්න</Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-6 text-center text-sm text-slate-500">
        <div className="container mx-auto px-4">
          <p>© {new Date().getFullYear()} ProgressTracker. සියලුම හිමිකම් ඇවිරිණි.</p>
        </div>
      </footer>
    </div>
  )
}