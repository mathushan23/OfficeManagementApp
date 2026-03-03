import { useState, useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';
import { resolveImageUrl } from '../api';
import BrandLogo from './BrandLogo';

// Styles
const STYLES = `
  :root {
    --gold: #ffd154;
    --amber: #ff9f1c;
    --coral: #ff6b24;
    --orange-deep: #b74808;
    --orange-dark: #742d06;
  }

  @keyframes bdBgFade    { from{opacity:0} to{opacity:1} }
  @keyframes bdCardPop   { 0%{opacity:0;transform:scale(.84) translateY(32px)} 70%{transform:scale(1.02)} 100%{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes shimmer     { 0%{background-position:-200% center} 100%{background-position:200% center} }
  @keyframes floatEmoji  { 0%,100%{transform:translateY(0) rotate(-4deg)} 50%{transform:translateY(-14px) rotate(4deg)} }
  @keyframes spinRing    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes ringGlow    { 0%,100%{box-shadow:0 0 0 0 rgba(245,200,66,.55)} 50%{box-shadow:0 0 0 18px rgba(245,200,66,0)} }
  @keyframes photoIn     { 0%{opacity:0;transform:scale(0) rotate(-20deg)} 70%{transform:scale(1.07) rotate(3deg)} 100%{opacity:1;transform:scale(1) rotate(0)} }
  @keyframes fadeUp      { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slideRight  { from{opacity:0;transform:translateX(-28px)} to{opacity:1;transform:translateX(0)} }
  @keyframes bob         { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
  @keyframes borderCycle { 0%{border-color:var(--gold)} 33%{border-color:var(--amber)} 66%{border-color:var(--coral)} 100%{border-color:var(--gold)} }
  @keyframes starTwinkle { 0%,100%{opacity:.15;transform:scale(.7)} 50%{opacity:1;transform:scale(1.5)} }
  @keyframes nebulaShift { 0%,100%{transform:translateX(-8%) scale(1);opacity:.5} 50%{transform:translateX(8%) scale(1.15);opacity:.85} }
  @keyframes confettiFall{ 0%{transform:translateY(-8vh) rotate(0);opacity:1} 100%{transform:translateY(108vh) rotate(660deg);opacity:0} }
  @keyframes meteor      { 0%{opacity:0;transform:translate(0,0)} 8%{opacity:1} 100%{opacity:0;transform:translate(-580px,290px)} }
  @keyframes heroGlow    { 0%,100%{opacity:.18} 50%{opacity:.34} }

  .bd-overlay {
    position:fixed; inset:0; z-index:9999;
    display:flex; align-items:center; justify-content:center;
    background:rgba(6,10,28,.84);
    backdrop-filter:blur(10px);
    animation:bdBgFade .35s ease both;
    padding:14px;
  }

  .bd-card {
    position:relative;
    width:100%; max-width:980px;
    background:
      radial-gradient(circle at 14% 76%, rgba(255,181,66,.22) 0%, rgba(255,181,66,0) 42%),
      radial-gradient(circle at 88% 18%, rgba(255,130,41,.24) 0%, rgba(255,130,41,0) 40%),
      linear-gradient(145deg, #4a1d08 0%, #8d3509 35%, #bc4d0d 62%, #6b2508 100%);
    border:3px solid #ff7a1a;
    border-radius:28px;
    overflow:hidden;
    animation:bdCardPop .5s cubic-bezier(.34,1.56,.64,1) both;
    box-shadow:
      0 28px 70px rgba(8, 4, 0, .65),
      inset 0 1px 0 rgba(255,255,255,.18);
    max-height:92vh; overflow-y:auto;
  }

  .bd-bg-wrap { position:absolute; inset:0; pointer-events:none; z-index:0; overflow:hidden; opacity:.9; }
  .bd-starfield { position:absolute; inset:0; }
  .bd-star { position:absolute; border-radius:2px; background:rgba(255,193,98,.9); animation:starTwinkle ease-in-out infinite; }
  .bd-nebula { position:absolute; border-radius:50%; filter:blur(72px); animation:nebulaShift ease-in-out infinite; }
  .bd-meteor { display:none; }
  .bd-hero-glow { position:absolute; inset:0; background:radial-gradient(ellipse 85% 65% at 50% 0%,rgba(255,190,74,.18),transparent 68%); animation:heroGlow 3s ease-in-out infinite; pointer-events:none; }

  .bd-content { position:relative; z-index:1; }
  .bd-decor { position:absolute; inset:0; z-index:1; pointer-events:none; overflow:hidden; }
  .bd-confetti-piece {
    position:absolute;
    width:9px; height:16px; border-radius:2px;
    opacity:.88; transform:rotate(18deg);
    box-shadow:0 2px 5px rgba(0,0,0,.22);
  }
  .bd-confetti-piece.c1 { left:5%; top:20%; background:#ffc84e; transform:rotate(-22deg); }
  .bd-confetti-piece.c2 { left:8%; top:44%; background:#ff7a1a; transform:rotate(35deg); }
  .bd-confetti-piece.c3 { left:12%; top:72%; background:#ffb347; transform:rotate(-34deg); }
  .bd-confetti-piece.c4 { right:6%; top:24%; background:#ffc84e; transform:rotate(18deg); }
  .bd-confetti-piece.c5 { right:9%; top:54%; background:#ff7a1a; transform:rotate(-28deg); }
  .bd-confetti-piece.c6 { right:12%; top:82%; background:#ffb347; transform:rotate(31deg); }
  .bd-ribbon {
    position:absolute; width:26px; height:74px; border:4px solid #ffb13e; border-top:0; border-left:0;
    border-radius:0 0 24px 0; opacity:.85;
  }
  .bd-ribbon.r1 { left:7%; top:28%; transform:rotate(-30deg); }
  .bd-ribbon.r2 { right:8%; top:35%; transform:rotate(24deg) scaleX(-1); }
  .bd-bunting {
    position:absolute; right:16%; top:18%;
    display:flex; gap:4px;
  }
  .bd-bunting span {
    width:0; height:0; border-left:16px solid transparent; border-right:16px solid transparent; border-top:24px solid #ffb347;
    filter:drop-shadow(0 2px 3px rgba(0,0,0,.35));
  }
  .bd-bunting span:nth-child(2n) { border-top-color:#ff7a1a; }
  .bd-balloon {
    position:absolute; border-radius:50%; box-shadow:inset -8px -12px 20px rgba(0,0,0,.16), 0 10px 18px rgba(0,0,0,.25);
  }
  .bd-balloon::before {
    content:''; position:absolute; left:16%; top:12%; width:28%; height:20%; border-radius:50%;
    background:rgba(255,255,255,.65);
  }
  .bd-balloon::after {
    content:''; position:absolute; left:50%; bottom:-18px; width:2px; height:44px; background:rgba(255,177,88,.7);
  }
  .bd-balloon.red { background:radial-gradient(circle at 35% 25%, #ff9a6e 0%, #ff5f1a 35%, #d74300 100%); }
  .bd-balloon.yellow { background:radial-gradient(circle at 35% 25%, #fff6a2 0%, #ffd852 40%, #ffba08 100%); }
  .bd-balloon.b1 { left:2%; top:6%; width:74px; height:98px; }
  .bd-balloon.b2 { left:1.5%; top:16%; width:58px; height:82px; }
  .bd-balloon.b3 { right:2%; top:5%; width:72px; height:96px; }
  .bd-balloon.b4 { right:6%; top:15%; width:56px; height:80px; }
  .bd-cap {
    position:absolute;
    font-size:3.1rem;
    line-height:1;
    filter:drop-shadow(0 4px 10px rgba(0,0,0,.36));
  }
  .bd-cap.left { left:26%; top:13%; transform:rotate(-14deg); }
  .bd-cap.right { right:8%; top:15%; transform:rotate(16deg); }
  .bd-bottom-decor {
    position:absolute; bottom:14px; left:0; right:0;
    display:flex; justify-content:space-between; padding:0 22px;
    font-size:4rem; line-height:1; opacity:.96;
    filter:drop-shadow(0 7px 8px rgba(0,0,0,.32));
  }

  .bd-topbar {
    display:flex; align-items:center; justify-content:space-between;
    padding:14px 22px 10px;
    background:linear-gradient(180deg, #6a2a0a 0%, #8b380d 52%, #a8450f 100%);
    border-bottom:2px solid rgba(255,194,126,.45);
  }
  .bd-logo-box {
    width:fit-content;
    display:flex;
    align-items:flex-end;
    max-width:100%;
    filter:drop-shadow(0 1px 0 rgba(255,255,255,.85)) drop-shadow(0 3px 8px rgba(90,38,6,.14));
  }
  .bd-close {
    background:rgba(110,38,8,.45); border:1px solid rgba(255,215,131,.34);
    border-radius:50%; width:36px; height:36px;
    display:flex; align-items:center; justify-content:center;
    cursor:pointer; color:#fff; font-size:1.2rem; transition:all .2s;
  }
  .bd-close:hover { background:rgba(124,39,7,.72); border-color:#ffd18a; color:#fff; transform:scale(1.08); }

  .bd-hero { position:relative; padding:10px 24px 18px; text-align:center; }
  .bd-title {
    font-family:'Pacifico',cursive;
    font-size:clamp(2.3rem,6.4vw,5rem);
    color:#fff;
    text-shadow:0 4px 0 rgba(122,46,10,.45), 0 8px 26px rgba(0,0,0,.38);
    line-height:1.15;
  }
  .bd-title::after {
    content:''; display:block; margin:6px auto 0; width:min(440px,72%);
    height:6px; border-radius:999px; background:linear-gradient(90deg, rgba(255,190,78,.2), #ffc553, rgba(255,190,78,.2));
  }
  .bd-subtitle {
    font-family:'DM Sans',sans-serif;
    color:rgba(255,240,218,.82); font-size:.82rem; letter-spacing:3px; text-transform:uppercase; margin-top:6px;
  }
  .bd-emojis { display:flex; justify-content:center; gap:16px; margin-top:8px; font-size:1.8rem; filter:drop-shadow(0 4px 10px rgba(0,0,0,.3)); }
  .bd-emojis span { display:inline-block; animation:none; }
  .bd-emojis span:nth-child(2){animation-delay:.28s}
  .bd-emojis span:nth-child(3){animation-delay:.56s}
  .bd-emojis span:nth-child(4){animation-delay:.84s}

  .bd-divider {
    height:1px; margin:0 26px;
    background:linear-gradient(90deg,transparent,#ffc965,#ffd692,#ffc965,transparent);
    opacity:.55;
  }

  .bd-body { padding:18px 24px 10px; display:grid; grid-template-columns:1fr; gap:18px; }
  @media(min-width:620px){ .bd-body{grid-template-columns:260px 1fr} }

  .bd-photo-col { display:flex; flex-direction:column; align-items:center; gap:12px; }
  .bd-ring-wrap {
    position:relative; border-radius:50%; padding:8px;
    background:linear-gradient(145deg, #fff3e0, #ffd29a);
    border:5px solid #ff6d00;
    animation:none;
    box-shadow:0 10px 30px rgba(23, 9, 2, .38);
  }
  .bd-ring-inner { display:none; }
  .bd-photo {
    position:relative; z-index:1;
    width:220px; height:220px; border-radius:50%; object-fit:cover; display:block;
    border:4px solid #fff;
    animation:photoIn .45s ease-out both;
  }
  .bd-fallback {
    position:relative; z-index:1;
    width:220px; height:220px; border-radius:50%;
    background:linear-gradient(135deg,#ffd073,#ff8a00);
    display:flex; align-items:center; justify-content:center;
    border:4px solid #fff;
    font-family:'Pacifico',cursive; font-size:4.3rem; color:#762f04;
    animation:photoIn .45s ease-out both;
  }
  .bd-age-badge {
    background:linear-gradient(180deg,#ff9e0a,#f2670d);
    border:2px solid #ffc66f;
    border-radius:999px; padding:7px 22px;
    font-family:'DM Sans',sans-serif; font-weight:700; font-size:1rem; color:#fff;
    letter-spacing:.2px; box-shadow:0 8px 18px rgba(22,8,2,.35);
    animation:none;
  }

  .bd-info-col { display:flex; flex-direction:column; gap:14px; }
  .bd-name {
    font-family:'DM Sans',sans-serif;
    font-size:clamp(2rem,4.8vw,3.4rem);
    color:#fff;
    font-weight:700;
    text-shadow:0 5px 12px rgba(0,0,0,.35);
    line-height:1.08;
    border-bottom:2px solid rgba(255,204,123,.5);
    padding-bottom:8px;
  }
  .bd-date-row {
    display:flex; align-items:center; gap:8px;
    font-family:'DM Sans',sans-serif; font-size:2rem; color:#ffdba9; font-weight:700;
    animation:none;
  }
  .bd-date-row strong { color:#fff; }
  .bd-date-row span { font-size:clamp(1.15rem,2.2vw,1.35rem); }

  .bd-wish-box {
    position:relative; border-radius:16px; padding:18px 18px;
    background:rgba(73,24,7,.6); border:1px solid rgba(255,205,127,.38);
    animation:none; overflow:hidden;
  }
  .bd-wish-box::before {
    content:'\\201C'; position:absolute; top:-8px; left:14px;
    font-family:'Pacifico',cursive; font-size:5rem; color:rgba(245,200,66,.1); line-height:1;
  }
  .bd-wish-box::after {
    content:''; position:absolute; inset:0; border-radius:18px;
    background:linear-gradient(135deg,rgba(245,200,66,.04),transparent 60%,rgba(192,132,252,.04));
    pointer-events:none;
  }
  .bd-wish-text {
    font-family:'DM Sans',sans-serif;
    font-size:clamp(1.02rem,2.1vw,1.16rem); color:#fff;
    line-height:1.5; white-space:pre-wrap; position:relative; z-index:1; font-weight:700;
    text-align:center;
  }

  .bd-actions {
    display:flex; flex-wrap:nowrap; gap:12px; justify-content:center; align-items:center;
    padding:0 26px 24px; animation:none;
  }
  .bd-btn {
    font-family:'DM Sans',sans-serif; font-weight:700; font-size:1.05rem;
    border:none; border-radius:16px; cursor:pointer; padding:10px 18px; letter-spacing:.1px;
    transition:all .2s ease;
    white-space:nowrap;
    line-height:1.2;
  }
  .bd-btn-primary {
    background:linear-gradient(180deg,#ff9f13,#ef5f09);
    color:#fff;
    border:2px solid #ffc873;
    box-shadow:0 8px 24px rgba(34,11,1,.4), inset 0 1px 0 rgba(255,255,255,.38);
    min-width:170px;
  }
  .bd-btn-primary:hover { transform:translateY(-2px); }
  .bd-btn-primary:disabled { opacity:.55; cursor:wait; transform:none; }
  .bd-btn-ghost {
    background:rgba(255,243,224,.14); color:#fff; border:2px solid rgba(255,212,153,.5);
    min-width:220px;
  }
  .bd-btn-ghost:hover { background:rgba(255,243,224,.22); color:#fff; transform:translateY(-1px); }

  @media (max-width: 720px) {
    .bd-topbar { padding:12px 16px 10px; }
    .bd-hero { padding:10px 14px 14px; }
    .bd-body { padding:14px 14px 6px; }
    .bd-photo, .bd-fallback { width:170px; height:170px; }
    .bd-name { font-size:2.1rem; text-align:center; }
    .bd-date-row { justify-content:center; }
    .bd-actions {
      flex-direction:row;
      flex-wrap:nowrap;
      align-items:center;
      justify-content:center;
      gap:10px;
      padding:0 14px 16px;
    }
    .bd-btn {
      width:calc(50% - 5px);
      min-width:0;
      max-width:190px;
      flex:0 1 auto;
      font-size:.98rem;
      padding:10px 12px;
    }
    .bd-btn-primary { min-width:0; }
    .bd-btn-ghost { min-width:0; }
    .bd-bottom-decor { display:none; }
    .bd-cap { font-size:2.3rem; }
    .bd-cap.left { left:21%; top:16%; }
    .bd-cap.right { right:7%; top:18%; }
  }
  .bd-export .bd-close, .bd-export .bd-actions, .bd-export .bd-decor { display:none !important; }
  .bd-export-mobile {
    width:390px !important;
    max-width:390px !important;
    max-height:none !important;
    overflow:visible !important;
  }
  .bd-export-mobile .bd-topbar { padding:12px 16px 10px; }
  .bd-export-mobile .bd-hero { padding:10px 14px 14px; }
  .bd-export-mobile .bd-body {
    padding:14px 14px 14px;
    grid-template-columns:1fr;
    gap:14px;
  }
  .bd-export-mobile .bd-photo,
  .bd-export-mobile .bd-fallback {
    width:170px;
    height:170px;
  }
  .bd-export-mobile .bd-name {
    font-size:2.1rem;
    text-align:center;
  }
  .bd-export-mobile .bd-date-row {
    justify-content:center;
  }
  .bd-export-mobile .bd-bottom-decor {
    display:none;
  }

  .bd-confetti-wrap { position:fixed; inset:0; pointer-events:none; overflow:hidden; z-index:10000; }
  .bd-cf { position:absolute; top:0; animation:confettiFall linear infinite; }
`;

const CF_COLORS = ['#f5c842','#ff9f1c','#ff6b6b','#c084fc','#34d399','#60a5fa','#fbbf24','#a78bfa'];

const CONFETTI_DATA = Array.from({ length: 32 }, (_, i) => ({
  id: i,
  left:   `${(i / 32) * 97 + (i % 3)}%`,
  w:      `${6 + (i % 5) * 1.6}px`,
  h:      `${6 + (i % 4) * 1.8}px`,
  color:  CF_COLORS[i % CF_COLORS.length],
  dur:    `${2.3 + (i % 7) * 0.4}s`,
  delay:  `${(i % 9) * 0.5}s`,
  circle: i % 3 !== 0,
}));

const STAR_DATA = Array.from({ length: 42 }, (_, i) => ({
  id: i,
  left:  `${(i * 2.38) % 100}%`,
  top:   `${(i * 3.71) % 100}%`,
  size:  `${1 + (i % 4)}px`,
  dur:   `${1.4 + (i % 6) * 0.4}s`,
  delay: `${(i % 7) * 0.35}s`,
}));

const NEBULAS = [
  { color:'rgba(245,200,66,.11)',  w:'55%', h:'45%', top:'-15%', left:'-10%', dur:'10s', delay:'0s'  },
  { color:'rgba(192,132,252,.09)', w:'50%', h:'40%', top:'50%',  left:'55%',  dur:'13s', delay:'2s'  },
  { color:'rgba(96,165,250,.07)',  w:'45%', h:'35%', top:'20%',  left:'60%',  dur:'16s', delay:'4s'  },
  { color:'rgba(52,211,153,.06)',  w:'40%', h:'30%', top:'70%',  left:'-5%',  dur:'11s', delay:'1s'  },
];

const METEOR_DATA = Array.from({ length: 5 }, (_, i) => ({
  id: i,
  top:   `${8 + i * 14}%`,
  left:  `${60 + i * 8}%`,
  w:     `${80 + i * 30}px`,
  dur:   `${5 + i * 2.5}s`,
  delay: `${i * 3.2}s`,
}));

const UI_ICONS = Object.freeze({
  close: '\u00D7',
  cake: '\u{1F382}',
  party: '\u{1F389}',
  balloon: '\u{1F388}',
  partyFace: '\u{1F973}',
  calendar: '\u{1F4C5}',
  hourglass: '\u23F3',
  download: '\u2B07',
});

function Confetti() {
  return (
    <div className="bd-confetti-wrap">
      {CONFETTI_DATA.map((p) => (
        <div key={p.id} className="bd-cf" style={{
          left: p.left, width: p.w, height: p.h, background: p.color,
          animationDuration: p.dur, animationDelay: p.delay,
          borderRadius: p.circle ? '50%' : '3px', opacity: 0.88,
        }}/>
      ))}
    </div>
  );
}

function CosmicBg() {
  return (
    <div className="bd-bg-wrap">
      <div className="bd-starfield">
        {STAR_DATA.map((s) => (
          <div key={s.id} className="bd-star" style={{
            left: s.left, top: s.top, width: s.size, height: s.size,
            animationDuration: s.dur, animationDelay: s.delay,
          }}/>
        ))}
      </div>
      {NEBULAS.map((n, i) => (
        <div key={i} className="bd-nebula" style={{
          background: n.color, width: n.w, height: n.h, top: n.top, left: n.left,
          animationDuration: n.dur, animationDelay: n.delay,
          animationIterationCount: 'infinite', animationTimingFunction: 'ease-in-out',
          animationName: 'nebulaShift',
        }}/>
      ))}
      {METEOR_DATA.map((m) => (
        <div key={m.id} className="bd-meteor" style={{
          top: m.top, left: m.left, width: m.w,
          animationDuration: m.dur, animationDelay: m.delay,
          animationIterationCount: 'infinite',
        }}/>
      ))}
      <div className="bd-hero-glow"/>
    </div>
  );
}

export default function StaffBirthdayPopup({ open, card, onClose }) {
  const [downloading, setDownloading] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [exportMobileStyle, setExportMobileStyle] = useState(false);
  const styleRef = useRef(false);
  const cardRef = useRef(null);

  useEffect(() => {
    if (styleRef.current) return;
    styleRef.current = true;
    const tag = document.createElement('style');
    tag.textContent = STYLES;
    document.head.appendChild(tag);
  }, []);

  if (!open || !card) return null;

  const downloadImage = async () => {
    setDownloading(true);
    try {
      if (!cardRef.current) {
        throw new Error('Birthday card not ready for export.');
      }

      setExportMode(true);
      setExportMobileStyle(true);
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const imageData = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: '#0b0820',
      });
      const name = String(card.staff_name || 'staff').replace(/\s+/g, '_');
      const fileName = `birthday_card_${name}_${card.birthday_date}.png`;
      const link = document.createElement('a');
      link.href = imageData;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate image.';
      console.error('Birthday image export failed:', err);
      window.alert(message);
    } finally {
      setExportMobileStyle(false);
      setExportMode(false);
      setDownloading(false);
    }
  };

  // During image export, never use remote image URLs (CORS blocks html-to-image fetch).
  // Use embedded base64 data only; otherwise fallback avatar is rendered.
  const photoSrc = exportMode
    ? (card.profile_photo_data || null)
    : (card.profile_photo_data || (card.profile_photo ? resolveImageUrl(card.profile_photo) : null));

  return (
    <>
      <Confetti />
      <div className="bd-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className={`bd-card ${exportMode ? 'bd-export' : ''} ${exportMobileStyle ? 'bd-export-mobile' : ''}`} ref={cardRef}>
          <CosmicBg />
          <div className="bd-decor" aria-hidden="true">
            <div className="bd-balloon red b1" />
            <div className="bd-balloon yellow b2" />
            <div className="bd-balloon yellow b3" />
            <div className="bd-balloon red b4" />
            <div className="bd-cap left">🥳</div>
            <div className="bd-cap right">🎉</div>
            <div className="bd-bunting">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="bd-ribbon r1" />
            <div className="bd-ribbon r2" />
            <div className="bd-confetti-piece c1" />
            <div className="bd-confetti-piece c2" />
            <div className="bd-confetti-piece c3" />
            <div className="bd-confetti-piece c4" />
            <div className="bd-confetti-piece c5" />
            <div className="bd-confetti-piece c6" />
            <div className="bd-bottom-decor">
              <span>🎂</span>
              <span>🎁</span>
            </div>
          </div>
          <div className="bd-content">
            <div className="bd-topbar">
              <div className="bd-logo-box">
                <BrandLogo size="sm" className="max-w-full" />
              </div>
              <button className="bd-close" onClick={onClose} aria-label="Close">{UI_ICONS.close}</button>
            </div>

            <div className="bd-hero">
              <div className="bd-title">Happy Birthday!</div>
              <div className="bd-subtitle">A special day for a special person</div>
              <div className="bd-emojis">
                <span role="img" aria-label="cake">{UI_ICONS.cake}</span>
                <span role="img" aria-label="party">{UI_ICONS.party}</span>
                <span role="img" aria-label="balloon">{UI_ICONS.balloon}</span>
                <span role="img" aria-label="party face">{UI_ICONS.partyFace}</span>
              </div>
            </div>

            <div className="bd-divider" />

            <div className="bd-body">
              <div className="bd-photo-col">
                <div className="bd-ring-wrap">
                  <div className="bd-ring-inner" />
                  {photoSrc
                    ? <img src={photoSrc} alt={`${card.staff_name} profile`} className="bd-photo" />
                    : <div className="bd-fallback">{String(card.staff_name || 'S').charAt(0).toUpperCase()}</div>
                  }
                </div>
              </div>

              <div className="bd-info-col">
                <div className="bd-name">{card.staff_name}</div>
                <div className="bd-date-row">
                  <span>{UI_ICONS.calendar}</span>
                  <span>Birthday: <strong>{card.birthday_date}</strong></span>
                </div>
                <div className="bd-date-row">
                  <span>{UI_ICONS.balloon}</span>
                  <span>Age: <strong>{card.age} Years</strong></span>
                </div>
                <div className="bd-wish-box">
                  <p className="bd-wish-text">{card.wish_message}</p>
                </div>
              </div>
            </div>

            <div className="bd-actions">
              <button type="button" className="bd-btn bd-btn-primary" onClick={onClose}>Close</button>
              <button type="button" className="bd-btn bd-btn-ghost" onClick={downloadImage} disabled={downloading}>
                {downloading ? `${UI_ICONS.hourglass} Preparing Image...` : `${UI_ICONS.download} Download Image`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

