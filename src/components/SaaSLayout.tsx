import { Video, Globe, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import VideoRecorderWidget from './VideoRecorderWidget';
import Teleprompter from './Teleprompter';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import InitiativeModal from './InitiativeModal';

const HeartHeadphonesLogo = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 64 64" 
    className={className}
    style={{ overflow: 'visible' }}
  >
    <defs>
      <linearGradient id="gold-bright" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFE082" />
        <stop offset="50%" stopColor="#FFC107" />
        <stop offset="100%" stopColor="#FF8F00" />
      </linearGradient>

      <linearGradient id="gold-body" x1="0%" y1="10%" x2="100%" y2="90%">
        <stop offset="0%" stopColor="#FFF2CD" />
        <stop offset="30%" stopColor="#D4AF37" />
        <stop offset="70%" stopColor="#AA7C11" />
        <stop offset="100%" stopColor="#6C4C00" />
      </linearGradient>
      
      <linearGradient id="cushion" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#1A1A1A" />
        <stop offset="50%" stopColor="#333333" />
        <stop offset="100%" stopColor="#000000" />
      </linearGradient>

      <filter id="royal-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur1" />
        <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur2" />
        <feMerge>
          <feMergeNode in="blur2" />
          <feMergeNode in="blur1" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    
    <g filter="url(#royal-glow)">
      {/* White Heart */}
      <path d="M 32 46 C 32 46, 16 30, 16 18 C 16 10, 23 6, 28 10 C 30 12, 32 14, 32 14 C 32 14, 34 12, 36 10 C 41 6, 48 10, 48 18 C 48 30, 32 46, 32 46 Z" fill="#FFFFFF" transform="translate(0, 8)" />

      {/* Headphones (raised and widened to frame the heart) */}
      <g transform="translate(0, -10)">
        {/* Headphone Band */}
        <path d="M 6 32 C 6 4, 58 4, 58 32" fill="none" stroke="url(#gold-bright)" strokeWidth="6" strokeLinecap="round" />
        
        {/* Headphone Band padding/leather */}
        <path d="M 8 30 C 8 10, 56 10, 56 30" fill="none" stroke="#222" strokeWidth="4" strokeLinecap="round" />
        {/* Band details */}
        <path d="M 12 20 L 16 17 M 52 20 L 48 17" stroke="url(#gold-body)" strokeWidth="2" strokeLinecap="round" />

        {/* Headphones Earcups */}
        {/* Left Earcup */}
        <rect x="-2" y="26" width="12" height="22" rx="6" fill="url(#gold-body)" />
        <rect x="10" y="28" width="4" height="18" rx="2" fill="url(#cushion)" />
        {/* Left Cup details */}
        <path d="M 2 30 C 0 36, 0 40, 2 44" stroke="#111" strokeWidth="1" fill="none" />
        
        {/* Right Earcup */}
        <rect x="54" y="26" width="12" height="22" rx="6" fill="url(#gold-body)" />
        <rect x="50" y="28" width="4" height="18" rx="2" fill="url(#cushion)" />
        {/* Right Cup details */}
        <path d="M 62 30 C 64 36, 64 40, 62 44" stroke="#111" strokeWidth="1" fill="none" />
        
        {/* Screws/Hinges on Headband */}
        <circle cx="6" cy="30" r="3" fill="#1A1A1A" stroke="url(#gold-body)" strokeWidth="1" />
        <circle cx="58" cy="30" r="3" fill="#1A1A1A" stroke="url(#gold-body)" strokeWidth="1" />
      </g>
    </g>
  </svg>
);

export default function SaaSLayout() {
  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [showTeleprompter, setShowTeleprompter] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="bg-[#fdfdf9] text-slate-900 dark:bg-slate-950 dark:text-white font-sans flex flex-col min-h-screen overflow-x-hidden selection:bg-lime-500/30 dark:selection:bg-indigo-500/30 transition-colors duration-300">
      {/* Navbar */}
        <div className="flex bg-[#fdfdf9] dark:bg-slate-950 items-center justify-between px-6 py-4 lg:py-6 lg:px-12 border-b border-lime-900/10 dark:border-white/5 shrink-0 z-50 transition-colors duration-300">
          <div onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 group cursor-pointer mr-4" title={lang === 'ar' ? 'معلومات عن المبادرة' : 'About Initiative'}>
            <HeartHeadphonesLogo className="w-8 h-8 transition-transform group-hover:scale-110" />
            <span className="font-sans font-bold text-xl tracking-tight hidden sm:block">{t('brand')}</span>
          </div>

          <nav className="flex items-center gap-2 md:gap-4 lg:gap-8 text-sm font-medium text-slate-600 dark:text-slate-400">
            <a href="#how-it-works" className="hidden md:block hover:text-lime-700 dark:hover:text-white transition-colors">{t('howItWorks')}</a>
            <a href="#features" className="hidden md:block hover:text-lime-700 dark:hover:text-white transition-colors">{t('features')}</a>
            <button 
              onClick={toggleTheme}
              className="flex items-center gap-2 hover:text-lime-700 dark:hover:text-white transition-colors shrink-0"
              title={lang === 'en' ? 'Toggle Theme' : 'تغيير المظهر'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button 
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              className="flex items-center gap-2 hover:text-lime-700 dark:hover:text-white transition-colors shrink-0"
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">{lang === 'en' ? 'العربية' : 'English'}</span>
              <span className="sm:hidden">{lang === 'en' ? 'ع' : 'EN'}</span>
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 sm:px-5 sm:py-2.5 bg-lime-600 dark:bg-white text-white dark:text-slate-950 rounded-full text-xs font-bold hover:bg-lime-700 dark:hover:bg-slate-200 transition-colors shrink-0"
            >
              {t('getStarted')}
            </button>
          </nav>
        </div>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col lg:flex-row px-6 lg:px-12 items-center justify-center lg:justify-between gap-12 lg:gap-8 py-12 lg:py-0 relative overflow-x-hidden min-h-[calc(100vh-5rem)]">
        {/* Left Column: Copy */}
        <div className={`w-full ${showTeleprompter ? 'lg:w-[70%] lg:flex-none' : 'lg:flex-1 lg:max-w-[55%]'} flex flex-col items-center text-center z-10 transition-all duration-500`}>
          {showTeleprompter ? (
            <Teleprompter onClose={() => setShowTeleprompter(false)} />
          ) : (
            <>
              <div className="inline-block px-3 py-1 mb-6 rounded-full bg-lime-500/10 dark:bg-indigo-500/10 border border-lime-500/30 dark:border-indigo-500/20 text-lime-700 dark:text-indigo-400 text-[10px] uppercase font-bold tracking-widest">
                {t('badge')}
              </div>
              
              <h1 
                onClick={() => setShowTeleprompter(true)}
                className={`mb-6 cursor-pointer hover:scale-[1.02] transition-transform w-full ${lang === 'ar' ? 'font-arabic text-5xl md:text-6xl lg:text-7xl xl:text-[5.5rem] leading-[1.2] flex flex-col gap-2 filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_12px_12px_rgba(0,0,0,1)] text-center' : 'text-5xl md:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tighter text-center'}`}
                title="Click to open Teleprompter"
              >
                <span className={`inline-flex items-center justify-center w-full leading-none group`}>
                  {lang === 'ar' && (
                     <span className="flex items-center">
                        <span className="bg-gradient-to-b from-lime-600 via-emerald-500 to-teal-600 dark:from-[#e0ffff] dark:via-[#40e0d0] dark:to-[#008080] bg-clip-text text-transparent [-webkit-text-stroke:0.5px_rgba(0,0,0,0.1)] dark:[-webkit-text-stroke:1px_rgba(255,255,255,0.4)]">
                           {t('title1')}
                        </span>
                        <HeartHeadphonesLogo className="w-[1.1em] h-[1.1em] shrink-0 mr-3 lg:mr-4 animate-[pulse_3s_ease-in-out_infinite] group-hover:scale-110 transition-transform duration-500" />
                     </span>
                  )}
                  {lang === 'en' && (
                     <span className="flex items-center">
                        <HeartHeadphonesLogo className="w-[1.1em] h-[1.1em] shrink-0 mr-3 lg:mr-4 animate-[pulse_3s_ease-in-out_infinite] group-hover:scale-110 transition-transform duration-500" />
                        <span>
                           {t('title1')}
                        </span>
                     </span>
                  )}
                </span>
                {lang === 'en' && <br/>}
                <span className={`${lang === 'ar' ? 'bg-gradient-to-b from-lime-600 via-emerald-500 to-teal-600 dark:from-[#e0ffff] dark:via-[#40e0d0] dark:to-[#008080] bg-clip-text text-transparent [-webkit-text-stroke:0.5px_rgba(0,0,0,0.1)] dark:[-webkit-text-stroke:1px_rgba(255,255,255,0.4)]' : 'italic font-serif text-lime-600 dark:text-indigo-400'}`}>
                  {t('title2')}
                </span>
              </h1>
              
              <p className={`text-base md:text-lg text-slate-500 dark:text-slate-400 leading-relaxed mb-10 max-w-lg text-center`}>
                {t('description')}
              </p>

              {/* Value props / Trust */}
              <div className="mt-4 lg:mt-12 flex items-center justify-center gap-6">
                <div className={`flex ${lang === 'ar' ? '-space-x-[-12px]' : '-space-x-3'}`}>
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-[#fdfdf9] dark:border-slate-950"></div>
                  <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-600 border-2 border-[#fdfdf9] dark:border-slate-950"></div>
                  <div className="w-8 h-8 rounded-full bg-slate-400 dark:bg-slate-500 border-2 border-[#fdfdf9] dark:border-slate-950"></div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-500 font-medium max-w-[150px]">
                  {t('trust')}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Right Column: The Widget */}
        <div id="recorder" className="relative flex justify-center shrink-0 w-full lg:w-auto z-20 pb-12 lg:pb-0">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] lg:-inset-20 h-full lg:h-auto bg-lime-400/20 dark:bg-indigo-600/20 blur-[80px] lg:blur-[100px] rounded-full pointer-events-none -z-10" />
           
           <div className="flex flex-col items-center gap-4 w-full max-w-[360px]">
               <div className="w-full shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-[2.5rem] bg-white dark:bg-slate-950 transition-colors duration-300 border border-slate-200 dark:border-transparent">
                   <VideoRecorderWidget />
               </div>
           </div>
        </div>
      </main>

      {/* How it works Section */}
      <section id="how-it-works" className="py-24 border-t border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <h2 className={`text-4xl font-light mb-16 text-center text-slate-900 dark:text-white ${lang === 'ar' ? 'font-arabic' : ''}`}>
             <span className={`${lang === 'ar' ? 'bg-gradient-to-b from-lime-600 via-emerald-500 to-teal-600 dark:from-[#e0ffff] dark:via-[#40e0d0] dark:to-[#008080] bg-clip-text text-transparent' : 'text-lime-600 dark:text-indigo-400 font-serif italic'}`}>{t('howItWorksTitle')}</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { num: "01", title: t('step1Title'), desc: t('step1Desc') },
              { num: "02", title: t('step2Title'), desc: t('step2Desc') },
              { num: "03", title: t('step3Title'), desc: t('step3Desc') }
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center p-6 border border-slate-200 dark:border-white/5 rounded-3xl bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors shadow-sm dark:shadow-none">
                 <div className="w-12 h-12 rounded-full bg-lime-100 dark:bg-indigo-500/10 flex items-center justify-center text-lime-700 dark:text-indigo-400 font-mono font-bold mb-6">
                    {step.num}
                 </div>
                 <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{step.title}</h3>
                 <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 border-t border-slate-200 dark:border-white/5 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <h2 className={`text-4xl font-light mb-16 text-center text-slate-900 dark:text-white ${lang === 'ar' ? 'font-arabic' : ''}`}>
            {t('featuresTitle')}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
             {[
               { icon: "🎥", title: t('feature1Title'), desc: t('feature1Desc') },
               { icon: "📝", title: t('feature2Title'), desc: t('feature2Desc') },
               { icon: "🔒", title: t('feature3Title'), desc: t('feature3Desc') }
             ].map((feat, i) => (
                <div key={i} className="flex gap-4 p-8 rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-gradient-to-b dark:from-white/[0.02] dark:to-transparent shadow-sm dark:shadow-none">
                  <div className="text-3xl">{feat.icon}</div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{feat.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
             ))}
          </div>
        </div>
      </section>

      {/* Bottom Bar Info */}
      <footer className="h-16 px-6 lg:px-12 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-500 uppercase tracking-widest font-medium shrink-0 transition-colors duration-300">
        <div className="hidden sm:flex gap-8">
          <span>{t('footer1')}</span>
          <span>{t('footer2')}</span>
          <span>{t('footer3')}</span>
        </div>
        <div className="flex gap-4 items-center mx-auto sm:mx-0">
          <div className="w-1 h-1 rounded-full bg-lime-500 dark:bg-indigo-500"></div>
          <span>{t('footerStatus')}</span>
        </div>
      </footer>

      {/* Interactive Initiative Modal */}
      <InitiativeModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        lang={lang} 
        onStartAction={() => {
          const el = document.getElementById('recorder');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />
    </div>
  );
}
