import { arenaExperiences } from '../src/experiences/registry';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import App from '../src/MountainApp';
import type MountainWorld from '../src/mountain/MountainWorld';
import { mountainArenas } from '../src/mountain/model';

const renderer = vi.hoisted(() => ({ props: null as ComponentProps<typeof MountainWorld> | null }));
vi.mock('../src/mountain/MountainWorld', () => ({ default: (props: ComponentProps<typeof MountainWorld>) => {
  renderer.props = props;
  return <div data-testid="world" />;
} }));
beforeEach(() => { localStorage.clear(); Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: false }) }); renderer.props = null; });
const originalEntries = Object.values(arenaExperiences).map(definition => definition.entry);
afterEach(() => { Object.values(arenaExperiences).forEach((definition, i) => { definition.entry = originalEntries[i]; }); cleanup(); vi.restoreAllMocks(); });
async function open() {
  const result = render(<App />);
  await waitFor(() => expect(screen.getByTestId('world')).toBeTruthy());
  act(() => renderer.props!.onReady());
  fireEvent.click(screen.getByRole('button', { name: '拨云入山' }));
  act(() => renderer.props!.onOverview());
  return result;
}
const nav = () => within(screen.getByRole('navigation', { name: 'Martial arts clearings' }));

describe('mountain journey UI (renderer boundary mocked)', () => {
  it('starts behind the entrance and waits for the cloud flight before showing exploration', async () => {
    const { container } = render(<App />);
    await waitFor(() => expect(screen.getByTestId('world')).toBeTruthy());
    expect(container.querySelector('main')?.getAttribute('data-phase')).toBe('welcome');
    expect(screen.queryByRole('navigation')).toBeNull();
    act(() => renderer.props!.onReady());
    fireEvent.keyDown(window, { key: '6' });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(renderer.props!.command.sequence).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: '拨云入山' }));
    expect(renderer.props!.command.kind).toBe('begin');
    expect(container.querySelector('main')?.getAttribute('data-phase')).toBe('arrival');
    expect(screen.queryByRole('navigation')).toBeNull();
    fireEvent.keyDown(window, { key: '1' });
    expect(renderer.props!.command.kind).toBe('begin');
    act(() => renderer.props!.onOverview());
    expect(screen.getByRole('navigation', { name: 'Martial arts clearings' })).toBeTruthy();
    expect(container.querySelector('main')?.getAttribute('data-phase')).toBe('overview');
  });
  it('selects all six clearings, waits for arrival and remembers visits', async () => {
    const { container } = await open();
    for (const a of mountainArenas) {
      fireEvent.click(nav().getByRole('button', { name: new RegExp(a.cn) }));
      expect(container.querySelector('main')?.getAttribute('data-phase')).toBe('approach');
      expect(renderer.props!.command.id).toBe(a.id);
      expect(renderer.props!.arena?.id).toBe(a.id);
      act(() => renderer.props!.onArrive(a.id));
      const hasFilm = a.id === 'kendo' || a.id === 'sumo';
      expect(container.querySelector('main')?.getAttribute('data-phase')).toBe(hasFilm ? 'details' : 'arena');
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(hasFilm ? a.cn : a.place);
    }
    expect(screen.getByLabelText('已寻访 6/6')).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('wudao:mountain-visits:v1')!)).toHaveLength(6);
  });
  it('gates the sumo game on the settled ready shot and returns to it on exit', async () => {
    arenaExperiences.sumo.entry = { kind: 'react', load: async () => ({ default: ({ onExit }) => <button onClick={onExit}>Exit sumo project</button> }) };
    await open();
    fireEvent.keyDown(window, { key: '5' });
    act(() => renderer.props!.onArrive('sumo'));
    expect(screen.getByRole('heading', { name: '土俵' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '进入相扑' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '撒盐' }));
    act(() => renderer.props!.onSumoShotReady(1));
    fireEvent.click(screen.getByRole('button', { name: '仕切' }));
    expect((screen.getByRole('button', { name: '进入相扑' }) as HTMLButtonElement).disabled).toBe(true);
    act(() => renderer.props!.onSumoShotReady(2));
    fireEvent.click(screen.getByRole('button', { name: '进入相扑' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => renderer.props!.onChapter());
    fireEvent.click(await screen.findByRole('button', { name: 'Exit sumo project' }));
    act(() => renderer.props!.onChapter());
    expect(screen.getByRole('heading', { name: '仕切' })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '进入相扑' }));
  });
  it('opens the separate Kendo game only after the particle transition and removes it on exit', async () => {
    const { container } = await open();
    fireEvent.keyDown(window, { key: '6' });
    expect(renderer.props!.command.id).toBe('kendo');
    act(() => renderer.props!.onArrive('kendo'));
    expect(screen.getByRole('heading', { name: '石间' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /02.*穿竹/ }));
    expect(renderer.props!.kendoShot).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: /03.*风决/ }));
    expect(screen.getByRole('heading', { name: '风决' })).toBeTruthy();
    expect(screen.queryByTitle('WingBrone · 御风')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /进入御风/ }));
    expect(container.querySelector('main')?.getAttribute('data-phase')).toBe('opening');
    act(() => renderer.props!.onChapter());
    expect(screen.getByTitle('WingBrone · 御风').getAttribute('src')).toContain('experiences/wingbrone/index.html');
    fireEvent.click(screen.getByRole('button', { name: /退出御风/ }));
    expect(screen.queryByTitle('WingBrone · 御风')).toBeNull();
    act(() => renderer.props!.onChapter());
    expect(screen.getByRole('region', { name: '剑道' })).toBeTruthy();
  });
  it('mounts a configured 01–05 module only after the chapter transition and returns to its own chapter', async () => {
    arenaExperiences.boxing.entry = { kind: 'react', load: async () => ({ default: ({ onExit }) => <button onClick={onExit}>Exit boxing project</button> }) };
    const { container } = await open();
    fireEvent.click(nav().getByRole('button', { name: /拳击/ }));
    act(() => renderer.props!.onArrive('boxing'));
    fireEvent.click(screen.getByRole('button', { name: /进入篇章/ }));
    act(() => renderer.props!.onChapter());
    fireEvent.click(screen.getByRole('button', { name: /进入体验/ }));
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => renderer.props!.onChapter());
    expect(container.querySelector('main')?.getAttribute('data-phase')).toBe('game');
    fireEvent.click(await screen.findByRole('button', { name: 'Exit boxing project' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => renderer.props!.onChapter());
    expect(screen.getByRole('region', { name: '拳击' })).toBeTruthy();
  });
  it('ignores a stale arrival when a newer clearing has been requested', async () => {
    const { container } = await open();
    fireEvent.click(nav().getByRole('button', { name: /咏春/ }));
    fireEvent.click(nav().getByRole('button', { name: /拳击/ }));
    act(() => renderer.props!.onArrive('wingchun'));
    expect(container.querySelector('main')?.getAttribute('data-phase')).toBe('approach');
    expect(screen.getByLabelText('已寻访 0/6')).toBeTruthy();
    act(() => renderer.props!.onArrive('boxing'));
    expect(container.querySelector('main')?.getAttribute('data-phase')).toBe('arena');
    expect(screen.getByLabelText('已寻访 1/6')).toBeTruthy();
  });
  it('opens a full page, returns to the encounter, then zooms out to the mountain', async () => {
    const { container } = await open();
    fireEvent.click(nav().getByRole('button', { name: /咏春/ }));
    act(() => renderer.props!.onArrive('wingchun'));
    fireEvent.click(screen.getByRole('button', { name: /进入篇章/ }));
    expect(container.querySelector('main')?.getAttribute('data-phase')).toBe('opening');
    expect(renderer.props!.command.kind).toBe('chapter');
    act(() => renderer.props!.onChapter());
    expect(screen.getByRole('region', { name: '咏春' })).toBeTruthy();
    expect(container.querySelector('.full-story')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(container.querySelector('main')?.getAttribute('data-phase')).toBe('closing');
    act(() => renderer.props!.onEncounter());
    expect(container.querySelector('main')?.getAttribute('data-phase')).toBe('arena');
    act(() => renderer.props!.onPullBack());
    expect(container.querySelector('main')?.getAttribute('data-phase')).toBe('returning');
    expect(renderer.props!.command.kind).toBe('return');
    act(() => renderer.props!.onOverview());
    expect(container.querySelector('main')?.getAttribute('data-phase')).toBe('overview');
    expect(screen.getByLabelText('已寻访 1/6')).toBeTruthy();
  });
  it('supports density, calm mode, pause, language and numeric shortcuts', async () => {
    await open();
    fireEvent.click(screen.getByRole('button', { name: '疏', exact: true }));
    expect(renderer.props!.quality).toBe('airy');
    fireEvent.click(screen.getByRole('button', { name: '静息模式' }));
    expect(renderer.props!.calm).toBe(true);
    fireEvent.keyDown(window, { key: '3' });
    expect(renderer.props!.command.id).toBe('taekwondo');
    act(() => renderer.props!.onArrive('taekwondo'));
    fireEvent.click(screen.getByRole('button', { name: /暂停切磋/ }));
    expect(renderer.props!.sparring).toBe(false);
    act(() => renderer.props!.onToggleSparring());
    expect(renderer.props!.sparring).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Switch language' }));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Cloudstone Terrace');
  });
  it('emits reserved sound events without claiming that an audio file is playing', async () => {
    await open();
    const events: CustomEvent[] = [];
    const listen = (event: Event) => events.push(event as CustomEvent);
    window.addEventListener('wudao:audio', listen);
    fireEvent.click(screen.getByRole('button', { name: '声音关闭' }));
    act(() => renderer.props!.onHover('shaolin'));
    fireEvent.click(nav().getByRole('button', { name: /少林/ }));
    act(() => renderer.props!.onArrive('shaolin'));
    act(() => renderer.props!.onPullBack());
    expect(events.map((e) => e.detail.kind)).toEqual(['enabled', 'near', 'enter', 'leave']);
    expect(events.every((e) => e.detail.enabled)).toBe(true);
    window.removeEventListener('wudao:audio', listen);
  });
  it('keeps arena introductions usable if the 3D renderer fails', async () => {
    await open();
    act(() => renderer.props!.onError('WebGL unavailable'));
    expect(screen.getByRole('alert').textContent).toContain('三维场景暂时无法显示');
    fireEvent.click(nav().getByRole('button', { name: /相扑/ }));
    expect(screen.getByRole('region', { name: '相扑' })).toBeTruthy();
  });
  it('closes help with Escape before changing the camera state', async () => {
    const { container } = await open();
    fireEvent.click(screen.getByRole('button', { name: /操作说明/ }));
    expect(screen.getByRole('complementary', { name: '操作说明' })).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(container.querySelector('main')?.getAttribute('data-phase')).toBe('overview');
  });
});
