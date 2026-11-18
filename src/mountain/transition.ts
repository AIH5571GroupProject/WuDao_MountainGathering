import { smoothstep } from './model';

// The camera and scene swap during a short, guaranteed empty frame.
export function particleTransition(progress: number, from: number, to: number, calm = false) {
  const outgoing = smoothstep(0, .37, progress);
  const incoming = smoothstep(.53, 1, progress);
  const scatter = outgoing - incoming;
  return {
    page: from + (to - from) * smoothstep(.40, .50, progress),
    scatter: calm ? 0 : scatter,
    visibility: 1 - smoothstep(.88, 1, outgoing) + smoothstep(0, .12, incoming),
    reveal: smoothstep(.72, 1, progress),
  };
}
export const WINGBRONE_ONLINE = 'https://kuki-hill.github.io/WingBrone/';
export function wingbroneUrl(base: string, protocol: string) {
  return protocol === 'file:' ? WINGBRONE_ONLINE : base + 'experiences/wingbrone/index.html';
}
