import { Component, Suspense, lazy, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import MapAtlas, { type MapCommand } from "./MapAtlas";
import { arenas, type Arena } from "./data";

type Language = "zh" | "en";
type Phase = "map" | "transition" | "grove";
const World = lazy(() => import('./World'));

class GroveBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="scene-fallback">三维竹林暂无法显示，仍可返回地图探索。<br/>The 3D grove is unavailable. You can return to the map.</div> : this.props.children; }
}

const copy = {
  zh: {
    smallTitle: "武道山集", english: "WUDAO · VIRTUAL CARNIVAL", strap: "FIVE WAYS INTO THE GROVE",
    title: "五艺入山", subtitle: "一场山林里的切磋", hint: "拖动山图，循着竹影探索五处场地。",
    drag: "拖动探索", scroll: "滚轮缩放", soundOn: "音轨接口预留", soundOff: "声音关闭",
    reset: "回到山海总图", close: "收起场地", enter: "入山 · ENTER THE GROVE",
    selected: "你已寻到一处场地", exploring: "循着竹影，继续向前。", map: "山海总图", mapSub: "THE MOUNTAIN MAP",
    route: "沿山路探索", place: "场地", footer: "山风未起，故事先行。", transition: "竹影聚拢 · 气泡成林",
    back: "返回地图", placeholder: "两位气泡侠，先在竹海里过两招。", groveSubtitle: "先让想象切磋，下一幕由你编排。",
  },
  en: {
    smallTitle: "WuDao Mountain Gathering", english: "WUDAO · VIRTUAL CARNIVAL", strap: "FIVE WAYS INTO THE GROVE",
    title: "Five Paths", subtitle: "A friendly spar in the mountain forest", hint: "Drag the map and follow the bamboo shadows to explore five arenas.",
    drag: "Drag to explore", scroll: "Scroll to zoom", soundOn: "Audio reserved", soundOff: "Sound off",
    reset: "Return to mountain map", close: "Close arena", enter: "Enter the grove",
    selected: "You found an arena", exploring: "Follow the bamboo shadows.", map: "Mountain map", mapSub: "THE MOUNTAIN MAP",
    route: "Explore the mountain path", place: "ARENA", footer: "The story begins before the wind.", transition: "Bamboo gathers · Bubbles become a grove",
    back: "Return to map", placeholder: "Two bubble fighters, sparring in the bamboo sea.", groveSubtitle: "A playful placeholder. The next scene is yours to choreograph.",
  },
} as const;

function SoundGlyph({ enabled }: { enabled: boolean }) {
  return <span className={`sound-glyph ${enabled ? "on" : ""}`} aria-hidden="true"><i /><i /><i /><i /></span>;
}

export default function App() {
  const [language, setLanguage] = useState<Language>("zh");
  const [selected, setSelected] = useState<Arena | null>(null);
  const [phase, setPhase] = useState<Phase>("map");
  const [sound, setSound] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [mapCommand, setMapCommand] = useState<MapCommand>({ action: 'reset', sequence: 0 });
  const t = copy[language];
  const currentArenaIndex = selected ? arenas.findIndex((a) => a.id === selected.id) : 1;
  const currentArena = selected ?? arenas[1];

  useEffect(() => {
    if (phase !== "transition") return;
    const timer = window.setTimeout(() => setPhase("grove"), 1800);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const returnToMap = () => { setPhase("map"); setSelected(null); setMapCommand((v) => ({ action: 'reset', sequence: v.sequence + 1 })); };
  const selectArena = (arena: Arena) => { setPhase('map'); setSelected(arena); setMapCommand((v) => ({ action: 'focus', id: arena.id, sequence: v.sequence + 1 })); };
  const zoomMap = (action: 'zoomIn' | 'zoomOut') => setMapCommand((v) => ({ action, sequence: v.sequence + 1 }));
  const isGrove = phase === "grove";

  return <main className={`experience ${phase !== 'map' ? "in-grove" : "on-map"} ${selected ? 'has-selection' : ''} ${selected && selected.mapPoint[0] > .65 ? 'selection-east' : ''}`}>
    <div className="grain" />
    <MapAtlas arenas={arenas} selected={selected} language={language} command={mapCommand} active={phase === 'map'} onSelect={selectArena} onZoom={setZoom} />
    {phase !== 'map' && <div className="canvas-wrap" aria-label={language === 'zh' ? '竹林空地与气泡人物' : 'Bamboo grove with bubble fighters'}>
      <GroveBoundary><Suspense fallback={<div className="scene-fallback">竹影聚拢 · Loading the grove…</div>}><World /></Suspense></GroveBoundary>
    </div>}
    <div className="vignette" />
    <header className="topbar">
      <button className="menu-mark" aria-label={t.reset} onClick={returnToMap}><span>武</span><i /></button>
      <div className="brand">
        <strong>{t.smallTitle}</strong>
        <small>{t.english}</small>
      </div>
      <div className="title-block">
        <div className="eyebrow">{isGrove ? `0${currentArenaIndex + 1} / 05 · ${currentArena.en.toUpperCase()}` : t.strap}</div>
        <h1>{isGrove ? (language === "zh" ? currentArena.cnTitle : currentArena.enTitle) : t.title}</h1>
        <p>{isGrove ? (language === "zh" ? currentArena.enTitle.toUpperCase() : currentArena.cnTitle) : t.subtitle}</p>
      </div>
      <div className="utilities">
        <button className={`sound-toggle ${sound ? "active" : ""}`} onClick={() => setSound((v) => !v)} aria-pressed={sound}>
          <SoundGlyph enabled={sound} /><span>{sound ? t.soundOn : t.soundOff}</span>
        </button>
        <button className="language-toggle" onClick={() => setLanguage((v) => v === "zh" ? "en" : "zh")} aria-label="Switch language">
          <span className={language === "zh" ? "current" : ""}>中</span><b>/</b><span className={language === "en" ? "current" : ""}>EN</span>
        </button>
      </div>
    </header>

    {phase === 'map' && <>
      <section className="map-caption">
        <div className="caption-kicker">{t.mapSub}</div>
        <div className="caption-title">{t.map}</div>
        <p>{t.hint}</p>
      </section>
      <div className="zoom-control" aria-label={language === "zh" ? "地图缩放控制" : "Map zoom controls"}>
        <button onClick={() => zoomMap('zoomIn')} aria-label="Zoom in" disabled={zoom > .999}>+</button>
        <div className="zoom-track"><span style={{ height: `${15 + zoom * 85}%` }} /></div>
        <button onClick={() => zoomMap('zoomOut')} aria-label="Zoom out" disabled={zoom < .001}>−</button>
      </div>
      {selected && <aside className="arena-card" key={selected.id}>
        <div className="card-topline"><span>{t.selected}</span><span>0{arenas.findIndex((a) => a.id === selected.id) + 1} / 05</span></div>
        <h2>{language === "zh" ? selected.cnTitle : selected.enTitle}</h2>
        <div className="arena-en">{language === "zh" ? selected.enTitle : selected.cnTitle}</div>
        <p>{language === "zh" ? selected.cnLine : selected.enLine}</p>
        <div className="card-actions">
          <button className="enter-button" onClick={() => setPhase("transition")}>
            {t.enter}
            <span>↗</span>
          </button>
          <button className="close-card" onClick={returnToMap} aria-label={t.close}>×</button>
        </div>
      </aside>}
    </>}

    {isGrove && <section className="grove-copy">
      <span className="grove-line">{language === "zh" ? "风过竹梢 · 侠影相逢" : "BAMBOO IN THE WIND · TWO WAYS CROSS"}</span>
      <p>{t.placeholder}</p>
      <small>{t.groveSubtitle}</small>
    </section>}

    <footer className="bottom-dock">
      <div className="dock-title"><span>{isGrove ? `0${currentArenaIndex + 1} — ${currentArena.en.toUpperCase()}` : t.route}</span><i /></div>
      <nav className="arena-nav" aria-label="Martial arts arenas">
        {arenas.map((arena, index) => <button key={arena.id} className={selected?.id === arena.id ? "active" : ""} aria-pressed={selected?.id === arena.id} onClick={() => selectArena(arena)}>
          <small>0{index + 1}</small><span>{language === "zh" ? arena.cn : arena.en}<em>{language === 'zh' ? arena.en.toUpperCase() : arena.cn}</em></span><i />
        </button>)}
      </nav>
      <div className="dock-controls">
        {isGrove ? <button className="back-control" onClick={returnToMap}>← {t.back}</button> : <>
          <span className="drag-hint"><b>↔</b> {t.drag}</span>
          <span className="scroll-hint"><b>⌁</b> {t.scroll}</span>
          <button className="reset-control" onClick={returnToMap} title={t.reset} aria-label={t.reset}>⟲</button>
        </>}
      </div>
    </footer>

    {phase === "transition" && <div className="transition-cover" aria-live="polite">
      <div className="transition-particles">{Array.from({ length: 38 }, (_, i) => <i key={i} style={{ '--i': i, '--x': (i * 37) % 100, '--y': (i * 61) % 100, '--size': `${4 + (i % 5) * 2}px` } as CSSProperties} />)}</div>
      <div className="transition-text">{t.transition}<small>ENTERING THE GROVE</small></div>
    </div>}
  </main>;
}
