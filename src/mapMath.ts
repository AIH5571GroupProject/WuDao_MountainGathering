export type MapSize = { width: number; height: number };
export type MapView = { x: number; y: number; zoom: number };
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 2.4;
export const HOME_VIEW: MapView = { x: 0, y: 0, zoom: 1 };

// A small bleed keeps the illustration under the paper edges when panning.
// The art is an oblique illustrated atlas, with normalized landmark coordinates.
export function atlasSize(viewport: MapSize): MapSize {
  return {
    width: Math.max(viewport.width, viewport.height * 1.4) * 1.12,
    height: Math.max(viewport.height, viewport.width / 2.65) * 1.12,
  };
}

export function boundView(view: MapView, viewport: MapSize): MapView {
  const art = atlasSize(viewport);
  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, view.zoom));
  const maxX = Math.max(0, (art.width * zoom - viewport.width) / 2);
  const maxY = Math.max(0, (art.height * zoom - viewport.height) / 2);
  return { x: Math.max(-maxX, Math.min(maxX, view.x)), y: Math.max(-maxY, Math.min(maxY, view.y)), zoom };
}

export function zoomAt(view: MapView, nextZoom: number, pointer: { x: number; y: number }, viewport: MapSize): MapView {
  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
  const ratio = zoom / view.zoom;
  return boundView({ x: pointer.x - (pointer.x - view.x) * ratio, y: pointer.y - (pointer.y - view.y) * ratio, zoom }, viewport);
}

export function focusView(point: [number, number], viewport: MapSize): MapView {
  const art = atlasSize(viewport);
  const zoom = 1.55;
  // Keep the clearing opposite its information panel, including the far-right ring.
  const panelOffset = point[0] > .65 ? .12 : -.12;
  return boundView({ x: viewport.width * panelOffset - (point[0] - .5) * art.width * zoom,
    y: -viewport.height * .02 - (point[1] - .5) * art.height * zoom, zoom }, viewport);
}

export function easeOut(t: number) { return 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3); }
