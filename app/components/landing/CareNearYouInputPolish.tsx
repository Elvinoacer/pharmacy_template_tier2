"use client";

export default function CareNearYouInputPolish() {
  return (
    <style jsx global>{`
      /* Care Near You gets its own calmer search language: one continuous instrument,
         not a cyan-outlined box with smaller boxes inside it. */
      @keyframes care-search-breathe {
        0%,100% { box-shadow: 0 16px 40px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.055); }
        50% { box-shadow: 0 20px 48px rgba(0,0,0,.42), 0 0 26px rgba(61,190,126,.045), inset 0 1px 0 rgba(255,255,255,.07); }
      }

      #network form[action="/pharmacies"] {
        position: relative;
        isolation: isolate;
        overflow: hidden;
        min-height: 64px !important;
        padding: 5px 6px !important;
        border: 1px solid rgba(255,255,255,.09) !important;
        border-radius: 18px !important;
        background: linear-gradient(135deg, rgba(13,25,21,.94), rgba(4,12,9,.98)) !important;
        box-shadow: 0 16px 40px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.055) !important;
        animation: care-search-breathe 9s ease-in-out infinite;
      }

      #network form[action="/pharmacies"]::before {
        content: "";
        position: absolute;
        inset: 1px;
        z-index: -1;
        pointer-events: none;
        border-radius: inherit;
        background: linear-gradient(105deg, rgba(255,255,255,.035), transparent 28%, rgba(69,190,128,.025) 72%, transparent);
      }

      #network form[action="/pharmacies"]::after {
        content: "";
        position: absolute;
        left: 66px;
        right: 68px;
        bottom: 0;
        height: 1px;
        pointer-events: none;
        background: linear-gradient(90deg, transparent, rgba(112,226,165,.16), transparent);
        opacity: .55;
      }

      #network form[action="/pharmacies"] > div:first-child {
        min-width: 0;
        padding-left: 5px !important;
        padding-right: 6px !important;
      }

      /* No green/cyan box around the icon. It lives directly inside the surface. */
      #network form[action="/pharmacies"] > div:first-child > svg {
        width: 42px !important;
        height: 42px !important;
        flex: 0 0 auto;
        padding: 10px;
        border: 0 !important;
        border-radius: 50% !important;
        background: rgba(255,255,255,.035) !important;
        color: rgba(172,231,199,.88) !important;
        box-shadow: none !important;
        transition: transform .25s cubic-bezier(.2,1.2,.3,1), background .25s ease, color .25s ease !important;
      }

      #network form[action="/pharmacies"] input {
        min-width: 0;
        height: 52px !important;
        padding-left: 10px !important;
        padding-right: 8px !important;
        border: 0 !important;
        outline: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        color: #f4f8f5 !important;
        font-size: 15px !important;
        font-weight: 520;
        letter-spacing: -.01em;
        caret-color: #8fd5ad;
      }

      #network form[action="/pharmacies"] input::placeholder {
        color: rgba(211,221,215,.58) !important;
        opacity: 1;
      }

      /* Search action is the only raised element, so the eye understands where to tap. */
      #network form[action="/pharmacies"] button[type="submit"] {
        position: relative;
        width: 50px !important;
        height: 50px !important;
        flex: 0 0 auto;
        border: 1px solid rgba(164,240,199,.18) !important;
        border-radius: 15px !important;
        background: linear-gradient(145deg, rgba(34,139,96,.96), rgba(10,84,58,.98)) !important;
        color: #f2fff7 !important;
        box-shadow: 0 8px 20px rgba(0,0,0,.26), inset 0 1px 0 rgba(255,255,255,.16) !important;
      }

      #network form[action="/pharmacies"] button[type="submit"]::after {
        content: none !important;
      }

      #network form[action="/pharmacies"]:focus-within {
        transform: translateY(-1px);
        border-color: rgba(126,196,156,.26) !important;
        background: linear-gradient(135deg, rgba(16,31,25,.97), rgba(4,14,10,1)) !important;
        box-shadow: 0 0 0 3px rgba(73,176,119,.055), 0 20px 48px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.075) !important;
      }

      #network form[action="/pharmacies"]:focus-within > div:first-child > svg {
        transform: scale(1.06);
        background: rgba(87,193,132,.10) !important;
        color: #b8f0ce !important;
      }

      #network form[action="/pharmacies"] button[type="submit"]:active {
        transform: scale(.94) !important;
      }

      @media (max-width: 639px) {
        #network form[action="/pharmacies"] {
          min-height: 60px !important;
          padding: 4px 5px !important;
          border-radius: 17px !important;
        }
        #network form[action="/pharmacies"] > div:first-child > svg {
          width: 40px !important;
          height: 40px !important;
          padding: 9px;
        }
        #network form[action="/pharmacies"] input {
          height: 50px !important;
          padding-left: 8px !important;
          font-size: 14px !important;
        }
        #network form[action="/pharmacies"] button[type="submit"] {
          width: 48px !important;
          height: 48px !important;
          border-radius: 14px !important;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #network form[action="/pharmacies"] { animation: none !important; }
      }
    `}</style>
  );
}
