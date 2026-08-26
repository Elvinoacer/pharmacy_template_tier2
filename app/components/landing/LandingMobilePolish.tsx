"use client";

export default function LandingMobilePolish() {
  return (
    <style jsx global>{`
      @keyframes landing-press {
        0% { transform: scale(1); }
        45% { transform: scale(.965); }
        100% { transform: scale(.985); }
      }

      @keyframes landing-ripple {
        from { transform: translate(-50%, -50%) scale(0); opacity: .5; }
        to { transform: translate(-50%, -50%) scale(2.6); opacity: 0; }
      }

      .landing-root a,
      .landing-root button,
      .landing-root [role="button"] {
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        transition: transform .18s cubic-bezier(.2,.8,.2,1), box-shadow .22s ease, background-color .22s ease, border-color .22s ease, color .22s ease, opacity .18s ease !important;
      }

      @media (hover: hover) {
        .landing-root a:hover,
        .landing-root button:hover,
        .landing-root [role="button"]:hover {
          transform: translateY(-2px);
        }
      }

      .landing-root a:active,
      .landing-root button:active,
      .landing-root [role="button"]:active {
        animation: landing-press .2s cubic-bezier(.2,.8,.2,1) both;
      }

      .landing-root a:focus-visible,
      .landing-root button:focus-visible,
      .landing-root [role="button"]:focus-visible {
        outline: 2px solid rgba(52,211,153,.9) !important;
        outline-offset: 3px !important;
      }

      /* Background art is allowed to crop for portrait screens instead of looking like a shrunken desktop image. */
      @media (max-width: 639px) {
        .landing-root { padding-bottom: calc(104px + env(safe-area-inset-bottom)) !important; overflow-x: clip; }

        .travel-lab-hero { min-height: auto !important; }
        .travel-lab-hero .travel-lab-hero-slide { transform: scale(1.08); transform-origin: center; }
        .travel-lab-hero .travel-lab-hero-frame { object-position: 58% center !important; }
        .travel-lab-hero > .absolute .bg-gradient-to-r { background: linear-gradient(90deg, rgba(3,9,7,.82), rgba(3,9,7,.28) 70%, rgba(3,9,7,.12)) !important; }

        #network > .absolute > span,
        #network > .absolute img { transform: scale(1.13); object-position: 62% center !important; }
        #network > .absolute { overflow: hidden; }

        .travel-lab-hero > .relative.z-10 { padding-top: calc(82px + env(safe-area-inset-top)) !important; padding-bottom: 24px !important; padding-left: 18px !important; padding-right: 18px !important; }
        .travel-lab-hero > .relative.z-10 > .grid { gap: 22px !important; }

        .travel-lab-hero-kicker { padding: 6px 10px !important; max-width: 100%; }
        .travel-lab-hero-kicker span:last-child { font-size: 9px !important; letter-spacing: .11em !important; white-space: nowrap; }
        .travel-lab-hero-headline { margin-top: 14px !important; font-size: clamp(2.45rem, 11vw, 3.15rem) !important; line-height: .98 !important; letter-spacing: -.045em !important; }
        .travel-lab-hero-sub { margin-top: 14px !important; font-size: 14px !important; line-height: 1.55 !important; max-width: 34ch !important; }
        .travel-lab-hero-cta { margin-top: 18px !important; }

        form.travel-lab-hero-cta { min-height: 54px; padding: 4px !important; border-radius: 16px !important; }
        form.travel-lab-hero-cta input { font-size: 14px !important; }
        form.travel-lab-hero-cta button { width: 46px !important; height: 46px !important; }

        /* Primary CTA becomes the obvious full-width action; secondary action remains lighter. */
        .travel-lab-hero .travel-lab-hero-cta.flex.flex-wrap { display: grid !important; grid-template-columns: 1fr !important; gap: 9px !important; width: 100%; }
        .travel-lab-hero .travel-lab-hero-cta.flex.flex-wrap > a,
        .travel-lab-hero .travel-lab-hero-cta.flex.flex-wrap > button { min-height: 46px; width: 100%; justify-content: center; }
        .travel-lab-hero .travel-lab-hero-cta.flex.flex-wrap > a { border-radius: 14px !important; box-shadow: 0 8px 22px rgba(34,197,94,.24) !important; }
        .travel-lab-hero .travel-lab-hero-cta.flex.flex-wrap > button { border: 1px solid rgba(255,255,255,.12); border-radius: 14px; background: rgba(0,0,0,.26); }

        .travel-lab-hero .travel-lab-hero-cta.mt-8.flex.items-center { margin-top: 18px !important; padding-top: 14px; border-top: 1px solid rgba(255,255,255,.08); }
        .travel-lab-hero .travel-lab-hero-cta.mt-8.flex.items-center img { width: 30px !important; height: 30px !important; }

        .travel-lab-hero .lg\\:col-span-5 > .relative.rounded-\\[2rem\\] { padding: 14px !important; border-radius: 20px !important; }
        .travel-lab-hero .lg\\:col-span-5 > .relative .mt-6 { margin-top: 12px !important; }
        .travel-lab-hero .lg\\:col-span-5 h2 { font-size: 16px !important; }
        .travel-lab-hero .lg\\:col-span-5 a { padding: 11px !important; min-height: 62px; }

        #network { padding: 52px 18px !important; }
        #network .grid { gap: 24px !important; }
        #network h2 { font-size: clamp(2.05rem, 9.4vw, 2.7rem) !important; line-height: 1.02 !important; }
        #network h2 br { display: none; }
        #network p { max-width: 36ch; }
        #network form { margin-top: 20px !important; min-height: 54px; border-radius: 16px !important; }
        #network form input { min-width: 0; font-size: 13px !important; }
        #network form button { width: 46px !important; height: 46px !important; }
        #network .mt-6.max-w-md.rounded-2xl { margin-top: 14px !important; padding: 10px !important; }
        #network .mt-6.max-w-md.rounded-2xl > .grid { gap: 6px !important; }
        #network .mt-6.max-w-md.rounded-2xl .flex.items-start { padding: 7px 3px; }
        #network .mt-6.max-w-md.rounded-2xl .h-9.w-9 { width: 32px !important; height: 32px !important; border-radius: 10px !important; }
        #network .mt-6.max-w-md.rounded-2xl h3 { font-size: 11px !important; }
        #network .mt-6.max-w-md.rounded-2xl p { font-size: 9px !important; }
        #network .mb-3\\.5.flex.items-center.justify-between { align-items: flex-start !important; flex-direction: column !important; }
        #network .mb-3\\.5 .flex.items-center.gap-2:first-child { width: 100%; padding-bottom: 4px; scrollbar-width: none; }
        #network .mb-3\\.5 .flex.items-center.gap-2:first-child::-webkit-scrollbar { display: none; }
        #network .relative.w-full.overflow-hidden.rounded-\\[2rem\\] { padding: 10px !important; border-radius: 20px !important; }
        #network .relative.w-full.overflow-hidden.rounded-\\[2rem\\] .aspect-\\[16\\/9\\] { border-radius: 15px !important; aspect-ratio: 4 / 3 !important; }

        /* Compress the remaining landing sections without affecting content semantics. */
        .landing-root section:not(.travel-lab-hero):not(#network) { padding-top: 52px !important; padding-bottom: 52px !important; }
        .landing-root section:not(.travel-lab-hero):not(#network) h2 { font-size: clamp(1.9rem, 8.5vw, 2.55rem) !important; line-height: 1.08 !important; }
        .landing-root section:not(.travel-lab-hero):not(#network) p { line-height: 1.55; }

        #demo, #contact { scroll-margin-top: 20px; }
        section:not(.travel-lab-hero):not(#network) { scroll-margin-bottom: 112px; }
      }

      @media (min-width: 640px) and (max-width: 1023px) {
        .landing-root { padding-bottom: 0 !important; }
        .travel-lab-hero-headline { font-size: clamp(3.7rem, 8vw, 5rem) !important; }
      }

      @media (pointer: coarse) {
        .landing-root a,
        .landing-root button,
        .landing-root [role="button"] { min-height: 44px; }
      }

      @media (prefers-reduced-motion: reduce) {
        .landing-root *, .landing-root *::before, .landing-root *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
      }
    `}</style>
  );
}
