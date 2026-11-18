import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { ExperiencePortal } from '../src/experiences/ExperiencePortal';
import { arenaExperiences } from '../src/experiences/registry';
import { experienceUrl } from '../src/experiences/bridge';
import type { ArenaExperience, ExperienceContext, ExperienceProps } from '../src/experiences/types';

const context: ExperienceContext = { version: 1, arenaId: 'shaolin', language: 'zh', soundEnabled: false, reducedMotion: false, quality: 'balanced', assets: arenaExperiences.shaolin.assets };
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('collaborative experience integration', () => {
  it('registers five independent reserved modules without enabling unfinished projects', () => {
    expect(Object.keys(arenaExperiences)).toEqual(['shaolin', 'wingchun', 'karate', 'boxing', 'sumo']);
    expect(Object.values(arenaExperiences).map(x => x.number)).toEqual(['01', '02', '03', '04', '05']);
    for (const [id, definition] of Object.entries(arenaExperiences)) { expect(definition.id).toBe(id); expect(definition.entry).toBeNull(); expect(definition.title.en).toBeTruthy(); }
    expect(arenaExperiences.shaolin.assets).not.toBe(arenaExperiences.boxing.assets);
  });
  it('resolves static projects below the GitHub repository path and rejects executable URL schemes', () => {
    expect(experienceUrl('experiences/shaolin/index.html', '/WuDao_MountainGathering/', 'https://kuki-hill.github.io/WuDao_MountainGathering/')).toBe('https://kuki-hill.github.io/WuDao_MountainGathering/experiences/shaolin/index.html');
    expect(() => experienceUrl('javascript:alert(1)', '/', location.href)).toThrow('Unsupported');
  });
  it('initializes only the correct frame, rejects forged messages and removes the listener when leaving', async () => {
    const definition: ArenaExperience = { ...arenaExperiences.shaolin, entry: { kind: 'iframe', src: 'experiences/shaolin/index.html' } };
    const onClose = vi.fn();
    const { unmount, rerender } = render(<ExperiencePortal definition={definition} context={context} onClose={onClose} />);
    const frame = screen.getByTitle('少林 experience') as HTMLIFrameElement;
    expect(frame.getAttribute('allow')).toBe('fullscreen');
    const source = frame.contentWindow!, origin = new URL(frame.src).origin;
    const post = vi.spyOn(source, 'postMessage');
    const message = (type: string, extra = {}, changed = {}) => fireEvent(window, new MessageEvent('message', { source, origin, data: { type, version: 1, arenaId: 'shaolin', ...extra }, ...changed }));
    message('wudao:exit', {}, { origin: 'https://untrusted.example' });
    message('wudao:exit', {}, { source: window });
    message('wudao:exit', { arenaId: 'boxing' });
    expect(onClose).not.toHaveBeenCalled();
    message('wudao:ready');
    await waitFor(() => expect(post).toHaveBeenCalledWith(expect.objectContaining({ type: 'wudao:init', language: 'zh', arenaId: 'shaolin' }), origin));
    expect(screen.queryByRole('status')).toBeNull();
    rerender(<ExperiencePortal definition={definition} context={{ ...context, language: 'en' }} onClose={onClose} />);
    expect(post).toHaveBeenCalledWith(expect.objectContaining({ type: 'wudao:context', language: 'en' }), origin);
    const complete = vi.fn(); window.addEventListener('wudao:experience-complete', complete);
    message('wudao:complete', { result: { score: 10, completed: true } });
    expect(complete).toHaveBeenCalledOnce();
    window.removeEventListener('wudao:experience-complete', complete);
    message('wudao:exit'); expect(onClose).toHaveBeenCalledOnce();
    unmount(); expect(post).toHaveBeenCalledWith(expect.objectContaining({ type: 'wudao:dispose' }), origin);
    message('wudao:exit'); expect(onClose).toHaveBeenCalledOnce();
  });
  it('loads a React project with context, lets it exit and unmounts its effects', async () => {
    const disposed = vi.fn(), onClose = vi.fn();
    function Project(props: ExperienceProps) { useEffect(() => disposed, []); return <button onClick={props.onExit}>{props.arenaId} {props.language}</button>; }
    const definition: ArenaExperience = { ...arenaExperiences.shaolin, entry: { kind: 'react', load: async () => ({ default: Project }) } };
    const { unmount } = render(<ExperiencePortal definition={definition} context={context} onClose={onClose} />);
    fireEvent.click(await screen.findByRole('button', { name: 'shaolin zh' }));
    expect(onClose).toHaveBeenCalledOnce(); unmount(); expect(disposed).toHaveBeenCalledOnce();
  });
});
