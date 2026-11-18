import type { CollaborativeArenaId } from './types';

export function experienceUrl(src: string, base: string, currentUrl: string) {
  const resolved = new URL(src, new URL(base, currentUrl));
  if (!['http:', 'https:', 'file:'].includes(resolved.protocol)) throw new Error('Unsupported experience URL protocol');
  return resolved.href;
}

export function isExperienceMessage(event: Pick<MessageEvent, 'origin' | 'source' | 'data'>, frame: Window | null | undefined, origin: string, arenaId: CollaborativeArenaId) {
  return !!frame && event.source === frame && event.origin === origin &&
    event.data?.version === 1 && event.data?.arenaId === arenaId &&
    ['wudao:ready', 'wudao:exit', 'wudao:complete', 'wudao:error'].includes(event.data?.type);
}
