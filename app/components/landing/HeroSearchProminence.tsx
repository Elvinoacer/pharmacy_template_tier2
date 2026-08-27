"use client";

export default function HeroSearchProminence() {
  return (
    <style jsx global>{`
      /* Make the hero search unmistakably the primary utility on the page. */
      .travel-lab-hero form.travel-lab-hero-cta {
        margin-top: 30px !important;
        min-height: 72px !important;
        border-color: rgba(139, 255, 195, .34) !important;
        background:
          linear-gradient(135deg, rgba(18, 55, 41, .96), rgba(4, 18, 12, .98)) !important;
        box-shadow:
          0 20px 50px rgba(0, 0, 0, .46),
          0 0 0 1px rgba(87, 255, 171, .07),
          0 0 48px rgba(23, 196, 113, .12),
          inset 0 1px 0 rgba(255, 255, 255, .10) !important;
      }

      .travel-lab-hero form.travel-lab-hero-cta::before {
        content: "FIND CARE NEAR YOU" !important;
        position: absolute !important;
        top: -12px !important;
        left: 16px !important;
        z-index: 5 !important;
        display: inline-flex !important;
        align-items: center !important;
        height: 24px !important;
        padding: 0 10px !important;
        border: 1px solid rgba(142, 255, 199, .28) !important;
        border-radius: 999px !important;
        background: #0a2118 !important;
        color: #a9f7ca !important;
        box-shadow: 0 6px 18px rgba(0, 0, 0, .28) !important;
        font-size: 9px !important;
        font-weight: 800 !important;
        letter-spacing: .16em !important;
        line-height: 1 !important;
        white-space: nowrap !important;
        pointer-events: none !important;
      }

      .travel-lab-hero form.travel-lab-hero-cta > div:first-child {
        position: relative;
      }

      .travel-lab-hero form.travel-lab-hero-cta > div:first-child::after {
        content: "Search pharmacies, services or prescriptions";
        position: absolute;
        left: 61px;
        bottom: 5px;
        max-width: calc(100% - 70px);
        overflow: hidden;
        color: rgba(167, 243, 208, .52);
        font-size: 9px;
        font-weight: 600;
        letter-spacing: .02em;
        white-space: nowrap;
        text-overflow: ellipsis;
        pointer-events: none;
      }

      .travel-lab-hero form.travel-lab-hero-cta input {
        height: 50px !important;
        padding-bottom: 13px !important;
        color: #f4fff8 !important;
        font-size: 16px !important;
        font-weight: 650 !important;
      }

      .travel-lab-hero form.travel-lab-hero-cta input::placeholder {
        color: rgba(232, 255, 241, .82) !important;
      }

      .travel-lab-hero form.travel-lab-hero-cta button[type="submit"] {
        width: 58px !important;
        height: 58px !important;
        border-radius: 18px !important;
        background: linear-gradient(145deg, #1ab77d, #087553) !important;
        box-shadow:
          0 12px 28px rgba(0, 92, 62, .48),
          0 0 24px rgba(54, 238, 153, .16),
          inset 0 1px 0 rgba(255, 255, 255, .24) !important;
      }

      .travel-lab-hero form.travel-lab-hero-cta:focus-within {
        transform: translateY(-2px) scale(1.005) !important;
        border-color: rgba(119, 255, 184, .78) !important;
        box-shadow:
          0 24px 58px rgba(0, 0, 0, .52),
          0 0 0 4px rgba(64, 232, 147, .11),
          0 0 60px rgba(34, 211, 132, .18),
          inset 0 1px 0 rgba(255, 255, 255, .13) !important;
      }

      @media (max-width: 639px) {
        .travel-lab-hero form.travel-lab-hero-cta {
          margin-top: 28px !important;
          min-height: 68px !important;
          border-radius: 19px !important;
        }

        .travel-lab-hero form.travel-lab-hero-cta::before {
          top: -11px !important;
          left: 12px !important;
          height: 22px !important;
          padding: 0 8px !important;
          font-size: 8px !important;
          letter-spacing: .13em !important;
        }

        .travel-lab-hero form.travel-lab-hero-cta > div:first-child > svg {
          width: 40px !important;
          height: 40px !important;
        }

        .travel-lab-hero form.travel-lab-hero-cta > div:first-child::after {
          left: 57px;
          bottom: 3px;
          font-size: 8px;
        }

        .travel-lab-hero form.travel-lab-hero-cta input {
          height: 48px !important;
          padding-bottom: 11px !important;
          font-size: 14px !important;
        }

        .travel-lab-hero form.travel-lab-hero-cta button[type="submit"] {
          width: 54px !important;
          height: 54px !important;
          border-radius: 16px !important;
        }
      }
    `}</style>
  );
}
