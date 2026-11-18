import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../src/App';
import { arenas } from '../src/data';

// This suite exercises the actual map DOM and navigation. It does not test WebGL pixels.
vi.mock('../src/World', () => ({ default: () => <div data-testid="grove">Grove renderer boundary</div> }));

beforeEach(() => {
  vi.stubGlobal('innerWidth', 1600);
  vi.stubGlobal('innerHeight', 900);
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: true }) });
  class TestPointerEvent extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId ?? 1; }
  }
  vi.stubGlobal('PointerEvent', TestPointerEvent);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = () => true;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, width: 1600, height: 900, right: 1600, bottom: 900, toJSON() {} });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('illustrated atlas interactions', () => {
  it('renders the art and five accessible entrances without requiring WebGL', () => {
    const { container } = render(<App />);
    expect(container.querySelector('.terrain-illustration')?.getAttribute('src')).toBe('/art/mountain-atlas.png');
    expect(container.querySelectorAll('.map-marker')).toHaveLength(5);
    expect(container.querySelectorAll('.clearing')).toHaveLength(5);
    expect(screen.queryByTestId('grove')).toBeNull();
    expect(container.querySelector('canvas')).toBeNull();
  });
  it('selects and focuses every entrance, including repeated selections', () => {
    const { container } = render(<App />);
    for (const arena of arenas) {
      fireEvent.click(screen.getByRole('button', { name: `${arena.cn} ${arena.en}`, exact: true }));
      expect(screen.getByRole('complementary').textContent).toContain(arena.cnTitle);
      expect(container.querySelector('.map-atlas')?.getAttribute('data-zoom')).toBe('1.550');
      expect(container.querySelectorAll('.clearing.is-selected')).toHaveLength(1);
      expect(container.querySelector('main')?.classList.contains('selection-east')).toBe(arena.mapPoint[0] > .65);
    }
  });
  it('allows free pan after focus, cursor zoom, and a complete reset', () => {
    const { container } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '咏春 Wing Chun' }));
    const map = container.querySelector('.map-atlas')!;
    const originalX = Number(map.getAttribute('data-pan-x'));
    fireEvent.pointerDown(map, { pointerId: 1, button: 0, clientX: 500, clientY: 400 });
    fireEvent.pointerMove(map, { pointerId: 1, buttons: 1, clientX: 620, clientY: 450 });
    fireEvent.pointerUp(map, { pointerId: 1, clientX: 620, clientY: 450 });
    fireEvent.click(map);
    expect(Number(map.getAttribute('data-pan-x'))).toBeCloseTo(originalX + 120, 0);
    fireEvent.wheel(map, { deltaY: -120, clientX: 700, clientY: 400 });
    expect(Number(map.getAttribute('data-zoom'))).toBeGreaterThan(1.55);
    fireEvent.click(within(screen.getByRole('contentinfo')).getByRole('button', { name: '回到山海总图' }));
    expect(map.getAttribute('data-pan-x')).toBe('0.0');
    expect(map.getAttribute('data-pan-y')).toBe('0.0');
    expect(map.getAttribute('data-zoom')).toBe('1.000');
    expect(screen.queryByRole('complementary')).toBeNull();
  });
  it('supports plus/minus, keyboard panning, English and reserved sound state', () => {
    const { container } = render(<App />);
    const map = container.querySelector('.map-atlas')!;
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(map.getAttribute('data-zoom')).toBe('1.200');
    fireEvent.keyDown(map, { key: 'ArrowRight' });
    expect(Number(map.getAttribute('data-pan-x'))).toBe(-70);
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(map.getAttribute('data-zoom')).toBe('1.000');
    fireEvent.keyDown(map, { key: 'Home' });
    expect(map.getAttribute('data-pan-x')).toBe('0.0');
    fireEvent.click(screen.getByRole('button', { name: 'Switch language' }));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Five Paths');
    fireEvent.click(screen.getByRole('button', { name: 'Sound off' }));
    expect(screen.getByRole('button', { name: 'Audio reserved' }).getAttribute('aria-pressed')).toBe('true');
  });
  it('shows an explicit loading error instead of a silent blank map', () => {
    const { container } = render(<App />);
    fireEvent.error(container.querySelector('.terrain-illustration')!);
    expect(screen.getByRole('alert').textContent).toContain('山图加载失败');
    fireEvent.click(screen.getByRole('button', { name: '少林 Shaolin' }));
    expect(screen.getByRole('complementary').textContent).toContain('少林');
  });
  it('cancels camera-like focus animation when the user starts dragging', () => {
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: false }) });
    let now = 0, id = 0;
    const pending = new Map<number, FrameRequestCallback>();
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { pending.set(++id, callback); return id; });
    vi.stubGlobal('cancelAnimationFrame', (key: number) => pending.delete(key));
    const advance = (frames: number) => {
      for (let i = 0; i < frames; i++) act(() => {
        now += 1000 / 60;
        const callbacks = [...pending.values()];
        pending.clear();
        callbacks.forEach((callback) => callback(now));
      });
    };
    const { container } = render(<App />);
    advance(50);
    fireEvent.click(screen.getByRole('button', { name: '咏春 Wing Chun' }));
    advance(15);
    expect(pending.size).toBe(1);
    const map = container.querySelector('.map-atlas')!;
    fireEvent.pointerDown(map, { pointerId: 1, button: 0, clientX: 500, clientY: 400 });
    fireEvent.pointerMove(map, { pointerId: 1, buttons: 1, clientX: 550, clientY: 440 });
    fireEvent.pointerUp(map, { pointerId: 1, clientX: 550, clientY: 440 });
    fireEvent.click(map);
    const stoppedView = [map.getAttribute('data-pan-x'), map.getAttribute('data-pan-y'), map.getAttribute('data-zoom')];
    advance(120);
    expect(pending.size).toBe(0);
    expect([map.getAttribute('data-pan-x'), map.getAttribute('data-pan-y'), map.getAttribute('data-zoom')]).toEqual(stoppedView);
    expect(stoppedView.every((value) => Number.isFinite(Number(value)))).toBe(true);
  });
  it('enters the selected grove and returns to an operable map', async () => {
    vi.useFakeTimers();
    const { container } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '相扑 Sumo' }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /入山 · ENTER/ })); });
    expect(container.querySelector('.transition-cover')).not.toBeNull();
    await act(async () => { vi.advanceTimersByTime(1800); });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('相扑 · 大地席');
    expect(screen.getByTestId('grove')).not.toBeNull();
    expect(container.querySelector('.dock-title')?.textContent).toContain('05 — SUMO');
    fireEvent.click(screen.getByRole('button', { name: /返回地图/ }));
    expect(container.querySelector('.map-atlas')?.getAttribute('data-zoom')).toBe('1.000');
    expect(screen.getByRole('button', { name: '少林 Shaolin' })).not.toBeNull();
  });
});
