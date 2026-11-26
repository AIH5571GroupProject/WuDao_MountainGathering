import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { Arena, ArenaId } from './data';
import { atlasSize, boundView, easeOut, focusView, HOME_VIEW, MAX_ZOOM, zoomAt, type MapSize, type MapView } from './mapMath';

export type MapCommand = { action: 'reset' | 'zoomIn' | 'zoomOut' | 'focus'; sequence: number; id?: ArenaId };
type Props = { arenas: Arena[]; selected: Arena | null; language: 'zh' | 'en'; command: MapCommand; active: boolean;
  onSelect: (arena: Arena) => void; onZoom: (value: number) => void };

export default function MapAtlas({ arenas, selected, language, command, active, onSelect, onZoom }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<MapSize>({ width: window.innerWidth, height: window.innerHeight });
  const sizeRef = useRef(size);
  const [view, setView] = useState<MapView>(HOME_VIEW);
  const viewRef = useRef(view);
  const frame = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [imageError, setImageError] = useState(false);
  const drag = useRef<{ id: number; x: number; y: number; view: MapView; moved: boolean } | null>(null);
  const onZoomRef = useRef(onZoom);
  onZoomRef.current = onZoom;
  const apply = useCallback((next: MapView) => {
    const bounded = boundView(next, sizeRef.current);
    viewRef.current = bounded;
    setView(bounded);
    onZoomRef.current((bounded.zoom - 1) / (MAX_ZOOM - 1));
  }, []);
  const cancel = useCallback(() => cancelAnimationFrame(frame.current), []);
  const animate = useCallback((next: MapView) => {
    cancel();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { apply(next); return; }
    const start = { ...viewRef.current };
    const time = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - time) / 780);
      const t = easeOut(progress);
      apply({ x: start.x + (next.x - start.x) * t, y: start.y + (next.y - start.y) * t, zoom: start.zoom + (next.zoom - start.zoom) * t });
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [apply, cancel]);

  useEffect(() => {
    if (!host.current) return;
    const observer = new ResizeObserver(([entry]) => {
      cancel();
      const next = { width: entry.contentRect.width, height: entry.contentRect.height };
      sizeRef.current = next;
      setSize(next);
      apply(viewRef.current);
    });
    observer.observe(host.current);
    return () => { observer.disconnect(); cancel(); };
  }, [apply, cancel]);

  useEffect(() => {
    if (command.action === 'focus') {
      const arena = arenas.find((a) => a.id === command.id);
      if (arena) animate(focusView(arena.mapPoint, sizeRef.current));
    } else if (command.action === 'reset') animate(HOME_VIEW);
    else animate(zoomAt(viewRef.current, viewRef.current.zoom * (command.action === 'zoomIn' ? 1.2 : 1 / 1.2), { x: 0, y: 0 }, sizeRef.current));
  }, [command, arenas, animate]);

  useEffect(() => {
    const el = host.current;
    if (!el || !active) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      cancel();
      const bounds = el.getBoundingClientRect();
      const pixels = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * sizeRef.current.height : e.deltaY;
      const factor = Math.exp(-Math.max(-160, Math.min(160, pixels)) * .0018);
      apply(zoomAt(viewRef.current, viewRef.current.zoom * factor, { x: e.clientX - bounds.left - bounds.width / 2, y: e.clientY - bounds.top - bounds.height / 2 }, sizeRef.current));
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, [active, apply, cancel]);

  const pointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if ((e.target as Element).closest('button')) { drag.current = null; return; }
    cancel();
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, view: viewRef.current, moved: false };
  };
  const pointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    if (Math.hypot(dx, dy) > 5) {
      start.moved = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
    }
    if (start.moved) apply({ ...start.view, x: start.view.x + dx, y: start.view.y + dy });
  };
  const pointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
    // Keep the moved bit until the click event has been suppressed.
    if (drag.current) drag.current.id = -1;
  };
  const art = atlasSize(size);
  return <div ref={host} className={`map-atlas ${dragging ? 'is-dragging' : ''} ${active ? '' : 'atlas-hidden'}`}
    role="region" aria-label={language === 'zh' ? '山林地图，可拖动，滚轮缩放；方向键平移，Home 复位' : 'Mountain map. Drag or use arrow keys to pan, scroll to zoom, Home to reset'}
    tabIndex={active ? 0 : -1} aria-hidden={!active} inert={!active}
    data-zoom={view.zoom.toFixed(3)} data-pan-x={view.x.toFixed(1)} data-pan-y={view.y.toFixed(1)}
    onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={() => { drag.current = null; setDragging(false); }}
    onClickCapture={(e) => { if (drag.current?.moved) { e.preventDefault(); e.stopPropagation(); drag.current = null; } }}
    onKeyDown={(e) => {
      if (e.target !== e.currentTarget) return;
      const arrows: Record<string, [number, number]> = { ArrowLeft: [70, 0], ArrowRight: [-70, 0], ArrowUp: [0, 70], ArrowDown: [0, -70] };
      if (arrows[e.key]) { e.preventDefault(); cancel(); apply({ ...viewRef.current, x: viewRef.current.x + arrows[e.key][0], y: viewRef.current.y + arrows[e.key][1] }); }
      if (e.key === 'Home') { e.preventDefault(); animate(HOME_VIEW); }
      if (['+', '=', '-'].includes(e.key)) { e.preventDefault(); animate(zoomAt(viewRef.current, viewRef.current.zoom * (e.key === '-' ? 1 / 1.2 : 1.2), { x: 0, y: 0 }, sizeRef.current)); }
    }}>
    <div className="atlas-art" style={{ width: art.width, height: art.height, marginLeft: -art.width / 2, marginTop: -art.height / 2,
      transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.zoom})`, '--inverse-zoom': 1 / view.zoom } as CSSProperties}>
      <img src="/art/mountain-atlas.png" alt="" className="terrain-illustration" draggable={false} fetchPriority="high" onError={() => setImageError(true)} />
      <svg className="clearing-outlines" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
        <defs><pattern id="clearing-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(28)"><line x1="0" y1="0" x2="0" y2="7" stroke="currentColor" strokeWidth="1" /></pattern></defs>
        {arenas.map((arena) => <g key={arena.id} className={`clearing ${selected?.id === arena.id ? 'is-selected' : ''}`} onClick={() => onSelect(arena)}>
          <path className="clearing-hit" d={arena.mapOutline} />
          <path className="clearing-etch" d={arena.mapOutline} />
        </g>)}
      </svg>
      {arenas.map((arena, i) => <div className={`map-marker-anchor ${arena.id === 'taekwondo' ? 'label-below' : ''}`} key={arena.id} style={{ left: `${arena.mapPoint[0] * 100}%`, top: `${arena.mapPoint[1] * 100}%` }}>
        <button className={`map-marker ${selected?.id === arena.id ? 'selected' : ''}`} onClick={() => onSelect(arena)} aria-label={`${arena.cn} ${arena.en}`} aria-pressed={selected?.id === arena.id}>
          <span className="marker-number">0{i + 1}</span>
          <span className="marker-name">{language === 'zh' ? arena.cn : arena.en}<small>{language === 'zh' ? arena.en.toUpperCase() : arena.cn}</small></span>
          <span className="marker-arrow" aria-hidden="true">↗</span>
        </button><span className="marker-stem" /><span className="marker-dot" />
      </div>)}
    </div>
    {imageError && <p className="map-error" role="alert">{language === 'zh' ? '山图加载失败，请刷新页面。你仍可从下方选择场地。' : 'The map could not load. Refresh, or choose an arena below.'}</p>}
  </div>;
}
