import { useEffect, type ComponentProps, type ReactNode } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import MountainWorld from '../src/mountain/MountainWorld';

// A canvas fallback is mounted as DOM children even when the renderer works.
// It must not report a missing WebGL context merely because it was mounted.
vi.mock('@react-three/fiber', async (original) => {
  const actual = await original<typeof import('@react-three/fiber')>();
  return { ...actual, Canvas: ({ fallback, onCreated }: { fallback: ReactNode; onCreated: (state: unknown) => void }) => {
    useEffect(() => { onCreated({ gl: { setClearColor: vi.fn(), debug: {} } }); }, []);
    return <canvas>{fallback}</canvas>;
  } };
});
afterEach(cleanup);
it('does not turn a successful canvas creation into a false WebGL-unavailable error', () => {
  const props: ComponentProps<typeof MountainWorld> = {
    command: { kind: 'reset', sequence: 0 }, phase: 'overview', arena: null, language: 'zh', quality: 'balanced', calm: false, sparring: true,
    onEnter: vi.fn(), onHover: vi.fn(), onArrive: vi.fn(), onOverview: vi.fn(), onProgress: vi.fn(), onPullBack: vi.fn(),
    onChapter: vi.fn(), onEncounter: vi.fn(), onReady: vi.fn(), onError: vi.fn(), onToggleSparring: vi.fn(),
  };
  render(<MountainWorld {...props} />);
  expect(props.onReady).toHaveBeenCalledOnce();
  expect(props.onError).not.toHaveBeenCalled();
});
