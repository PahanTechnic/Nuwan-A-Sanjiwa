'use client'

import { useEffect, useState } from 'react'
import { Download, Share2, X, Smartphone } from 'lucide-react'

// BeforeInstallPromptEvent — TypeScript type
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallFloatingWidget() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSHint, setShowIOSHint] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // දැනටමත් installed ද check කරනවා
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }

    // iOS detect
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(ios)

    // Android Chrome — beforeinstallprompt event catch කරනවා
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Already installed නම් හෝ prompt දෙකම නැත්නම් widget එක hide කරනවා
  if (installed) return null
  if (!deferredPrompt && !isIOS) return null

  return (
    <>
      {/* ── Floating Action Button (Fixed to bottom right) ────────────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end font-sans">
        
        {/* Android / Desktop Button */}
        {deferredPrompt && (
          <button
            onClick={async () => {
              await deferredPrompt.prompt()
              const { outcome } = await deferredPrompt.userChoice
              if (outcome === 'accepted') {
                setInstalled(true)
                setDeferredPrompt(null)
              }
            }}
            className="flex items-center gap-2 h-12 px-5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium text-sm shadow-xl hover:scale-105 active:scale-95 transition-all"
          >
            <Download className="h-4 w-4 animate-bounce" />
            <span>Install App</span>
          </button>
        )}

        {/* iOS Button */}
        {isIOS && (
          <button
            onClick={() => setShowIOSHint(true)}
            className="flex items-center gap-2 h-12 px-5 rounded-full bg-indigo-600 text-white font-medium text-sm shadow-xl hover:scale-105 active:scale-95 transition-all"
          >
            <Smartphone className="h-4 w-4" />
            <span>Get App</span>
          </button>
        )}
      </div>

      {/* ── iOS Instruction Drawer / Modal ───────────────────────────────────────────────── */}
      {showIOSHint && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <button
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowIOSHint(false)}
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl p-5 z-50 animate-in fade-in-50 slide-in-from-bottom-5 duration-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-0.5">iOS Safari Instruction</p>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Add to Home Screen</h3>
              </div>
              <button
                onClick={() => setShowIOSHint(false)}
                className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ol className="space-y-2.5">
              {[
                { step: '1', text: 'Safari browser එකේ bottom toolbar එකේ', icon: '↑', sub: 'Share button (box with arrow up) tap කරන්න' },
                { step: '2', text: 'Scroll down කරලා', icon: '+', sub: '"Add to Home Screen" එක තෝරන්න' },
                { step: '3', text: 'Name confirm කරලා', icon: '✓', sub: 'Top right එකේ තියෙන "Add" ක්ලික් කරන්න' },
              ].map(item => (
                <li key={item.step} className="flex gap-3 items-start rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
                  <span className="h-5 w-5 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {item.step}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {item.text} <span className="font-bold text-indigo-500">{item.icon}</span>
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{item.sub}</p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-4 text-center">
              ⚠️ මේ වැඩේට Safari browser එකම පාවිච්චි කරන්න.
            </p>
          </div>
        </div>
      )}
    </>
  )
}