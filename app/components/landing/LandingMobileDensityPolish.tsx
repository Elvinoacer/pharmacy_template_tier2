"use client";

/**
 * Phone-only density pass for the remaining landing-page sections.
 * Existing component-specific polish keeps ownership of the hero feature card,
 * hero metrics and prescription showcase. This layer handles the rest of the
 * landing page so cards, headings, supporting copy and controls scale together.
 */
export default function LandingMobileDensityPolish() {
  return (
    <style jsx global>{`
      @media (max-width: 639px) {
        /* Shared section rhythm */
        .care-pathways,
        #network,
        #demo,
        #contact {
          padding-left: 16px !important;
          padding-right: 16px !important;
          padding-top: 44px !important;
          padding-bottom: 44px !important;
        }

        .care-pathways p,
        #network p,
        #demo p,
        #contact p {
          overflow-wrap: anywhere;
        }

        /* ---------------- Care pathways ---------------- */
        .care-pathways > div {
          min-width: 0;
        }

        .care-pathways > div > div:first-child {
          margin-bottom: 18px !important;
          gap: 10px !important;
        }

        .care-pathways > div > div:first-child > div > p {
          margin-bottom: 5px !important;
          font-size: 9px !important;
          letter-spacing: .13em !important;
        }

        .care-pathways #care-pathways-title {
          font-size: clamp(24px, 7.3vw, 29px) !important;
          line-height: 1.05 !important;
          letter-spacing: -.025em !important;
        }

        .care-pathways > div > div:first-child > p {
          max-width: 38ch !important;
          font-size: 11px !important;
          line-height: 1.45 !important;
        }

        .care-pathways > div > div.grid {
          gap: 9px !important;
        }

        .care-pathway {
          min-height: 0 !important;
          padding: 13px !important;
          border-radius: 16px !important;
        }

        .care-pathway-icon {
          width: 36px !important;
          height: 36px !important;
          border-radius: 11px !important;
        }

        .care-pathway-icon svg {
          width: 17px !important;
          height: 17px !important;
        }

        .care-pathway > div:first-child > span:last-child {
          font-size: 9px !important;
        }

        .care-pathway h3 {
          margin-top: 12px !important;
          font-size: 15px !important;
          line-height: 1.2 !important;
        }

        .care-pathway > p {
          margin-top: 5px !important;
          font-size: 10.5px !important;
          line-height: 1.42 !important;
        }

        .care-pathway > span:last-child {
          margin-top: 13px !important;
          gap: 6px !important;
          font-size: 10.5px !important;
        }

        .care-pathway > span:last-child svg {
          width: 14px !important;
          height: 14px !important;
        }

        .care-pathways > div > div:last-child {
          margin-top: 14px !important;
          padding-top: 12px !important;
          gap: 5px 14px !important;
          font-size: 10px !important;
        }

        .care-pathways > div > div:last-child a {
          min-height: 36px !important;
          font-size: 10px !important;
        }

        /* ---------------- Care Near You / directory ---------------- */
        #network > .relative.z-10 > .grid {
          gap: 22px !important;
        }

        #network div[class~="lg:col-span-5"] > p:first-child {
          font-size: 9px !important;
          letter-spacing: .14em !important;
        }

        #network div[class~="lg:col-span-5"] > h2 {
          margin-top: 8px !important;
          font-size: clamp(26px, 8vw, 31px) !important;
          line-height: 1.04 !important;
          letter-spacing: -.03em !important;
        }

        #network div[class~="lg:col-span-5"] > p.mt-4 {
          margin-top: 9px !important;
          max-width: 38ch !important;
          font-size: 11.5px !important;
          line-height: 1.45 !important;
        }

        #network .mt-6.max-w-md.rounded-2xl {
          margin-top: 12px !important;
          padding: 9px !important;
          border-radius: 14px !important;
        }

        #network .mt-6.max-w-md.rounded-2xl > .grid {
          gap: 5px !important;
        }

        #network .mt-6.max-w-md.rounded-2xl .flex.items-start {
          min-width: 0;
          gap: 8px !important;
          padding: 6px !important;
          border-radius: 10px;
        }

        #network .mt-6.max-w-md.rounded-2xl .h-9.w-9 {
          width: 31px !important;
          height: 31px !important;
          flex: 0 0 31px !important;
          border-radius: 9px !important;
        }

        #network .mt-6.max-w-md.rounded-2xl .h-9.w-9 svg {
          width: 14px !important;
          height: 14px !important;
        }

        #network .mt-6.max-w-md.rounded-2xl h3 {
          font-size: 10.5px !important;
          line-height: 1.2 !important;
        }

        #network .mt-6.max-w-md.rounded-2xl p {
          margin-top: 2px !important;
          font-size: 9px !important;
          line-height: 1.25 !important;
        }

        #network div[class~="lg:col-span-7"] > .mb-3\.5 {
          margin-bottom: 8px !important;
          gap: 6px !important;
        }

        #network div[class~="lg:col-span-7"] > .mb-3\.5 button {
          gap: 4px !important;
          padding: 5px 8px !important;
          font-size: 9.5px !important;
        }

        #network div[class~="lg:col-span-7"] > .mb-3\.5 > div:last-child {
          gap: 4px !important;
          font-size: 9.5px !important;
        }

        #network div[class~="lg:col-span-7"] > .mb-3\.5 > div:last-child button {
          width: 26px !important;
          height: 26px !important;
          padding: 0 !important;
        }

        #network div[class~="lg:col-span-7"] > .relative.flex.items-center > .relative.w-full {
          padding: 11px !important;
          border-radius: 17px !important;
        }

        #network div[class~="lg:col-span-7"] .aspect-\[16\/9\] {
          border-radius: 12px !important;
        }

        #network div[class~="lg:col-span-7"] .aspect-\[16\/9\] > .absolute.left-4.top-4 {
          left: 9px !important;
          top: 9px !important;
        }

        #network div[class~="lg:col-span-7"] .aspect-\[16\/9\] > .absolute.left-4.top-4 span {
          gap: 4px !important;
          padding: 5px 8px !important;
          font-size: 9px !important;
        }

        #network div[class~="lg:col-span-7"] .aspect-\[16\/9\] > .absolute.left-4.top-4 svg {
          width: 11px !important;
          height: 11px !important;
        }

        #network div[class~="lg:col-span-7"] .aspect-\[16\/9\] > .absolute.right-4.top-4 {
          right: 9px !important;
          top: 9px !important;
          gap: 4px !important;
          padding: 5px 7px !important;
        }

        #network div[class~="lg:col-span-7"] .mt-5.flex.flex-col {
          margin-top: 11px !important;
          gap: 9px !important;
        }

        #network div[class~="lg:col-span-7"] .mt-5.flex.flex-col > div:first-child {
          min-width: 0;
          gap: 8px !important;
        }

        #network div[class~="lg:col-span-7"] .mt-5.flex.flex-col .h-12.w-12 {
          width: 35px !important;
          height: 35px !important;
          flex: 0 0 35px !important;
          border-radius: 10px !important;
        }

        #network div[class~="lg:col-span-7"] .mt-5.flex.flex-col .h-12.w-12 svg {
          width: 16px !important;
          height: 16px !important;
        }

        #network div[class~="lg:col-span-7"] .mt-5.flex.flex-col h3 {
          font-size: 14px !important;
          line-height: 1.18 !important;
        }

        #network div[class~="lg:col-span-7"] .mt-5.flex.flex-col p {
          font-size: 9.5px !important;
          line-height: 1.25 !important;
        }

        #network div[class~="lg:col-span-7"] .mt-5.flex.flex-col > div:last-child {
          gap: 5px !important;
        }

        #network div[class~="lg:col-span-7"] .mt-5.flex.flex-col > div:last-child span {
          padding: 4px 7px !important;
          font-size: 9px !important;
        }

        #network div[class~="lg:col-span-7"] .mt-6.flex.flex-wrap.items-center.justify-between {
          margin-top: 12px !important;
          padding-top: 10px !important;
          gap: 8px !important;
        }

        #network div[class~="lg:col-span-7"] .mt-6.flex.flex-wrap.items-center.justify-between > div:first-child {
          font-size: 9.5px !important;
        }

        #network div[class~="lg:col-span-7"] .mt-6.flex.flex-wrap.items-center.justify-between > div:last-child {
          width: 100%;
          gap: 7px !important;
        }

        #network div[class~="lg:col-span-7"] .mt-6.flex.flex-wrap.items-center.justify-between a:first-child {
          width: 38px !important;
          height: 38px !important;
          flex: 0 0 38px !important;
        }

        #network div[class~="lg:col-span-7"] .mt-6.flex.flex-wrap.items-center.justify-between a:last-child {
          min-height: 38px !important;
          flex: 1 1 auto;
          justify-content: center;
          padding: 8px 12px !important;
          border-radius: 12px !important;
          font-size: 10.5px !important;
        }

        #network > .relative.z-10 > .mt-12.rounded-\[2rem\] {
          margin-top: 20px !important;
          padding: 11px !important;
          border-radius: 16px !important;
        }

        #network > .relative.z-10 > .mt-12.rounded-\[2rem\] > div {
          gap: 9px !important;
        }

        #network > .relative.z-10 > .mt-12.rounded-\[2rem\] .h-12.w-12 {
          width: 34px !important;
          height: 34px !important;
          flex: 0 0 34px !important;
          border-radius: 10px !important;
        }

        #network > .relative.z-10 > .mt-12.rounded-\[2rem\] .h-12.w-12 svg {
          width: 16px !important;
          height: 16px !important;
        }

        #network > .relative.z-10 > .mt-12.rounded-\[2rem\] h3 {
          font-size: 12px !important;
          line-height: 1.25 !important;
        }

        #network > .relative.z-10 > .mt-12.rounded-\[2rem\] p {
          font-size: 9.5px !important;
          line-height: 1.3 !important;
        }

        #network > .relative.z-10 > .mt-12.rounded-\[2rem\] a {
          width: 100%;
          min-height: 38px !important;
          justify-content: center;
          padding: 8px 12px !important;
          font-size: 10px !important;
        }

        #network > .relative.z-10 > .mt-6.rounded-\[2rem\] {
          margin-top: 10px !important;
          padding: 9px !important;
          border-radius: 16px !important;
        }

        #network > .relative.z-10 > .mt-6.rounded-\[2rem\] > .grid {
          gap: 7px !important;
        }

        #network > .relative.z-10 > .mt-6.rounded-\[2rem\] > .grid > div {
          min-width: 0;
          gap: 7px !important;
          padding: 8px !important;
          border: 1px solid rgba(255,255,255,.06);
          border-radius: 11px;
          background: rgba(255,255,255,.025);
        }

        #network > .relative.z-10 > .mt-6.rounded-\[2rem\] .h-11.w-11 {
          width: 30px !important;
          height: 30px !important;
          flex: 0 0 30px !important;
          border-radius: 9px !important;
        }

        #network > .relative.z-10 > .mt-6.rounded-\[2rem\] .h-11.w-11 svg {
          width: 14px !important;
          height: 14px !important;
        }

        #network > .relative.z-10 > .mt-6.rounded-\[2rem\] p:first-child {
          font-size: 10.5px !important;
          line-height: 1.15 !important;
        }

        #network > .relative.z-10 > .mt-6.rounded-\[2rem\] p:last-child {
          margin-top: 2px !important;
          font-size: 8.8px !important;
          line-height: 1.2 !important;
        }

        /* ---------------- See it in action, excluding right showcase ---------------- */
        #demo > .relative.z-10 > .grid {
          gap: 22px !important;
        }

        #demo div[class~="lg:col-span-4"] > p:first-child {
          font-size: 9px !important;
          letter-spacing: .14em !important;
        }

        #demo div[class~="lg:col-span-4"] > h2 {
          margin-top: 8px !important;
          font-size: clamp(27px, 8.2vw, 32px) !important;
          line-height: 1.02 !important;
        }

        #demo div[class~="lg:col-span-4"] > p.mt-5 {
          margin-top: 10px !important;
          max-width: 38ch !important;
          font-size: 11.5px !important;
          line-height: 1.45 !important;
        }

        #demo div[class~="lg:col-span-4"] > .mt-8 {
          margin-top: 16px !important;
          gap: 8px !important;
        }

        #demo div[class~="lg:col-span-4"] > .mt-8 > div {
          gap: 8px !important;
        }

        #demo div[class~="lg:col-span-4"] > .mt-8 .h-11.w-11 {
          width: 32px !important;
          height: 32px !important;
          flex: 0 0 32px !important;
          border-radius: 9px !important;
        }

        #demo div[class~="lg:col-span-4"] > .mt-8 .h-11.w-11 svg {
          width: 14px !important;
          height: 14px !important;
        }

        #demo div[class~="lg:col-span-4"] > .mt-8 h3 {
          font-size: 10.5px !important;
          line-height: 1.2 !important;
        }

        #demo div[class~="lg:col-span-4"] > .mt-8 p {
          margin-top: 1px !important;
          font-size: 9px !important;
          line-height: 1.2 !important;
        }

        #demo div[class~="lg:col-span-3"] > div {
          padding: 8px !important;
          border-radius: 16px !important;
        }

        #demo div[class~="lg:col-span-3"] > div > button {
          min-height: 48px;
          gap: 8px !important;
          padding: 8px !important;
          border-radius: 11px !important;
        }

        #demo div[class~="lg:col-span-3"] > div > button > div:first-child {
          min-width: 0;
          gap: 8px !important;
        }

        #demo div[class~="lg:col-span-3"] > div > button .h-10.w-10 {
          width: 31px !important;
          height: 31px !important;
          flex: 0 0 31px !important;
          border-radius: 9px !important;
        }

        #demo div[class~="lg:col-span-3"] > div > button .h-10.w-10 svg {
          width: 14px !important;
          height: 14px !important;
        }

        #demo div[class~="lg:col-span-3"] > div > button p:first-child {
          font-size: 10.5px !important;
          line-height: 1.2 !important;
        }

        #demo div[class~="lg:col-span-3"] > div > button p:last-child {
          margin-top: 1px !important;
          font-size: 8.8px !important;
          line-height: 1.15 !important;
        }

        #demo div[class~="lg:col-span-3"] > div > button > span:last-child {
          font-size: 9px !important;
        }

        #demo > .relative.z-10 > .mt-12.rounded-\[2rem\] {
          margin-top: 20px !important;
          padding: 9px !important;
          border-radius: 16px !important;
        }

        #demo > .relative.z-10 > .mt-12.rounded-\[2rem\] > .grid {
          gap: 7px !important;
        }

        #demo > .relative.z-10 > .mt-12.rounded-\[2rem\] > .grid > div {
          min-width: 0;
          gap: 8px !important;
          padding: 8px !important;
          border: 1px solid rgba(255,255,255,.06);
          border-radius: 11px;
          background: rgba(255,255,255,.025);
        }

        #demo > .relative.z-10 > .mt-12.rounded-\[2rem\] .h-12.w-12 {
          width: 32px !important;
          height: 32px !important;
          flex: 0 0 32px !important;
          border-radius: 9px !important;
        }

        #demo > .relative.z-10 > .mt-12.rounded-\[2rem\] .h-12.w-12 svg {
          width: 15px !important;
          height: 15px !important;
        }

        #demo > .relative.z-10 > .mt-12.rounded-\[2rem\] p:first-child {
          font-size: 11px !important;
          line-height: 1.15 !important;
        }

        #demo > .relative.z-10 > .mt-12.rounded-\[2rem\] p:last-child {
          margin-top: 1px !important;
          font-size: 9px !important;
          line-height: 1.2 !important;
        }

        /* ---------------- Final CTA / contact ---------------- */
        #contact > .relative.z-10 > .relative.overflow-hidden {
          padding: 15px !important;
          border-radius: 20px !important;
        }

        #contact > .relative.z-10 > .relative.overflow-hidden > .grid {
          gap: 22px !important;
        }

        #contact div[class~="lg:col-span-5"] > p:first-child {
          font-size: 9px !important;
          letter-spacing: .14em !important;
        }

        #contact div[class~="lg:col-span-5"] > h2 {
          margin-top: 8px !important;
          font-size: clamp(27px, 8.2vw, 32px) !important;
          line-height: 1.02 !important;
        }

        #contact div[class~="lg:col-span-5"] > p.mt-5 {
          margin-top: 10px !important;
          max-width: 38ch !important;
          font-size: 11.5px !important;
          line-height: 1.45 !important;
        }

        #contact div[class~="lg:col-span-5"] > .mt-8 {
          display: grid !important;
          grid-template-columns: 1fr !important;
          margin-top: 15px !important;
          gap: 7px !important;
        }

        #contact div[class~="lg:col-span-5"] > .mt-8 > a {
          min-height: 40px;
          width: 100%;
          justify-content: center;
          gap: 7px !important;
          padding: 9px 13px !important;
          font-size: 10.5px !important;
        }

        #contact div[class~="lg:col-span-5"] > .mt-8 > a svg {
          width: 14px !important;
          height: 14px !important;
        }

        #contact div[class~="lg:col-span-7"] > div {
          padding-top: 7px !important;
          padding-bottom: 0 !important;
        }

        #contact div[class~="lg:col-span-7"] .z-20.mx-auto {
          margin-bottom: 11px !important;
        }

        #contact div[class~="lg:col-span-7"] .z-20.mx-auto > div {
          width: 72px !important;
          height: 72px !important;
          border-radius: 18px !important;
        }

        #contact div[class~="lg:col-span-7"] .z-20.mx-auto > div svg {
          width: 34px !important;
          height: 34px !important;
        }

        #contact div[class~="lg:col-span-7"] .grid.grid-cols-2 {
          gap: 7px !important;
        }

        #contact div[class~="lg:col-span-7"] .grid.grid-cols-2 > a {
          min-width: 0;
          min-height: 50px;
          gap: 7px !important;
          padding: 8px !important;
          border-radius: 12px !important;
        }

        #contact div[class~="lg:col-span-7"] .grid.grid-cols-2 > a > div:first-child {
          width: 31px !important;
          height: 31px !important;
          flex: 0 0 31px !important;
          border-radius: 9px !important;
        }

        #contact div[class~="lg:col-span-7"] .grid.grid-cols-2 > a > div:first-child svg {
          width: 15px !important;
          height: 15px !important;
        }

        #contact div[class~="lg:col-span-7"] .grid.grid-cols-2 > a p:first-child {
          font-size: 10px !important;
          line-height: 1.15 !important;
        }

        #contact div[class~="lg:col-span-7"] .grid.grid-cols-2 > a p:last-child {
          margin-top: 1px !important;
          font-size: 8.5px !important;
          line-height: 1.15 !important;
        }
      }

      @media (max-width: 359px) {
        .care-pathways,
        #network,
        #demo,
        #contact {
          padding-left: 13px !important;
          padding-right: 13px !important;
          padding-top: 38px !important;
          padding-bottom: 38px !important;
        }

        .care-pathway {
          padding: 11px !important;
        }

        #network div[class~="lg:col-span-7"] > .relative.flex.items-center > .relative.w-full,
        #contact > .relative.z-10 > .relative.overflow-hidden {
          padding: 10px !important;
        }

        #network > .relative.z-10 > .mt-6.rounded-\[2rem\] > .grid > div,
        #demo > .relative.z-10 > .mt-12.rounded-\[2rem\] > .grid > div {
          padding: 7px !important;
        }

        #contact div[class~="lg:col-span-7"] .grid.grid-cols-2 > a {
          padding: 7px !important;
          gap: 6px !important;
        }
      }
    `}</style>
  );
}
