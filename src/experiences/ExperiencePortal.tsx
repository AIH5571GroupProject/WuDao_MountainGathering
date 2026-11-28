import { Component, Suspense, lazy, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { experienceUrl, isExperienceMessage } from './bridge';
import type { ArenaExperience, ExperienceContext, ExperienceProps, ExperienceResult } from './types';

class ModuleBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}
export function ExperiencePortal({ definition, context, onClose }: { definition: ArenaExperience; context: ExperienceContext; onClose: () => void }) {
  const [attempt, setAttempt] = useState(0), [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [paused, setPaused] = useState(document.hidden);
  useEffect(() => { const update = () => setPaused(document.hidden); document.addEventListener('visibilitychange', update); return () => document.removeEventListener('visibilitychange', update); }, []);
  const iframe = useRef<HTMLIFrameElement>(null), close = useRef<HTMLButtonElement>(null);
  const tx = (zh: string, en: string) => context.language === 'zh' ? zh : en;
  const { entry } = definition;
  const url = entry?.kind === 'iframe' ? experienceUrl(entry.src, import.meta.env.BASE_URL, location.href) : null;
  const Module = useMemo(() => entry?.kind === 'react' ? lazy(entry.load) : null, [entry, attempt]);
  const complete = useMemo(() => (result: ExperienceResult) => window.dispatchEvent(new CustomEvent('wudao:experience-complete', {
    detail: { arenaId: definition.id, result },
  })), [definition.id]);
  const latest = useRef({ context, onClose, complete }); latest.current = { context, onClose, complete };
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; close.current?.focus(); return () => previous?.focus(); }, []);
  useLayoutEffect(() => {
    if (!url) return;
    setStatus('loading');
    const origin = new URL(url).origin, frameWindow = iframe.current?.contentWindow;
    const post = (type: string, extra = {}) => frameWindow?.postMessage({ type, ...latest.current.context, ...extra }, origin);
    const timer = window.setTimeout(() => setStatus(s => s === 'ready' ? s : 'error'), 20000);
    const message = (event: MessageEvent) => {
      if (!isExperienceMessage(event, frameWindow, origin, definition.id)) return;
      if (event.data.type === 'wudao:ready') { window.clearTimeout(timer); setStatus('ready'); post('wudao:init'); post('wudao:pause', { paused: document.hidden }); }
      if (event.data.type === 'wudao:exit') latest.current.onClose();
      if (event.data.type === 'wudao:complete') latest.current.complete(event.data.result ?? {});
      if (event.data.type === 'wudao:error') { window.clearTimeout(timer); setStatus('error'); }
    };
    const pause = () => post('wudao:pause', { paused: document.hidden });
    window.addEventListener('message', message); document.addEventListener('visibilitychange', pause);
    return () => { post('wudao:dispose'); window.clearTimeout(timer); window.removeEventListener('message', message); document.removeEventListener('visibilitychange', pause); };
  }, [attempt, definition.id, url]);
  useEffect(() => {
    if (url && status === 'ready') iframe.current?.contentWindow?.postMessage({ type: 'wudao:context', ...context }, new URL(url).origin);
  }, [context, status, url]);
  const props: ExperienceProps = { ...context, paused, onExit: onClose, onComplete: complete };
  const isSumo = definition.id === 'sumo';
  const isBoxing = definition.id === 'boxing';
  const isTraining = isSumo || isBoxing;
  const exitLabel = isSumo ? tx('退出相扑', 'Exit Sumo') : isBoxing ? tx('退出拳击', 'Exit Boxing') : tx('退出体验 · 返回篇章', 'Leave experience · Back to chapter');
  return <section className={isTraining ? 'game-portal training-game-portal' : 'game-portal'} role="dialog" aria-modal="true" aria-label={definition.title[context.language]}>
    <div className="game-toolbar"><button className={isTraining ? 'journey-button' : undefined} ref={close} onClick={onClose}><span className="game-back-arrow" aria-hidden="true">←</span> {exitLabel}</button>
      <span className="game-toolbar-title">{definition.number} / {definition.title[context.language]}</span>
      {url && <a href={url} target="_blank" rel="noopener noreferrer">{tx('独立窗口', 'Open separately')} ↗</a>}
    </div>
    {isBoxing && !entry && <div className="boxing-reserved">
      <div className="boxing-reserved-card">
        <p className="overline">{tx('拳击 · 回声谷', 'BOXING · ECHO VALLEY')}</p>
        <h2>{tx('拳击体验筹备中', 'Boxing experience in development')}</h2>
        <p>{tx('游戏上线后，将从这里进入。', 'The game will open here when it is available.')}</p>
        <button className="journey-button" type="button" onClick={onClose}><span aria-hidden="true">←</span>{tx('返回蓄势镜头', 'Back to strength')}</button>
      </div>
    </div>}
    {url && <iframe key={attempt} ref={iframe} src={url} title={definition.title[context.language] + ' experience'}
      allow={entry?.kind === 'iframe' && entry.camera ? 'camera; fullscreen' : 'fullscreen'} referrerPolicy="strict-origin-when-cross-origin" onError={() => setStatus('error')} />}
    {Module && <div className="experience-module"><ModuleBoundary key={attempt} onError={() => setStatus('error')}><Suspense fallback={<p role="status">{tx('新境正在聚拢…', 'The scene is gathering…')}</p>}><Module {...props} /></Suspense></ModuleBoundary></div>}
    {((url && status !== 'ready') || status === 'error') && <div className="game-loading" role="status"><p>{status === 'error' ? tx('体验暂未就绪，可以重试或返回篇章。', 'The experience is not ready. Retry or return to the chapter.') : tx('新境正在聚拢…', 'The scene is gathering…')}</p>
      {status === 'error' && <button onClick={() => { setStatus('loading'); setAttempt(a => a + 1); }}>{tx('重新载入', 'Try again')}</button>}
    </div>}
    <div className="game-footnote">{isSumo ? tx('退出将返回仕切镜头', 'Exiting returns to the ready position') : isBoxing ? tx('按 Esc 或点击退出，返回拳击准备页', 'Press Esc or use Exit to return to boxing') : tx('左上角退出并返回 · 离开时结束当前体验', 'Use the top-left button to return · Leaving ends the current experience')}</div>
  </section>;
}
