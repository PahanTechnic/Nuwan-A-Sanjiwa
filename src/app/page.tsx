// src/app/page.tsx
import Link from 'next/link'
import { Activity, Trophy, TrendingUp, ShieldCheck, ArrowRight, BookOpen, Users, BarChart3 } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nuwan A. Sanjeewa | Best A/L Engineering Technology Class — Kegalle Sri Lanka',
  description:
    'Engine with NAS — Nuwan A. Sanjeewa ගේ A/L Engineering Technology class. Kegalle district rank #1 ET class. Real-time student marks, leaderboard & progress analytics.',
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'Engine with NAS — Nuwan A. Sanjeewa',
  alternateName: ['NAS ET Class', 'Engine NAS', 'Nuwan A Sanjiwa'],
  description:
    'A/L Engineering Technology class by Nuwan A. Sanjeewa. Best ET class in Kegalle district, Sri Lanka with district rank #1 results.',
  url: 'https://your-domain.vercel.app',
  founder: {
    '@type': 'Person',
    name: 'Nuwan A. Sanjeewa',
    alternateName: 'NAS',
    jobTitle: 'A/L Engineering Technology Teacher',
    address: {
      '@type': 'PostalAddress',
      addressRegion: 'Kegalle',
      addressCountry: 'LK',
    },
  },
  address: {
    '@type': 'PostalAddress',
    addressRegion: 'Kegalle',
    addressCountry: 'LK',
  },
  areaServed: 'Sri Lanka',
  knowsAbout: [
    'Engineering Technology',
    'A/L Engineering Technology Sri Lanka',
    'Kegalle ET Class',
  ],
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-[#020617] font-[var(--font-geist-sans)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl border border-slate-200 flex items-center justify-center shrink-0">
              <Activity className="h-4 w-4" />
            </div>
            <span className="font-black text-sm tracking-tight">Engine with NAS</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="h-9 px-4 rounded-full text-sm font-medium border border-slate-200 hover:border-slate-300 transition-colors hidden sm:inline-flex items-center"
            >
              ලොග් වන්න
            </Link>
            <Link
              href="/register"
              className="h-9 px-4 rounded-full text-sm font-medium bg-[#020617] text-white hover:bg-slate-800 transition-colors inline-flex items-center"
            >
              ලියාපදිංචිය
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="px-4 sm:px-6 pt-16 sm:pt-28 pb-14 sm:pb-24 border-b border-slate-100">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-1.5 rounded-full text-xs font-medium text-slate-600 mb-6 sm:mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Analytics · Real-time Marks
          </div>

          <h1 className="text-4xl sm:text-7xl md:text-8xl font-black tracking-tight leading-[1.05] mb-4 sm:mb-6">
            Nuwan A. Sanjeewa
          </h1>

          <div className="max-w-2xl mx-auto bg-slate-50 border border-slate-200 rounded-2xl sm:rounded-3xl p-5 sm:p-8 mb-6 sm:mb-10">
            <p
              className="text-lg sm:text-2xl font-medium leading-relaxed text-slate-700 italic"
              style={{ fontFamily: 'var(--font-sinhala), sans-serif' }}
            >
              &quot;කොයි විදිහට කැම්පස් ගියත්, යන විදිහට එන්න වෙන පන්තිය!&quot;
            </p>
          </div>

          <p className="max-w-lg mx-auto text-sm sm:text-base text-slate-500 leading-relaxed mb-8 sm:mb-12">
            The official evaluation system for A/L Engineering Technology students —
            track paper marks, monitor progress, and compete on the leaderboard in real time.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-7 rounded-full bg-[#020617] text-white text-sm font-bold hover:bg-slate-800 transition-colors"
            >
              Student Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/teacher"
              className="w-full sm:w-auto inline-flex items-center justify-center h-11 px-7 rounded-full border border-slate-200 text-sm font-medium hover:border-slate-300 transition-colors"
              style={{ fontFamily: 'var(--font-sinhala), sans-serif' }}
            >
              ගුරු පැනලය
            </Link>
          </div>
        </div>
      </section>

      {/* ── STATS BAND ── */}
      <section className="border-b border-slate-100 px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto grid grid-cols-3 gap-4 sm:gap-8 text-center">
          {[
            { value: '100', label: 'Total Marks', unit: '/100' },
            { value: '3', label: 'Sections', unit: 'components' },
            { value: '#1', label: 'District Rank', unit: 'ET stream' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-3xl sm:text-5xl font-black text-[#020617] leading-none">
                {s.value}
                <span className="text-xs sm:text-sm font-medium text-slate-400 ml-1">{s.unit}</span>
              </p>
              <p className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest font-medium mt-1.5">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── MARKING SCHEME ── */}
      <section className="px-4 sm:px-6 py-12 sm:py-20 border-b border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-14">
            <p className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-slate-400 mb-2 sm:mb-4">
              Marking Scheme
            </p>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
              How your marks are calculated
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-3xl mx-auto">
            {[
              {
                label: 'Paper I — MCQ',
                desc: '50 questions × 0.7 marks each, scaled to /35',
                score: '35',
                icon: <BookOpen className="h-5 w-5" />,
              },
              {
                label: 'Paper II — Theory',
                desc: '4 Structured (/300) + 4 Essay (/400) questions, scaled to /35',
                score: '35',
                icon: <BarChart3 className="h-5 w-5" />,
              },
              {
                label: 'Practical Exam',
                desc: 'Lab-based assessment contributing directly to final grade',
                score: '30',
                icon: <Activity className="h-5 w-5" />,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="border border-slate-200 rounded-2xl sm:rounded-3xl p-5 sm:p-7 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="h-10 w-10 rounded-2xl border border-slate-200 flex items-center justify-center shrink-0 text-slate-600">
                    {item.icon}
                  </div>
                  <div className="h-10 w-10 rounded-2xl bg-[#020617] text-white flex flex-col items-center justify-center shrink-0">
                    <span className="text-sm font-black leading-none">{item.score}</span>
                    <span className="text-[9px] opacity-60">/100</span>
                  </div>
                </div>
                <div>
                  <p className="font-black text-sm text-[#020617]">{item.label}</p>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <div className="inline-flex flex-wrap items-center justify-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3">
              <span className="font-semibold text-[#020617]">Paper I</span>
              <span className="text-slate-300">/35</span>
              <span className="text-slate-400">+</span>
              <span className="font-semibold text-[#020617]">Paper II</span>
              <span className="text-slate-300">/35</span>
              <span className="text-slate-400">+</span>
              <span className="font-semibold text-[#020617]">Practical</span>
              <span className="text-slate-300">/30</span>
              <span className="text-slate-400">=</span>
              <span className="font-black text-[#020617] text-sm">100</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="px-4 sm:px-6 py-12 sm:py-20 border-b border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-14">
            <p className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-slate-400 mb-2 sm:mb-4">
              Platform features
            </p>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight"
              style={{ fontFamily: 'var(--font-sinhala), sans-serif' }}
            >
              පද්ධතියේ ඇති ප්‍රධාන පහසුකම්
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {[
              {
                icon: <TrendingUp className="h-5 w-5" />,
                title: 'Realtime Analytics',
                desc: 'Track every paper, every mark, every trendline as results are released live via Supabase.',
              },
              {
                icon: <Trophy className="h-5 w-5" />,
                title: 'Leaderboard & Progress',
                desc: 'See where you stand among peers and watch your ranking change across the year.',
              },
              {
                icon: <ShieldCheck className="h-5 w-5" />,
                title: 'Secure Student Profiles',
                desc: 'Private dashboards protected by Auth — your data stays yours, always.',
              },
              {
                icon: <BarChart3 className="h-5 w-5" />,
                title: 'Section Breakdown',
                desc: 'MCQ, Structured, Essay, and Practical — every section tracked separately with percentage insights.',
              },
              {
                icon: <Users className="h-5 w-5" />,
                title: 'Class Rank',
                desc: 'Automatic ranking among all active students based on cumulative average score.',
              },
              {
                icon: <Activity className="h-5 w-5" />,
                title: 'AI Study Assistant',
                desc: 'AI-powered insights based on your personal marks data — get study tips and score analysis.',
              },
            ].map((f) => (
              <div key={f.title} className="border border-slate-200 rounded-2xl sm:rounded-3xl p-5 sm:p-7 flex flex-col gap-3">
                <div className="h-9 w-9 rounded-2xl border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                  {f.icon}
                </div>
                <div>
                  <p className="font-black text-sm text-[#020617]">{f.title}</p>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DISTRICT RANKS ── */}
      <section className="bg-[#020617] text-white px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-slate-400 mb-3 sm:mb-5">
            Track record
          </p>
          <h2
            className="text-3xl sm:text-5xl font-black tracking-tight mb-4"
            style={{ fontFamily: 'var(--font-sinhala), sans-serif' }}
          >
            විශිෂ්ටත්වයේ සැබෑ සාක්ෂිය
          </h2>
          <p className="max-w-md mx-auto text-sm text-slate-400 mb-12 sm:mb-16 leading-relaxed">
            Proven excellence — students from this class have consistently ranked among the very best
            in the district for Engineering Technology.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-3xl mx-auto">
            {[
              { rank: '01', year: '2024 A/L' },
              { rank: '02', year: '2023 A/L' },
              { rank: '03', year: '2022 A/L' },
            ].map((item) => (
              <div
                key={item.rank}
                className="border border-slate-800 rounded-2xl sm:rounded-3xl p-6 sm:p-10 flex flex-col items-center"
              >
                <p className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-slate-500 mb-2">
                  District Rank
                </p>
                <p className="text-7xl sm:text-9xl font-black leading-none text-white">{item.rank}</p>
                <p className="text-xs text-slate-500 mt-3 font-medium">{item.year} · Engineering Technology</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-4 sm:px-6 py-16 sm:py-24 border-b border-slate-100">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-4">
            Ready to track your progress?
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
            Register with your student ID and Book ID to access your personalized dashboard.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-12 px-8 rounded-full bg-[#020617] text-white text-sm font-bold hover:bg-slate-800 transition-colors"
              style={{ fontFamily: 'var(--font-sinhala), sans-serif' }}
            >
              ලියාපදිංචි වන්න <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-8 rounded-full border border-slate-200 text-sm font-medium hover:border-slate-300 transition-colors"
              style={{ fontFamily: 'var(--font-sinhala), sans-serif' }}
            >
              දැනටමත් ගිණුමක් තිබේද? ලොග් වන්න
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-100 py-8 px-6 text-center">
        <p className="text-xs text-slate-400">
          © 2026 Engine with NAS. Powered by Engineering Technology Stream.
        </p>
        <p className="text-xs text-slate-300 mt-1">
          Designed & Developed for Nuwan A. Sanjeewa (ET Sir).
        </p>
      </footer>

    </div>
  )
}