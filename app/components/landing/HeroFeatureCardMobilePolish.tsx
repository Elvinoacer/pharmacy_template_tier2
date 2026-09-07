"use client";

/**
 * Mobile-only sizing pass for the glass feature card inside TravelLabHero.
 * Desktop/tablet styling remains owned by TravelLabHero; these rules only
 * rebalance the compact phone layout so labels and descriptions wrap cleanly.
 */
export default function HeroFeatureCardMobilePolish() {
  return (
    <style jsx global>{`
      @media (max-width: 639px) {
        .travel-lab-hero div[class~="lg:col-span-5"] {
          min-width: 0;
        }

        .travel-lab-hero div[class~="lg:col-span-5"] > div.relative {
          width: 100%;
          min-width: 0;
          padding: 12px !important;
          border-radius: 18px !important;
        }

        .travel-lab-hero div[class~="lg:col-span-5"] > div.relative > div.relative h2 {
          font-size: 15px !important;
          line-height: 1.2 !important;
          letter-spacing: -0.015em;
        }

        .travel-lab-hero div[class~="lg:col-span-5"] > div.relative > div.relative p {
          margin-top: 1px !important;
          font-size: 15px !important;
          line-height: 1.16 !important;
        }

        .travel-lab-hero div[class~="lg:col-span-5"] > div.relative > div.mt-6 {
          display: grid !important;
          gap: 8px !important;
          margin-top: 11px !important;
        }

        .travel-lab-hero div[class~="lg:col-span-5"] > div.relative > div.mt-6 > a {
          min-width: 0;
          min-height: 52px !important;
          margin-block: 0 !important;
          padding: 8px 9px !important;
          gap: 8px !important;
          border-radius: 14px !important;
        }

        .travel-lab-hero div[class~="lg:col-span-5"] > div.relative > div.mt-6 > a > div:first-child {
          min-width: 0;
          flex: 1 1 auto;
          gap: 9px !important;
        }

        .travel-lab-hero div[class~="lg:col-span-5"] > div.relative > div.mt-6 > a > div:first-child > div:first-child {
          width: 36px !important;
          height: 36px !important;
          flex: 0 0 36px !important;
          border-radius: 10px !important;
        }

        .travel-lab-hero div[class~="lg:col-span-5"] > div.relative > div.mt-6 > a > div:first-child > div:first-child svg {
          width: 17px !important;
          height: 17px !important;
        }

        .travel-lab-hero div[class~="lg:col-span-5"] > div.relative > div.mt-6 > a > div:first-child > div:nth-child(2) {
          min-width: 0;
          flex: 1 1 auto;
        }

        .travel-lab-hero div[class~="lg:col-span-5"] > div.relative > div.mt-6 > a h3 {
          font-size: clamp(12px, 3.4vw, 13px) !important;
          line-height: 1.2 !important;
          letter-spacing: -0.01em;
          white-space: normal;
          overflow-wrap: anywhere;
        }

        .travel-lab-hero div[class~="lg:col-span-5"] > div.relative > div.mt-6 > a p {
          max-width: none !important;
          margin-top: 2px !important;
          font-size: clamp(10px, 2.9vw, 11px) !important;
          line-height: 1.35 !important;
          white-space: normal;
          overflow-wrap: anywhere;
        }

        .travel-lab-hero div[class~="lg:col-span-5"] > div.relative > div.mt-6 > a > svg:last-child {
          width: 14px !important;
          height: 14px !important;
          flex: 0 0 14px;
        }
      }

      @media (max-width: 359px) {
        .travel-lab-hero div[class~="lg:col-span-5"] > div.relative {
          padding: 10px !important;
          border-radius: 16px !important;
        }

        .travel-lab-hero div[class~="lg:col-span-5"] > div.relative > div.mt-6 {
          gap: 7px !important;
          margin-top: 10px !important;
        }

        .travel-lab-hero div[class~="lg:col-span-5"] > div.relative > div.mt-6 > a {
          min-height: 50px !important;
          padding: 7px 8px !important;
        }

        .travel-lab-hero div[class~="lg:col-span-5"] > div.relative > div.mt-6 > a > div:first-child > div:first-child {
          width: 34px !important;
          height: 34px !important;
          flex-basis: 34px !important;
        }
      }
    `}</style>
  );
}
