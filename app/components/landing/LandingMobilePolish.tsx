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

      @keyframes search-surface-breathe {
        0%, 100% { box-shadow: 0 12px 38px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.06); }
        50% { box-shadow: 0 16px 46px rgba(0,0,0,.36), 0 0 28px rgba(36,214,143,.055), inset 0 1px 0 rgba(255,255,255,.08); }
      }

      @keyframes search-sheen {
        from { transform: translateX(-145%) skewX(-18deg); opacity: 0; }
        18% { opacity: .28; }
        42%, 100% { transform: translateX(330%) skewX(-18deg); opacity: 0; }
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

      /* Premium search language shared by the hero and Care Near You. The form reads as one tactile control, not an input with a button stuck onto it. */
      form.travel-lab-hero-cta,
      #network form[action="/pharmacies"] {
        position: relative;
        isolation: isolate;
        min-height: 62px;
        overflow: hidden;
        border: 1px solid rgba(180,255,218,.15) !important;
        border-radius: 20px !important;
        background: linear-gradient(135deg, rgba(9,25,20,.82), rgba(3,12,9,.92)) !important;
        box-shadow: 0 12px 38px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.06) !important;
        animation: search-surface-breathe 7s ease-in-out infinite;
      }

      form.travel-lab-hero-cta::before,
      #network form[action="/pharmacies"]::before {
        content: "";
        position: absolute;
        inset: 1px;
        z-index: -1;
        pointer-events: none;
        border-radius: inherit;
        background: linear-gradient(110deg, rgba(255,255,255,.045), transparent 24%, rgba(52,211,153,.025) 62%, transparent 84%);
      }

      form.travel-lab-hero-cta::after,
      #network form[action="/pharmacies"]::after {
        content: "";
        position: absolute;
        top: -35%;
        left: 0;
        width: 22%;
        height: 170%;
        pointer-events: none;
        background: linear-gradient(90deg, transparent, rgba(175,255,216,.24), transparent);
        filter: blur(5px);
        animation: search-sheen 8s ease-in-out infinite;
      }

      form.travel-lab-hero-cta:focus-within,
      #network form[action="/pharmacies"]:focus-within {
        border-color: rgba(92,255,174,.72) !important;
        background: linear-gradient(135deg, rgba(11,34,26,.9), rgba(2,15,10,.96)) !important;
        box-shadow: 0 0 0 4px rgba(52,211,153,.10), 0 18px 44px rgba(0,0,0,.38), 0 0 34px rgba(16,185,129,.10), inset 0 1px 0 rgba(255,255,255,.09) !important;
        transform: translateY(-1px);
      }

      form.travel-lab-hero-cta > div:first-child,
      #network form[action="/pharmacies"] > div:first-child {
        min-width: 0;
        padding-left: 10px !important;
        padding-right: 8px !important;
      }

      form.travel-lab-hero-cta > div:first-child > svg,
      #network form[action="/pharmacies"] > div:first-child > svg {
        width: 38px !important;
        height: 38px !important;
        flex: 0 0 auto;
        padding: 10px;
        border: 1px solid rgba(141,255,200,.14);
        border-radius: 13px;
        background: linear-gradient(145deg, rgba(32,106,77,.32), rgba(4,27,18,.42));
        color: #8ce9bd !important;
        box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 7px 16px rgba(0,0,0,.14);
        transition: transform .25s cubic-bezier(.2,1.2,.3,1), color .25s ease, border-color .25s ease, background .25s ease;
      }

      form.travel-lab-hero-cta:focus-within > div:first-child > svg,
      #network form[action="/pharmacies"]:focus-within > div:first-child > svg {
        transform: scale(1.06) rotate(-4deg);
        border-color: rgba(130,255,193,.36);
        color: #b5ffda !important;
        background: linear-gradient(145deg, rgba(32,132,91,.52), rgba(4,38,25,.58));
      }

      form.travel-lab-hero-cta input,
      #network form[action="/pharmacies"] input {
        min-width: 0;
        height: 48px;
        padding-left: 11px !important;
        padding-right: 8px !important;
        font-size: 15px !important;
        font-weight: 500;
        letter-spacing: -.01em;
        caret-color: #8effc0;
      }

      form.travel-lab-hero-cta input::placeholder,
      #network form[action="/pharmacies"] input::placeholder {
        color: rgba(203,213,225,.62) !important;
        opacity: 1;
      }

      form.travel-lab-hero-cta button[type="submit"],
      #network form[action="/pharmacies"] button[type="submit"] {
        position: relative;
        z-index: 2;
        width: 50px !important;
        height: 50px !important;
        overflow: hidden;
        border: 1px solid rgba(173,255,214,.22);
        border-radius: 16px !important;
        background: linear-gradient(145deg, #12966a, #076447) !important;
        color: white;
        box-shadow: 0 10px 22px rgba(2,71,49,.42), inset 0 1px 0 rgba(255,255,255,.18) !important;
      }

      form.travel-lab-hero-cta button[type="submit"]::before,
      #network form[action="/pharmacies"] button[type="submit"]::before {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: radial-gradient(circle at 30% 20%, rgba(255,255,255,.24), transparent 34%);
        opacity: .9;
      }

      form.travel-lab-hero-cta button[type="submit"] svg,
      #network form[action="/pharmacies"] button[type="submit"] svg {
        position: relative;
        z-index: 1;
        transition: transform .22s cubic-bezier(.2,1.3,.3,1);
      }

      @media (hover: hover) {
        form.travel-lab-hero-cta button[type="submit"]:hover,
        #network form[action="/pharmacies"] button[type="submit"]:hover {
          transform: translateY(-1px) scale(1.035) !important;
          background: linear-gradient(145deg, #19ae7d, #087353) !important;
          box-shadow: 0 14px 28px rgba(2,71,49,.5), 0 0 22px rgba(52,211,153,.18), inset 0 1px 0 rgba(255,255,255,.22) !important;
        }
        form.travel-lab-hero-cta button[type="submit"]:hover svg,
        #network form[action="/pharmacies"] button[type="submit"]:hover svg {
          transform: translateX(1px) scale(1.06);
        }
      }

      form.travel-lab-hero-cta button[type="submit"]:active,
      #network form[action="/pharmacies"] button[type="submit"]:active {
        transform: scale(.92) !important;
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

        form.travel-lab-hero-cta,
        #network form[action="/pharmacies"] { min-height: 58px !important; padding: 4px !important; border-radius: 18px !important; }
        form.travel-lab-hero-cta > div:first-child,
        #network form[action="/pharmacies"] > div:first-child { padding-left: 5px !important; }
        form.travel-lab-hero-cta > div:first-child > svg,
        #network form[action="/pharmacies"] > div:first-child > svg { width: 38px !important; height: 38px !important; padding: 9px; border-radius: 12px; }
        form.travel-lab-hero-cta input,
        #network form[action="/pharmacies"] input { height: 46px !important; padding-left: 9px !important; font-size: 13px !important; }
        form.travel-lab-hero-cta button[type="submit"],
        #network form[action="/pharmacies"] button[type="submit"] { width: 48px !important; height: 48px !important; border-radius: 14px !important; }

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
        #network form { margin-top: 20px !important; }
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
        form.travel-lab-hero-cta,
        #network form[action="/pharmacies"] { animation: none !important; }
        form.travel-lab-hero-cta::after,
        #network form[action="/pharmacies"]::after { animation: none !important; }
        .landing-root *, .landing-root *::before, .landing-root *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
      }
    `}</style>
  );
}
