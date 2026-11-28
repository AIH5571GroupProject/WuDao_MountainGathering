import { arenaExperiences } from './experiences/registry';
import { ExperiencePortal } from './experiences/ExperiencePortal';
import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { MountainArenaId as ArenaId } from './mountain/model';
import { dispatchAudioIntent, mountainArenas, type CameraCommand, type Phase, type Quality } from './mountain/model';

import { KendoPreparation } from './mountain/KendoPreparation';
import { kendoShots } from './mountain/kendoShots';
import { TrainingPreparation } from './mountain/TrainingPreparation';
import { isTrainingFilm, trainingFilms } from './mountain/trainingFilm';
import { WingbronePortal } from './mountain/WingbronePortal';

const MountainWorld = lazy(() => import('./mountain/MountainWorld'));
class SceneBoundary extends Component<{ children: ReactNode; onError: (message: string) => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { this.props.onError(error.message); }
  render() { return this.state.failed ? null : this.props.children; }
}
function readVisits(): ArenaId[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem('wudao:mountain-visits:v1') ?? '[]');
    return Array.isArray(value) ? [...new Set(value.filter((id): id is ArenaId => mountainArenas.some((a) => a.id === id)))] : [];
  } catch { return []; }
}

export default function MountainApp() {
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');
  const tx = (zh: string, en: string) => language === 'zh' ? zh : en;
  const [phase, setPhase] = useState<Phase>('welcome');
  const [activeId, setActiveId] = useState<ArenaId | null>(null), [hovered, setHovered] = useState<ArenaId | null>(null);
  const [visits, setVisits] = useState<ArenaId[]>(readVisits), [quality, setQuality] = useState<Quality>('balanced');
  const [calm, setCalm] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  const [kendoShot, setKendoShot] = useState(0), [kendoPaused, setKendoPaused] = useState(calm);
  const [filmShot, setFilmShot] = useState(0), [filmReadyShot, setFilmReadyShot] = useState(0), [filmPaused, setFilmPaused] = useState(calm);
  const restoreFilmFocus = useRef(false);
  const [sparring, setSparring] = useState(true), [sound, setSound] = useState(false), [help, setHelp] = useState(false);
  const [ready, setReady] = useState(false), [error, setError] = useState(''), [progress, setProgress] = useState(0);
  const [command, setCommand] = useState<CameraCommand>({ kind: 'reset', sequence: 0 });
  const hoverRef = useRef<ArenaId | null>(null), intentRef = useRef<ArenaId | null>(null);
  const arena = mountainArenas.find((a) => a.id === activeId) ?? null;
  const experience = activeId && activeId !== 'kendo' ? arenaExperiences[activeId] : null;
  const pageIntent = useRef<'details' | 'game'>('details');
  const kendoPreparation = phase === 'details' && activeId === 'kendo';
  const filmId = isTrainingFilm(activeId) ? activeId : null;
  const filmPreparation = phase === 'details' && filmId !== null;
  const filmTransition = filmId !== null && phase === 'opening';
  const filmSettled = filmReadyShot === filmShot || Boolean(error);
  const atEntrance = phase === 'welcome' || phase === 'arrival';
  const begin = () => { if (!ready || phase !== 'welcome') return; setPhase('arrival'); setProgress(0); setCommand(v => ({ kind: 'begin', sequence: v.sequence + 1 })); };
  const atStage = phase === 'arena' || phase === 'details', travelling = ['approach', 'returning', 'opening', 'closing'].includes(phase), hasError = Boolean(error);
  const onReady = useCallback(() => { setReady(true); setError(''); }, []);
  const onError = useCallback((message: string) => { setError(message); setReady(false); }, []);
  const onHover = useCallback((id: ArenaId | null) => {
    if (hoverRef.current === id) return;
    hoverRef.current = id; setHovered(id);
    if (id) dispatchAudioIntent({ kind: 'near', arenaId: id, enabled: sound });
  }, [sound]);
  const enter = useCallback((id: ArenaId) => {
    if (!mountainArenas.some((a) => a.id === id)) return;
    if (id === 'kendo' && intentRef.current !== 'kendo') { setKendoShot(0); setKendoPaused(calm); }
    if (isTrainingFilm(id)) { setFilmShot(0); setFilmReadyShot(0); setFilmPaused(calm); restoreFilmFocus.current = false; }
    intentRef.current = id; setActiveId(id); setHovered(null); setHelp(false); setProgress(0); setSparring(true);
    if (hasError) { setPhase('details'); return; }
    setPhase('approach'); setCommand((v) => ({ kind: 'enter', id, sequence: v.sequence + 1 }));
  }, [hasError, calm]);
  const arrive = useCallback((id: ArenaId) => {
    if (intentRef.current !== id) return;
    setPhase(id === 'kendo' || isTrainingFilm(id) ? 'details' : 'arena'); setProgress(1);
    setVisits((value) => {
      const next = value.includes(id) ? value : [...value, id];
      try { localStorage.setItem('wudao:mountain-visits:v1', JSON.stringify(next)); } catch { /* Storage is optional. */ }
      return next;
    });
    dispatchAudioIntent({ kind: 'enter', arenaId: id, enabled: sound });
  }, [sound]);
  const returnToMountain = useCallback((reset = false) => {
    dispatchAudioIntent({ kind: 'leave', arenaId: intentRef.current ?? undefined, enabled: sound });
    intentRef.current = null; setHelp(false); setProgress(0); setHovered(null);
    if (hasError) { setPhase('overview'); setActiveId(null); return; }
    setPhase('returning'); setCommand((v) => ({ kind: reset ? 'reset' : 'return', sequence: v.sequence + 1 }));
  }, [hasError, sound]);
  const openChapter = useCallback((destination: 'details' | 'game' = 'details') => {
    pageIntent.current = destination; setHelp(false); setProgress(0);
    if (hasError) { setPhase(destination); return; }
    setPhase('opening'); setCommand(v => ({ kind: 'chapter', sequence: v.sequence + 1 }));
  }, [hasError]);
  const chapterReady = useCallback(() => { setPhase(pageIntent.current); setProgress(1); }, []);
  const encounterReady = useCallback(() => setPhase('arena'), []);
  const closeChapter = useCallback(() => {
    if (hasError) { setPhase('overview'); setActiveId(null); return; }
    setPhase('closing'); setProgress(0); setCommand(v => ({ kind: 'encounter', sequence: v.sequence + 1 }));
  }, [hasError]);
  const closeGame = useCallback(() => {
    if (isTrainingFilm(intentRef.current)) restoreFilmFocus.current = true;
    openChapter('details');
  }, [openChapter]);
  const overview = useCallback(() => { setPhase('overview'); setActiveId(null); setProgress(0); }, []);
  const pullBack = useCallback(() => returnToMountain(), [returnToMountain]);
  const toggleSparring = useCallback(() => setSparring((value) => !value), []);
  const zoom = (direction: number) => setCommand((v) => ({ kind: 'zoom', direction, sequence: v.sequence + 1 }));

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (phase === 'welcome' || phase === 'arrival') return;
      if ((event.target as HTMLElement)?.matches?.('input, textarea, select')) return;
      if (event.key === 'Escape') {
        if (help) setHelp(false);
        else if (phase === 'game') closeGame();
        else if (kendoPreparation || filmPreparation) returnToMountain();
        else if (phase === 'details') closeChapter();
        else if (ready) returnToMountain();
      }
      if (!event.altKey && !event.ctrlKey && !event.metaKey && phase !== 'game' && /^[1-6]$/.test(event.key) && (ready || hasError)) enter(mountainArenas[Number(event.key) - 1].id);
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [ready, hasError, help, phase, kendoPreparation, filmPreparation, enter, returnToMountain, closeChapter, closeGame]);

  useEffect(() => {
    const duration = kendoShots[kendoShot].duration;
    if (!kendoPreparation || kendoPaused || !duration) return;
    const timer = window.setTimeout(() => setKendoShot(shot => shot + 1), duration);
    return () => window.clearTimeout(timer);
  }, [kendoPreparation, kendoPaused, kendoShot]);

  const endFilmShot = useCallback((shot: number) => {
    setFilmShot(current => current === shot && current < 2 ? current + 1 : current);
  }, []);

  useEffect(() => {
    const duration = filmId ? trainingFilms[filmId].shots[filmShot].duration : 0;
    if (!filmPreparation || !hasError || filmPaused || !duration) return;
    const timer = window.setTimeout(() => endFilmShot(filmShot), duration);
    return () => window.clearTimeout(timer);
  }, [endFilmShot, hasError, filmId, filmPreparation, filmPaused, filmShot]);

  useEffect(() => {
    if (filmPreparation && filmSettled && restoreFilmFocus.current) {
      document.getElementById(`${filmId}-enter`)?.focus();
      restoreFilmFocus.current = false;
    }
  }, [filmId, filmPreparation, filmSettled]);

  const helpRows = [
    tx('拖动：山外环看；场内小幅换角度。', 'Drag to orbit the mountain, or gently change your angle inside a clearing.'),
    tx('点击空地，或将指针停在入口上向前滚动，即可入山。', 'Click an entrance, or hover over it and scroll forward to enter.'),
    tx('移动指针轻推粒子，点击地面泛起涟漪。', 'Move your pointer to stir particles. Click the ground for a ripple.'),
    tx('点击人物或下方按钮，暂停 / 继续切磋。', 'Click a figure or the control below to pause or resume sparring.'),
    tx('向后拉远或按 Esc 返回；数字 1–6 可直达场地。', 'Pull back or press Esc to return. Keys 1–6 select a clearing.'),
  ];


  return <main className={`mountain-experience phase-${phase} ${atStage ? 'is-close' : ''} ${kendoPreparation ? 'is-kendo-film' : ''} ${filmPreparation || filmTransition ? `is-${filmId}-film` : ''}`} data-phase={phase}>
    <SceneBoundary onError={onError}><Suspense fallback={null}>
      <MountainWorld command={command} phase={phase} arena={arena} language={language} quality={quality} calm={calm} sparring={sparring} kendoShot={kendoShot} kendoPaused={kendoPaused}
        filmShot={filmShot} filmPaused={filmPaused} onFilmShotReady={setFilmReadyShot} onFilmShotEnd={endFilmShot}
        onEnter={enter} onHover={onHover} onArrive={arrive} onOverview={overview} onProgress={setProgress} onPullBack={pullBack}
        onChapter={chapterReady} onEncounter={encounterReady} onReady={onReady} onError={onError} onToggleSparring={toggleSparring} />
    </Suspense></SceneBoundary>
    <div className="paper-edges" />
    <div className="crt-glass" aria-hidden="true" />
    {atEntrance && <section className={`mountain-welcome ${phase === 'arrival' ? 'departing' : ''}`} aria-labelledby="welcome-title" aria-hidden={phase === 'arrival'}>
      <p className="overline">WUDAO · A JOURNEY ABOVE THE CLOUDS</p>
      <h1 id="welcome-title">{tx('山外有山', 'Beyond the clouds')}</h1>
      <p className="welcome-subtitle">{tx('云开处，见天地。', 'Let the clouds part. Find your own way.')}</p>
      <span className="welcome-rule" aria-hidden="true" />
      <p className="welcome-invitation">{tx('一座山，六场相逢。', 'One mountain. Six encounters.')}<br />{tx('循着风，去往竹影深处。', 'Follow the wind into the bamboo.')}</p>
      <button className="mountain-enter" onClick={begin} disabled={!ready || phase !== 'welcome'}><span>{ready ? tx('拨云入山', 'Enter the mountain') : tx('山境准备中', 'Preparing the mountain')}</span><b aria-hidden="true">↗</b></button>
      <small className="welcome-note">{tx('拖动探索 · 滚轮靠近 · 选一处空地相逢', 'Drag to explore · Scroll to approach · Discover a clearing')}</small>
    </section>}
    {phase === 'arrival' && <div className="arrival-caption" role="status"><span>{tx('云开，入山。', 'Through the clouds.')}</span><i><b style={{ width: `${progress * 100}%` }} /></i></div>}
    <header className="mountain-header">
      <button className="brand-button" onClick={() => { if (!atEntrance) returnToMountain(true); }} aria-label={tx('回到全景', 'Reset overview')}>
        <span className="seal-mark">山</span><span><strong>{tx('武道山集', 'WuDao Mountain Gathering')}</strong><small>WUDAO / MOUNTAIN GATHERING</small></span>
      </button>
      <span className="header-mantra">SIX ENCOUNTERS · ONE MOUNTAIN</span>
      <div className="header-actions">
        <span className="visit-counter" aria-label={`${tx('已寻访', 'Discovered')} ${visits.length}/6`}><i />{String(visits.length).padStart(2, '0')} / 06</span>
        <button className={`audio-button ${sound ? 'enabled' : ''}`} aria-pressed={sound} title={tx('此版只预留音轨，不播放声音', 'Audio is reserved; no audio plays in this version')} onClick={() => {
          setSound(!sound); dispatchAudioIntent({ kind: 'enabled', enabled: !sound, arenaId: activeId ?? undefined });
        }}><span className="sound-bars" aria-hidden="true"><i /><i /><i /></span><span>{sound ? tx('音轨预留', 'Audio reserved') : tx('声音关闭', 'Sound off')}</span></button>
        <button className="language-button" aria-label="Switch language" onClick={() => setLanguage((v) => v === 'zh' ? 'en' : 'zh')}><b className={language === 'zh' ? 'active' : ''}>中</b><em>/</em><b className={language === 'en' ? 'active' : ''}>EN</b></button>
      </div>
    </header>

    {!atEntrance && !filmTransition && !['details', 'game'].includes(phase) && <section className={`scene-intro ${travelling ? 'travelling' : ''}`} aria-live="polite" lang={language === 'zh' ? 'zh-CN' : 'en'}>
      <p className="overline">{arena ? `0${mountainArenas.indexOf(arena) + 1} / 06 · ${arena.en.toUpperCase()}` : 'THE MOUNTAIN / 山海总图'}</p>
      <h1>{arena ? tx(arena.place, arena.placeEn) : tx('一山，六境。', 'One mountain.\nSix encounters.')}</h1>
      <p className="intro-secondary">{arena ? tx(arena.placeEn.toUpperCase(), arena.place) : tx('循着竹影，寻一场切磋。', 'Follow the bamboo. Find an encounter.')}</p>
      <p className="intro-copy">{arena ? tx(arena.invitation, arena.lineEn) : tx('在云与竹之间，自由入山。', 'Wander between the clouds and the grove.')}</p>
      {phase === 'arena' && <button className="text-link" onClick={() => openChapter()}>{tx(arena?.id === 'kendo' ? '进入剑道 · 御风' : '进入篇章', arena?.id === 'kendo' ? 'Enter Kendo · Windborne' : 'Enter this chapter')}<span>↗</span></button>}
    </section>}

    {!atEntrance && !ready && !hasError && <div className="scene-loading" role="status"><span className="loading-mountain">∧</span><p>{tx('山形渐显…', 'The mountain is gathering…')}</p></div>}
    {hasError && !['details', 'game'].includes(phase) && <div className="scene-error" role="alert"><h2>{tx('三维场景暂时无法显示', 'The 3D scene is unavailable')}</h2>
      <p>{tx('场景未能加载。请重新载入页面，或双击项目中的 start-preview.cmd 启动本地预览。', 'The scene could not load. Reload the page, or start the local preview using start-preview.cmd.')}</p><pre tabIndex={0} aria-label={tx('错误详细信息', 'Error details')}>{error}</pre><button className="chapter-enter" onClick={() => window.location.reload()}>{tx('重新载入场景', 'Reload the scene')}</button></div>}

    {!atEntrance && !['details', 'game'].includes(phase) && <>
      {!filmTransition && <><div className="camera-tools" aria-label={tx('视角控制', 'Camera controls')}>
        <button aria-label={tx('靠近', 'Move closer')} title={tx('靠近', 'Move closer')} onClick={() => zoom(1)} disabled={!ready || travelling}>+</button><i />
        <button aria-label={tx('拉远', 'Pull back')} title={tx('拉远', 'Pull back')} onClick={() => zoom(-1)} disabled={!ready || travelling}>−</button>
        <button className="home-tool" aria-label={tx('回到全景', 'Reset overview')} title={tx('回到全景', 'Reset overview')} onClick={() => returnToMountain(true)} disabled={!ready || travelling}>⌂</button>
      </div>
      <div className="view-settings"><fieldset><legend>{tx('粒子疏密', 'Particle density')}</legend>
        {(['airy', 'balanced', 'full'] as Quality[]).map((value, index) => <button key={value} aria-pressed={quality === value} className={quality === value ? 'chosen' : ''} onClick={() => setQuality(value)}>{tx(['疏', '适中', '密'][index], ['Airy', 'Balanced', 'Full'][index])}</button>)}
      </fieldset><button className={`calm-button ${calm ? 'chosen' : ''}`} aria-pressed={calm} onClick={() => setCalm((v) => !v)}><i />{tx('静息模式', 'Stillness')}</button></div></>}
      {travelling && <div className="journey-status" role="status"><span>{phase === 'returning' ? tx('山海重现', 'BACK TO THE MOUNTAIN') : phase === 'opening' ? tx('散作风 · 聚成境', 'SCATTER · GATHER') : phase === 'closing' ? tx('竹影重聚', 'THE GROVE RETURNS') : (progress < .4 ? tx('风起 · 散出', 'SCATTER') : progress < .53 ? tx('换幕', 'CUT') : tx('聚成新境', 'GATHER'))}</span><i><b style={{ width: `${progress * 100}%` }} /></i></div>}
      {phase === 'arena' && <div className="encounter-controls"><p>{tx('两人，先过两招。', 'Two figures. One encounter.')}</p><small>{tx('人物与动作示意 · 电影片段将在此呈现', 'Figures and motion study · a film scene will follow')}</small>
        <button onClick={toggleSparring} aria-pressed={!sparring}><span>{sparring ? 'Ⅱ' : '▷'}</span>{sparring ? tx('暂停切磋', 'Pause sparring') : tx('继续切磋', 'Resume sparring')}</button></div>}
      {phase === 'overview' && <div className="explore-cue"><span className="cue-orbit">↔</span><p>{hovered ? tx(`已寻到${mountainArenas.find((a) => a.id === hovered)?.cn} · 点击或滚轮靠近`, 'Scroll closer, or click to enter') : tx('点击空地入山', 'Choose a clearing')}</p></div>}
    </>}

    {kendoPreparation && <KendoPreparation language={language} shot={kendoShot} paused={kendoPaused} fallback={hasError}
      onShot={setKendoShot} onPause={() => setKendoPaused(v => !v)} onPlay={() => openChapter('game')} onBack={() => returnToMountain()} />}
    {filmId && filmPreparation && <TrainingPreparation arenaId={filmId} gameAvailable={Boolean(experience?.entry)} language={language} shot={filmShot}
      settled={filmSettled} paused={filmPaused} fallback={hasError} onShot={setFilmShot} onPause={() => setFilmPaused(v => !v)}
      onPlay={() => openChapter('game')} onBack={() => returnToMountain()} />}
    {phase === 'details' && arena && !kendoPreparation && !filmPreparation && <section className="full-story" aria-labelledby="story-title">
      <button className="story-close" aria-label={tx('返回切磋', 'Back to the encounter')} onClick={closeChapter}>← <span>{tx('返回切磋', 'Back to the encounter')}</span></button>
      <div className="story-heading"><p className="overline">0{mountainArenas.indexOf(arena) + 1} / 06 · {tx('一处空地，一段相逢', 'A CLEARING, AN ENCOUNTER')}</p><h1 id="story-title">{tx(arena.cn, arena.en)}</h1>
        <span>{tx(arena.en.toUpperCase(), arena.cn)}</span><h2>{tx(arena.line, arena.lineEn)}</h2></div>
      <div className="chapter-reserved">
        <span className="chapter-glyph" aria-hidden="true">境</span>
        <p className="overline">A STORY YET TO UNFOLD</p>
        <h3>{tx('下一幕，留待相逢。', 'The next scene awaits.')}</h3>
        <p>{tx('这里预留武道故事、人物与电影场景。', 'A place reserved for stories, characters and film-inspired encounters.')}</p>
        {experience?.entry && <button className="chapter-enter" onClick={() => openChapter('game')}>{tx('进入体验', 'Enter experience')} ↗</button>}
        <span className="reserved-note">{tx('内容筹备中 · 可返回继续探索', 'IN PREPARATION · KEEP EXPLORING')}</span>
      </div>
      <button className="story-return" onClick={() => returnToMountain()}>{tx('返回山图', 'Back to mountain')}<span>↗</span></button>
    </section>}

    {phase === 'game' && activeId === 'kendo' && <WingbronePortal language={language} onClose={closeGame} />}
    {phase === 'game' && experience && (experience.entry || experience.id === 'boxing') && <ExperiencePortal key={experience.id} definition={experience}
      context={{ version: 1, arenaId: experience.id, language, soundEnabled: sound, reducedMotion: calm, quality, assets: experience.assets }} onClose={closeGame} />}
    {help && <aside className="exploration-help" aria-label={tx('操作说明', 'How to explore')}><div><strong>{tx('操作说明', 'How to explore')}</strong><button onClick={() => setHelp(false)} aria-label="Close help">×</button></div><ol>{helpRows.map((row) => <li key={row}>{row}</li>)}</ol></aside>}
    {!atEntrance && <footer className={`mountain-footer ${phase === 'details' ? 'in-story' : ''}`}>
      <div className="footer-top"><span>{atStage ? `${arena?.cn} / ${arena?.en}` : tx('选择一处空地，进入山中。', 'Choose a clearing to begin.')}</span><div><span className="input-hints">{tx('拖动环看', 'Drag to look around')}<i />{tx('滚轮拉近 / 拉远', 'Scroll to approach / retreat')}</span><button onClick={() => setHelp((v) => !v)} aria-expanded={help}>{tx('操作说明', 'How to explore')} <b>?</b></button></div></div>
      <nav aria-label="Martial arts clearings">{mountainArenas.map((a, i) => <button key={a.id} className={activeId === a.id ? 'active' : ''} aria-current={activeId === a.id ? 'location' : undefined}
        onPointerEnter={() => phase === 'overview' && onHover(a.id)} onPointerLeave={() => onHover(null)} onClick={() => enter(a.id)} disabled={phase === 'game' || (!ready && !hasError)}>
        <small>0{i + 1}</small><span>{tx(a.cn, a.en)}<em>{tx(a.place, a.placeEn)}</em></span><i className={visits.includes(a.id) ? 'visited' : ''} title={visits.includes(a.id) ? tx('已寻访', 'Discovered') : ''} />
      </button>)}</nav>
    </footer>}
  </main>;
}
