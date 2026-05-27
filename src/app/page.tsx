// src/app/page.tsx
import Link from 'next/link'
import { Noto_Serif_Sinhala, Noto_Sans_Sinhala } from 'next/font/google'

// Fonts setup - Standard Google Fonts for Sinhala
const notoSansSinhala = Noto_Sans_Sinhala({
  subsets: ['sinhala'],
  weight: ['400', '700'],
  variable: '--font-noto-sans',
})

const notoSerifSinhala = Noto_Serif_Sinhala({
  subsets: ['sinhala'],
  weight: ['400', '700'],
  variable: '--font-noto-serif',
})

export default function LandingPage() {
  return (
    <div className={`min-h-screen ${notoSansSinhala.variable} ${notoSerifSinhala.variable} font-noto-sans bg-white text-black`}>
      
      

      {/* --- 2. Hero Section --- */}
      <main className="max-w-[1400px] mx-auto px-6 pt-32 pb-24 flex flex-col items-center text-center">
        {/* Top Tagline */}
        <div className="inline-flex items-center gap-2 bg-[#f4f4f5] border border-[#e4e4e7] px-4 py-1.5 rounded-full text-sm font-medium text-gray-700 shadow-inner mb-6">
          ✨ ඉංජිනේරු විද්‍යාවේ සන්නායකතාවය
        </div>

        {/* Name Heading */}
        <h1 className="text-[72px] leading-tight font-black tracking-tighter text-gray-950 mb-10">
          Nuwan A. Sanjeewa
        </h1>

        {/* Quote in Noto Serif Sinhala with specific background */}
        <div className="bg-[#f8f8f8] border border-gray-100 rounded-3xl p-10 max-w-[800px] shadow-lg mb-10">
          <p className="font-noto-serif text-3xl font-medium leading-normal text-gray-800 italic">
            &quot;කොයි විදිහට කැම්පස් ගියත්, යන විදිහට එන්න වෙන පන්තිය!&quot;
          </p>
        </div>

        {/* Subtitle text */}
        <p className="max-w-[650px] text-lg text-gray-600 font-light mb-12">
          The official evaluation system for A/L Engineering Technology students — track paper marks, monitor progress, and compete on the leaderboard in real time.
        </p>

        {/* Call to Action Buttons */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="bg-black text-white px-8 py-3.5 rounded-full font-semibold shadow-sm hover:bg-black/90 transition text-sm">
            Student Dashboard
          </Link>
          <Link href="/teacher" className="bg-white text-black px-8 py-3.5 rounded-full font-semibold border border-gray-200 hover:bg-gray-50 transition text-sm">
            ගුරු පැනලය
          </Link>
        </div>
      </main>

      {/* --- 3. Districts Ranks Section (Dark Background) --- */}
      <section className="bg-[#0a0a0a] text-white py-24">
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col items-center text-center">
          <h2 className="text-5xl font-bold font-noto-sans leading-tight text-white mb-6">
            විශිෂ්ටත්වයේ සැබෑ සාක්ෂිය
          </h2>
          <p className="max-w-[600px] text-lg text-gray-400 font-light mb-20">
            Proven excellence — students from this class have consistently ranked among the very best in the district.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-[1100px]">
            {[ { rank: '01', title: 'Realtime Analytics', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
               { rank: '02', title: 'Leaderboard & Progress', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
               { rank: '03', title: 'Secure Student Profiles', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' }
            ].map((item, index) => (
              <div key={index} className="bg-[#141414] border border-[#1f1f1f] rounded-2xl p-8 flex flex-col items-center text-center shadow-inner">
                <div className="bg-[#1c1c1c] p-4 rounded-xl border border-[#262626] shadow-inner mb-6">
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-600 mb-3">DISTRICT RANK</p>
                <p className="text-[120px] font-black tracking-tighter text-white leading-none mb-4">{item.rank}</p>
                <p className="text-sm font-semibold text-gray-600">Engineering Technology</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- 4. Features Section (Light Background) --- */}
      <section className="bg-white py-24">
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col items-center text-center">
          <h2 className="text-5xl font-bold font-noto-sans leading-tight text-gray-950 mb-6">
            පද්ධතියේ ඇති ප්‍රධාන පහසුකම්
          </h2>
          <p className="max-w-[600px] text-lg text-gray-600 font-light mb-20">
            A focused toolkit built for serious students — clean, fast, and distraction-free.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-[1100px]">
            {[ { title: 'Realtime Analytics', desc: 'Track every paper, every mark, every trendline as results are released.' },
               { title: 'Leaderboard & Progress', desc: 'See where you stand among peers and watch your growth across the year.' },
               { title: 'Secure Student Profiles', desc: 'Private, protected dashboards — your data stays yours, always.' }
            ].map((item, index) => (
              <div key={index} className="bg-white border border-gray-100 rounded-2xl p-8 flex flex-col items-start text-left shadow-sm">
                <p className="text-xl font-bold tracking-tight text-gray-900 mb-2">{item.title}</p>
                <p className="text-sm text-gray-600 leading-relaxed font-light">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- 5. Footer --- */}
      <footer className="border-t border-gray-100 bg-white py-10">
        <div className="max-w-[1400px] mx-auto px-6 text-center">
          <p className="text-xs text-gray-600 font-light">
            © 2026 Engine with NAS. Powered by Engineering Technology Stream.
          </p>
          <p className="text-xs text-gray-400 font-light mt-1">
            Designed & Developed for Nuwan A. Sanjeewa (ET Sir).
          </p>
        </div>
      </footer>

    </div>
  )
}