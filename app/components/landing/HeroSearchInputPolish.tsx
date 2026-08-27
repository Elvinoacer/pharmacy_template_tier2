"use client";

export default function HeroSearchInputPolish() {
  return (
    <style jsx global>{`
      /* Hero search: one continuous premium surface. No boxed input inside a boxed form. */
      .travel-lab-hero form.travel-lab-hero-cta {
        isolation: isolate;
        min-height: 64px !important;
        padding: 6px 7px 6px 8px !important;
        border: 1px solid rgba(145, 255, 202, .22) !important;
        border-radius: 999px !important;
        background:
          linear-gradient(180deg, rgba(13, 36, 29, .82), rgba(3, 16, 11, .92)) !important;
        box-shadow:
          0 16px 44px rgba(0, 0, 0, .38),
          0 0 0 1px rgba(0, 0, 0, .22),
          inset 0 1px 0 rgba(255, 255, 255, .07) !important;
        animation: none !important;
      }

      .travel-lab-hero form.travel-lab-hero-cta::before {
        inset: 1px !important;
        border-radius: inherit !important;
        background: linear-gradient(105deg, rgba(255,255,255,.055), transparent 30%, rgba(68,255,167,.045) 70%, transparent) !important;
      }

      .travel-lab-hero form.travel-lab-hero-cta::after {
        display: none !important;
      }

      .travel-lab-hero form.travel-lab-hero-cta > div:first-child {
        min-height: 50px;
        padding: 0 9px 0 4px !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
      }

      .travel-lab-hero form.travel-lab-hero-cta > div:first-child > svg {
        width: 36px !important;
        height: 36px !important;
        padding: 9px !important;
        border: 0 !important;
        border-radius: 50% !important;
        background: rgba(105, 236, 172, .10) !important;
        color: #9cefc5 !important;
        box-shadow: inset 0 0 0 1px rgba(148, 255, 205, .10) !important;
      }

      .travel-lab-hero form.travel-lab-hero-cta input,
      .travel-lab-hero form.travel-lab-hero-cta input:focus {
        height: 50px !important;
        padding: 0 8px 0 10px !important;
        border: 0 !important;
        border-radius: 0 !important;
        outline: none !important;
        background: transparent !important;
        box-shadow: none !important;
        font-size: 15px !important;
        color: rgba(255,255,255,.96) !important;
      }

      .travel-lab-hero form.travel-lab-hero-cta input::placeholder {
        color: rgba(226, 232, 240, .72) !important;
      }

      .travel-lab-hero form.travel-lab-hero-cta button[type="submit"] {
        width: 52px !important;
        height: 52px !important;
        flex: 0 0 52px !important;
        border: 1px solid rgba(194, 255, 223, .20) !important;
        border-radius: 50% !important;
        background: radial-gradient(circle at 32% 25%, #29bd8a, #087255 70%) !important;
        box-shadow: 0 10px 24px rgba(3, 96, 68, .38), inset 0 1px 0 rgba(255,255,255,.22) !important;
      }

      .travel-lab-hero form.travel-lab-hero-cta:focus-within {
        transform: translateY(-1px);
        border-color: rgba(113, 255, 183, .50) !important;
        box-shadow: 0 0 0 4px rgba(54, 211, 153, .07), 0 18px 48px rgba(0,0,0,.42), 0 0 34px rgba(52,211,153,.08), inset 0 1px 0 rgba(255,255,255,.09) !important;
      }

      .travel-lab-hero form.travel-lab-hero-cta:focus-within > div:first-child > svg {
        transform: scale(1.04) !important;
        border-color: transparent !important;
        background: rgba(105, 236, 172, .14) !important;
      }

      @media (max-width: 639px) {
        .travel-lab-hero form.travel-lab-hero-cta {
          min-height: 60px !important;
          padding: 5px 6px 5px 7px !important;
          border-radius: 22px !important;
        }

        .travel-lab-hero form.travel-lab-hero-cta > div:first-child {
          min-height: 48px;
          padding-left: 2px !important;
        }

        .travel-lab-hero form.travel-lab-hero-cta > div:first-child > svg {
          width: 34px !important;
          height: 34px !important;
          padding: 8px !important;
        }

        .travel-lab-hero form.travel-lab-hero-cta input,
        .travel-lab-hero form.travel-lab-hero-cta input:focus {
          height: 48px !important;
          padding-left: 9px !important;
          font-size: 14px !important;
        }

        .travel-lab-hero form.travel-lab-hero-cta button[type="submit"] {
          width: 48px !important;
          height: 48px !important;
          flex-basis: 48px !important;
        }
      }
    `}</style>
  );
}
