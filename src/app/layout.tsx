import type { Metadata } from 'next'
import  Roboto_Mono, Noto_Sans_Sinhala } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
// Component එකේ නම FloatingWidget විදිහට update කරා (උඹේ file name එක PWAInstallButton නම් import path එක වෙනස් කරන්න එපා)
import PWAInstallFloatingWidget from '@/components/PWAInstallButton'


const robotoMono = Roboto_Mono({ variable: '--font-roboto-mono', subsets: ['latin'] })
const notoSinhala = Noto_Sans_Sinhala({
  subsets: ['sinhala'],
  weight: ['400', '700', '900'],
  variable: '--font-sinhala',
})

const siteUrl = 'https://nuwan-a-sanjiwa.vercel.app/'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: 'Engine with NAS | Nuwan A. Sanjeewa — A/L Engineering Technology Sri Lanka',
    template: '%s | Engine with NAS',
  },
  description:
    'Nuwan A. Sanjeewa (NAS) ගේ A/L Engineering Technology class — Sri Lanka\'s best ET class in Kegalle district. Real-time student marks analytics, leaderboard & progress tracking for ET students.',

  keywords: [
    'Nuwan A Sanjeewa',
    'Nuwan A Sanjiwa',
    'NAS',
    'NAS teacher',
    'Engine with NAS',
    'Engineering Technology Sri Lanka',
    'ET class Sri Lanka',
    'A/L Engineering Technology',
    'best ET class Sri Lanka',
    'Kegalle ET class',
    'Kegalle Engineering Technology',
    'district rank ET',
    'ET student dashboard',
    'Engineering Technology marks',
    'A/L ET marks tracking',
    'නුවන් සංජීව',
    'ඉංජිනේරු තාක්ෂණය',
    'කෑගල්ල ET class',
  ],

  authors: [{ name: 'Nuwan A. Sanjeewa' }],
  creator: 'Nuwan A. Sanjeewa',
  publisher: 'Engine with NAS',

  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'Engine with NAS',
    title: 'Engine with NAS | Nuwan A. Sanjeewa — Best ET Class in Sri Lanka',
    description:
      'Nuwan A. Sanjeewa ගේ A/L Engineering Technology class — Kegalle district rank #1. Student marks analytics, leaderboard & real-time progress.',
    images: [
      {
        url: '/web/icon-512.png',
        width: 512,
        height: 512,
        alt: 'Engine with NAS — NAS Engineering Technology',
      },
    ],
    locale: 'si_LK',
  },

  twitter: {
    card: 'summary',
    title: 'Engine with NAS | Nuwan A. Sanjeewa ET Class',
    description: 'Best A/L Engineering Technology class in Kegalle, Sri Lanka. Real-time marks & leaderboard.',
    images: ['/web/icon-512.png'],
  },

  alternates: {
    canonical: siteUrl,
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
    },
  },

  manifest: '/manifest.json',

  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Engine NAS',
  },

  icons: {
    icon: [
      { url: '/web/favicon.ico', sizes: 'any' },
      { url: '/web/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/web/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/web/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },

  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'application-name': 'Engine NAS',
    'theme-color': '#020617',
'google-site-verification': 'lOqzfMch6FfNxtjo4cf0RDjxRDjNTddsZYnpaJDw0TY',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="si"
      className={cn(
        'h-full antialiased',
        robotoMono.variable,
        notoSinhala.variable,
        'font-sans',
      )}
    >
      <body className="min-h-full flex flex-col bg-white text-[#020617]">
        {/* Main Content ටික මුලින්ම Render වෙනවා */}
        {children}

        {/* Floating Widget එක යටින්ම දැම්මා (Z-Index එකයි screen එකට උඩින් float වෙන එකයි පට්ට clean වෙන්න) */}
        <PWAInstallFloatingWidget />
      </body>
    </html>
  )
}