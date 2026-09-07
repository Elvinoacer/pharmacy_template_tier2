"use client";

/**
 * Mobile-only refinement for the hero metrics capsule below TravelLabHero.
 * On phones, the four metrics become compact inset tiles with smaller type,
 * icons, and gaps. Tablet/desktop keeps the existing horizontal metrics bar.
 */
export default function HeroMetricsMobilePolish() {
  return (
    <style jsx global>{`
      @media (max-width: 639px) {
        .travel-lab-hero > .relative.z-10 > div.mt-12.w-full {
          margin-top: 24px !important;
          padding: 10px !important;
          border-radius: 18px !important;
          background: linear-gradient(145deg, rgba(3, 16, 11, 0.72), rgba(0, 0, 0, 0.34)) !important;
          box-shadow:
            0 14px 34px rgba(0, 0, 0, 0.34),
            inset 0 1px 0 rgba(255, 255, 255, 0.07),
            0 0 24px rgba(16, 185, 129, 0.05) !important;
        }

        .travel-lab-hero > .relative.z-10 > div.mt-12.w-full > div.grid {
          gap: 8px !important;
        }

        .travel-lab-hero > .relative.z-10 > div.mt-12.w-full > div.grid > div {
          min-width: 0;
          min-height: 58px;
          gap: 8px !important;
          padding: 9px !important;
          border: 1px solid rgba(255, 255, 255, 0.075);
          border-radius: 14px;
          background: linear-gradient(145deg, rgba(8, 30, 22, 0.58), rgba(0, 0, 0, 0.2));
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035);
        }

        .travel-lab-hero > .relative.z-10 > div.mt-12.w-full > div.grid > div > div:first-child {
          width: 34px !important;
          height: 34px !important;
          flex: 0 0 34px !important;
          border-radius: 10px !important;
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.24) !important;
        }

        .travel-lab-hero > .relative.z-10 > div.mt-12.w-full > div.grid > div > div:first-child svg {
          width: 16px !important;
          height: 16px !important;
        }

        .travel-lab-hero > .relative.z-10 > div.mt-12.w-full > div.grid > div > div:last-child {
          min-width: 0;
          flex: 1 1 auto;
        }

        .travel-lab-hero > .relative.z-10 > div.mt-12.w-full > div.grid > div > div:last-child > p:first-child {
          font-size: clamp(17px, 5vw, 19px) !important;
          line-height: 1 !important;
          letter-spacing: -0.025em !important;
          white-space: nowrap;
        }

        .travel-lab-hero > .relative.z-10 > div.mt-12.w-full > div.grid > div > div:last-child > p:last-child {
          margin-top: 3px;
          font-size: clamp(9.5px, 2.7vw, 10.5px) !important;
          line-height: 1.22 !important;
          font-weight: 600 !important;
          letter-spacing: -0.005em;
          color: rgba(203, 213, 225, 0.84) !important;
          white-space: normal;
          overflow-wrap: anywhere;
        }
      }

      @media (max-width: 359px) {
        .travel-lab-hero > .relative.z-10 > div.mt-12.w-full {
          margin-top: 20px !important;
          padding: 8px !important;
          border-radius: 16px !important;
        }

        .travel-lab-hero > .relative.z-10 > div.mt-12.w-full > div.grid {
          gap: 6px !important;
        }

        .travel-lab-hero > .relative.z-10 > div.mt-12.w-full > div.grid > div {
          min-height: 54px;
          gap: 7px !important;
          padding: 8px 7px !important;
          border-radius: 12px;
        }

        .travel-lab-hero > .relative.z-10 > div.mt-12.w-full > div.grid > div > div:first-child {
          width: 31px !important;
          height: 31px !important;
          flex-basis: 31px !important;
          border-radius: 9px !important;
        }

        .travel-lab-hero > .relative.z-10 > div.mt-12.w-full > div.grid > div > div:first-child svg {
          width: 15px !important;
          height: 15px !important;
        }

        .travel-lab-hero > .relative.z-10 > div.mt-12.w-full > div.grid > div > div:last-child > p:first-child {
          font-size: 16px !important;
        }

        .travel-lab-hero > .relative.z-10 > div.mt-12.w-full > div.grid > div > div:last-child > p:last-child {
          font-size: 9px !important;
          line-height: 1.18 !important;
        }
      }
    `}</style>
  );
}
