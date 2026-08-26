"use client";

export default function LandingMobilePolish() {
  return (
    <style jsx global>{`
      @media (max-width: 639px) {
        .landing-root { padding-bottom: calc(104px + env(safe-area-inset-bottom)) !important; overflow-x: clip; }
        .travel-lab-hero { min-height: auto !important; }
        .travel-lab-hero > .relative.z-10 { padding-top: calc(92px + env(safe-area-inset-top)) !important; padding-bottom: 32px !important; padding-left: 20px !important; padding-right: 20px !important; }
        .travel-lab-hero > .relative.z-10 > .grid { gap: 28px !important; }
        .travel-lab-hero-kicker { padding: 7px 11px !important; max-width: 100%; }
        .travel-lab-hero-kicker span:last-child { font-size: 10px !important; letter-spacing: .14em !important; white-space: nowrap; }
        .travel-lab-hero-headline { margin-top: 18px !important; font-size: clamp(2.7rem, 12vw, 3.45rem) !important; line-height: .98 !important; letter-spacing: -.045em !important; }
        .travel-lab-hero-sub { margin-top: 18px !important; font-size: 15px !important; line-height: 1.65 !important; max-width: 34ch !important; }
        .travel-lab-hero-cta { margin-top: 22px !important; }
        form.travel-lab-hero-cta { min-height: 58px; padding: 5px !important; border-radius: 18px !important; }
        form.travel-lab-hero-cta input { font-size: 15px !important; }
        form.travel-lab-hero-cta button { width: 48px !important; height: 48px !important; }
        .travel-lab-hero .travel-lab-hero-cta.flex.flex-wrap { display: grid !important; grid-template-columns: 1fr !important; gap: 12px !important; width: 100%; }
        .travel-lab-hero .travel-lab-hero-cta.flex.flex-wrap > a, .travel-lab-hero .travel-lab-hero-cta.flex.flex-wrap > button { min-height: 48px; width: 100%; justify-content: center; }
        .travel-lab-hero .travel-lab-hero-cta.flex.flex-wrap > button { border: 1px solid rgba(255,255,255,.14); border-radius: 14px; background: rgba(0,0,0,.22); }
        .travel-lab-hero .travel-lab-hero-cta.mt-8.flex.items-center { margin-top: 24px !important; padding-top: 18px; border-top: 1px solid rgba(255,255,255,.1); }
        .travel-lab-hero .lg\\:col-span-5 > .relative.rounded-\[2rem\] { padding: 18px !important; border-radius: 24px !important; }
        .travel-lab-hero .lg\\:col-span-5 > .relative .mt-6 { margin-top: 16px !important; }
        .travel-lab-hero .lg\\:col-span-5 a { padding: 13px !important; min-height: 72px; }
        #network { padding: 64px 20px !important; }
        #network .grid { gap: 30px !important; }
        #network h2 { font-size: clamp(2.35rem, 10vw, 3.1rem) !important; line-height: 1.02 !important; }
        #network h2 br { display: none; }
        #network form { margin-top: 24px !important; min-height: 58px; border-radius: 18px !important; }
        #network form input { min-width: 0; font-size: 14px !important; }
        #network form button { width: 48px !important; height: 48px !important; }
        #network .mt-6.max-w-md.rounded-2xl { margin-top: 16px !important; padding: 12px !important; }
        #network .mt-6.max-w-md.rounded-2xl > .grid { gap: 10px !important; }
        #network .mt-6.max-w-md.rounded-2xl .flex.items-start { padding: 8px 4px; }
        #network .mb-3\.5.flex.items-center.justify-between { align-items: flex-start !important; flex-direction: column !important; }
        #network .mb-3\.5 .flex.items-center.gap-2:first-child { width: 100%; padding-bottom: 4px; scrollbar-width: none; }
        #network .mb-3\.5 .flex.items-center.gap-2:first-child::-webkit-scrollbar { display: none; }
        #network .relative.w-full.overflow-hidden.rounded-\[2rem\] { padding: 12px !important; border-radius: 24px !important; }
        #network .relative.w-full.overflow-hidden.rounded-\[2rem\] .aspect-\[16\/9\] { border-radius: 18px !important; aspect-ratio: 4 / 3 !important; }
        #demo, #contact { scroll-margin-top: 20px; }
        section:not(.travel-lab-hero):not(#network) { scroll-margin-bottom: 112px; }
        button, a, input, select, textarea { -webkit-tap-highlight-color: transparent; }
      }
      @media (min-width: 640px) and (max-width: 1023px) {
        .landing-root { padding-bottom: 0 !important; }
        .travel-lab-hero-headline { font-size: clamp(4rem, 9vw, 5.5rem) !important; }
      }
      @media (pointer: coarse) {
        .travel-lab-hero a, .travel-lab-hero button, #network a, #network button { min-height: 44px; }
      }
    `}</style>
  );
}
