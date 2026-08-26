"use client";

export default function CareNearYouInputPolish() {
  return (
    <style jsx global>{`
      @keyframes care-search-orbit { 0%,100%{transform:translate3d(-2%,0,0);opacity:.34} 50%{transform:translate3d(3%,0,0);opacity:.62} }
      @keyframes care-search-breathe { 0%,100%{box-shadow:0 18px 42px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.075),inset 0 -1px 0 rgba(255,255,255,.02)} 50%{box-shadow:0 22px 52px rgba(0,0,0,.42),0 0 30px rgba(50,211,145,.07),inset 0 1px 0 rgba(255,255,255,.10),inset 0 -1px 0 rgba(255,255,255,.025)} }
      #network form[action="/pharmacies"] { position:relative;isolation:isolate;overflow:hidden;min-height:66px!important;padding:5px!important;border:1px solid rgba(165,255,211,.22)!important;border-radius:22px!important;background:linear-gradient(135deg,rgba(14,40,31,.92),rgba(3,16,11,.97))!important;box-shadow:0 18px 42px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.075),inset 0 -1px 0 rgba(255,255,255,.02)!important;animation:care-search-breathe 8s ease-in-out infinite; }
      #network form[action="/pharmacies"]::before { content:"";position:absolute;inset:1px;z-index:-1;border-radius:inherit;pointer-events:none;background:radial-gradient(circle at 10% 50%,rgba(103,255,186,.12),transparent 25%),linear-gradient(100deg,rgba(255,255,255,.06),transparent 24%,transparent 74%,rgba(82,255,170,.055)); }
      #network form[action="/pharmacies"]::after { content:"";position:absolute;left:-8%;right:-8%;bottom:0;height:2px;pointer-events:none;background:linear-gradient(90deg,transparent 0%,rgba(104,255,184,.08) 12%,rgba(130,255,195,.52) 50%,rgba(104,255,184,.08) 88%,transparent 100%);filter:blur(.2px);animation:care-search-orbit 6.5s ease-in-out infinite; }
      #network form[action="/pharmacies"] > div:first-child { min-width:0;padding-left:5px!important;padding-right:6px!important; }
      #network form[action="/pharmacies"] > div:first-child > svg { width:44px!important;height:44px!important;flex:0 0 auto;padding:11px;border:1px solid rgba(155,255,205,.24);border-radius:15px!important;background:linear-gradient(145deg,rgba(33,132,92,.42),rgba(5,42,28,.74))!important;color:#a1f4ca!important;box-shadow:0 8px 20px rgba(0,0,0,.22),inset 0 1px 0 rgba(255,255,255,.10)!important; }
      #network form[action="/pharmacies"] input { height:52px!important;min-width:0;padding-left:12px!important;padding-right:8px!important;color:#f4fff9!important;font-size:15px!important;font-weight:560;letter-spacing:-.01em;caret-color:#a8ffd1; }
      #network form[action="/pharmacies"] input::placeholder { color:rgba(220,238,229,.72)!important;opacity:1; }
      #network form[action="/pharmacies"] button[type="submit"] { width:54px!important;height:54px!important;flex:0 0 auto;border:1px solid rgba(194,255,223,.30)!important;border-radius:17px!important;background:linear-gradient(145deg,#1bb47f 0%,#087052 100%)!important;box-shadow:0 12px 28px rgba(3,83,57,.46),inset 0 1px 0 rgba(255,255,255,.22)!important; }
      #network form[action="/pharmacies"] button[type="submit"]::after { content:"";position:absolute;inset:5px;border-radius:12px;border:1px solid rgba(255,255,255,.10);pointer-events:none; }
      #network form[action="/pharmacies"]:focus-within { transform:translateY(-2px);border-color:rgba(119,255,190,.78)!important;box-shadow:0 0 0 4px rgba(66,230,151,.10),0 24px 58px rgba(0,0,0,.48),0 0 40px rgba(35,220,141,.11),inset 0 1px 0 rgba(255,255,255,.12)!important; }
      #network form[action="/pharmacies"]:focus-within > div:first-child > svg { transform:scale(1.055) rotate(-3deg);background:linear-gradient(145deg,rgba(42,166,111,.60),rgba(7,57,37,.82))!important;border-color:rgba(162,255,211,.40)!important; }
      #network form[action="/pharmacies"] button[type="submit"]:active { transform:scale(.93)!important; }
      @media (max-width:639px) { #network form[action="/pharmacies"] { min-height:62px!important;border-radius:20px!important;padding:4px!important; } #network form[action="/pharmacies"] > div:first-child > svg { width:42px!important;height:42px!important;padding:10px;border-radius:14px!important; } #network form[action="/pharmacies"] input { height:50px!important;padding-left:10px!important;font-size:14px!important; } #network form[action="/pharmacies"] button[type="submit"] { width:52px!important;height:52px!important;border-radius:16px!important; } }
      @media (prefers-reduced-motion:reduce) { #network form[action="/pharmacies"], #network form[action="/pharmacies"]::after { animation:none!important; } }
    `}</style>
  );
}
