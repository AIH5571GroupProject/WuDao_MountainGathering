import { expect, it } from 'vitest';
import { particleTransition, wingbroneUrl, WINGBRONE_ONLINE } from '../src/mountain/transition';
it('keeps endpoints assembled, disperses at midpoint, then reveals the page', () => {
  expect(particleTransition(0,0,1)).toEqual({page:0,scatter:0,visibility:1,reveal:0});
  for (const t of [.37, .43, .50, .53]) {
    expect(particleTransition(t, 0, 1).scatter).toBe(1);
    expect(particleTransition(t, 0, 1).visibility).toBe(0);
  }
  expect(particleTransition(.7, 0, 1).visibility).toBe(1);
  expect(particleTransition(.5,0,1).reveal).toBe(0);
  expect(particleTransition(1,0,1).page).toBe(1);
  expect(particleTransition(1,0,1).scatter).toBeCloseTo(0);
  expect(particleTransition(1,0,1).reveal).toBe(1);
  expect(particleTransition(1,1,0).page).toBe(0);
});
it('restarts at the current page shape without a discontinuity and respects stillness',()=>{
  expect(particleTransition(0,.41,0).page).toBe(.41);
  expect(particleTransition(.5,0,1,true).scatter).toBe(0);
});
it('resolves the bundled game beneath a repository deployment and uses online fallback only for a portable file',()=>{
  expect(wingbroneUrl('/Budo/','https:')).toBe('/Budo/experiences/wingbrone/index.html');
  expect(wingbroneUrl('/','http:')).toBe('/experiences/wingbrone/index.html');
  expect(wingbroneUrl('/','file:')).toBe(WINGBRONE_ONLINE);
});
