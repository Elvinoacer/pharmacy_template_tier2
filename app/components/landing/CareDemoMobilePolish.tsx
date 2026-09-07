"use client";

/**
 * Phone-only density pass for the dynamic care showcase in LandingCareDemo.
 * It keeps tablet/desktop sizing intact while scaling the entire showcase card
 * and its nested content down as a single responsive system.
 */
export default function CareDemoMobilePolish() {
  return (
    <style jsx global>{`
      @media (max-width: 639px) {
        #demo div[class~="lg:col-span-5"] {
          min-width: 0;
        }

        #demo div[class~="lg:col-span-5"] > div.relative {
          width: 100%;
          min-width: 0;
          padding: 12px !important;
          border-radius: 18px !important;
        }

        #demo div[class~="lg:col-span-5"] > div.relative > div > div:first-child {
          gap: 8px !important;
        }

        #demo div[class~="lg:col-span-5"] > div.relative > div > div:first-child > div:first-child {
          min-width: 0;
          gap: 6px !important;
        }

        #demo div[class~="lg:col-span-5"] > div.relative > div > div:first-child span.uppercase {
          font-size: 9px !important;
          line-height: 1.2 !important;
          letter-spacing: .13em !important;
          white-space: nowrap;
        }

        #demo div[class~="lg:col-span-5"] > div.relative > div > div:first-child > span:last-child {
          flex: 0 0 auto;
          gap: 4px !important;
          padding: 4px 7px !important;
          font-size: 9px !important;
          line-height: 1 !important;
        }

        #demo div[class~="lg:col-span-5"] > div.relative > div > h3 {
          margin-top: 8px !important;
          font-size: clamp(17px, 5.1vw, 20px) !important;
          line-height: 1.08 !important;
          letter-spacing: -.025em !important;
        }

        #demo div[class~="lg:col-span-5"] > div.relative > div > div.mt-6.rounded-2xl,
        #demo div[class~="lg:col-span-5"] > div.relative > div > div.mt-5.rounded-2xl {
          min-width: 0;
          margin-top: 12px !important;
          padding: 10px !important;
          gap: 8px !important;
          border-radius: 12px !important;
        }

        #demo div[class~="lg:col-span-5"] > div.relative > div > div.mt-6.rounded-2xl > div,
        #demo div[class~="lg:col-span-5"] > div.relative > div > div.mt-5.rounded-2xl > div {
          min-width: 0;
        }

        #demo div[class~="lg:col-span-5"] > div.relative > div > div.mt-6.rounded-2xl .gap-3\.5,
        #demo div[class~="lg:col-span-5"] > div.relative > div > div.mt-5.rounded-2xl .gap-3 {
          gap: 8px !important;
        }

        #demo div[class~="lg:col-span-5"] > div.relative > div > div.mt-6.rounded-2xl .h-11.w-11 {
          width: 34px !important;
          height: 34px !important;
          flex: 0 0 34px !important;
          border-radius: 10px !important;
        }

        #demo div[class~="lg:col-span-5"] > div.relative > div > div.mt-5.rounded-2xl .h-10.w-10 {
          width: 34px !important;
          height: 34px !important;
          flex: 0 0 34px !important;
          border-radius: 10px !important;
        }

        #demo div[class~="lg:col-span-5"] > div.relative > div > div.rounded-2xl .h-5.w-5 {
          width: 16px !important;
          height: 16px !important;
        }

        #demo div[class~="lg:col-span-5"] > div.relative > div > div.rounded-2xl h4 {
          font-size: 11px !important;
          line-height: 1.25 !important;
          overflow-wrap: anywhere;
        }

        #demo div[class~="lg:col-span-5"] > div.relative > div > div.rounded-2xl p {
          font-size: 9.5px !important;
          line-height: 1.3 !important;
          overflow-wrap: anywhere;
        }

        #demo div[class~="lg:col-span-5"] > div.relative > div > div.rounded-2xl p.text-base,
        #demo div[class~="lg:col-span-5"] > div.relative > div > div.rounded-2xl p.text-lg {
          font-size: 12px !important;
          line-height: 1.15 !important;
        }

        #demo div[class~="lg:col-span-5"] > div.relative > div > div.rounded-2xl .h-7.w-7 {
          width: 23px !important;
          height: 23px !important;
          flex: 0 0 23px !important;
        }

        #demo div[class~="lg:col-span-5"] > div.relative > div > div.relative.mt-6 {
          margin-top: 12px !important;
          padding: 4px 7px !important;
        }

        #demo div[class~="lg:col-span-5"] > div.relative > div > div.relative.mt-6 > div:first-child {
          left: 28px !important;
          right: 28px !important;
          top: 15px !important;
        }

        #demo div[class~="lg:col-span-5"] > div.relative > div > div.relative.mt-6 .h-7.w-7 {
          width: 22px !important;
          height: 22px !important;
        }

        #demo div[class~="lg:col-span-5"] > div.relative > div > div.relative.mt-6 .h-4.w-4 {
          width: 12px !important;
          height: 12px !important;
        }

        #demo div[class~="lg:col-span-5"] > div.relative > div > div.relative.mt-6 span {
          margin-top: 5px !important;
          font-size: 9px !important;
          line-height: 1.1 !important;
        }

        #demo div[class~="lg:col-span-5"] > div.relative > div > div.rounded-2xl span.inline-flex {
          gap: 4px !important;
          padding: 4px 7px !important;
          font-size: 9px !important;
          line-height: 1.05 !important;
          white-space: nowrap;
        }

        #demo div[class~="lg:col-span-5"] > div.relative > div > div.mt-5.rounded-2xl > a {
          flex: 0 0 auto;
          gap: 4px !important;
          padding: 7px 9px !important;
          border-radius: 10px !important;
          font-size: 9.5px !important;
          line-height: 1 !important;
        }

        #demo div[class~="lg:col-span-5"] > div.relative > div > div.mt-5.rounded-2xl > a svg {
          width: 12px !important;
          height: 12px !important;
        }
      }

      @media (max-width: 359px) {
        #demo div[class~="lg:col-span-5"] > div.relative {
          padding: 10px !important;
          border-radius: 16px !important;
        }

        #demo div[class~="lg:col-span-5"] > div.relative > div > h3 {
          font-size: 16px !important;
        }

        #demo div[class~="lg:col-span-5"] > div.relative > div > div.mt-6.rounded-2xl,
        #demo div[class~="lg:col-span-5"] > div.relative > div > div.mt-5.rounded-2xl {
          padding: 8px !important;
          gap: 7px !important;
        }

        #demo div[class~="lg:col-span-5"] > div.relative > div > div.mt-6.rounded-2xl,
        #demo div[class~="lg:col-span-5"] > div.relative > div > div.mt-5.rounded-2xl {
          flex-wrap: wrap;
        }

        #demo div[class~="lg:col-span-5"] > div.relative > div > div.mt-5.rounded-2xl > a {
          margin-left: 42px;
        }
      }
    `}</style>
  );
}
