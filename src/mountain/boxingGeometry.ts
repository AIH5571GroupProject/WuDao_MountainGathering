import type { Vec3 } from './model';
import { Points, shades } from './filmPoints';

const graphite = shades(['#4d5048', '#63655c', '#7d7a6d', '#999386', '#bab0a0']);
const canvas = shades(['#494b42', '#666056', '#817767', '#a08f78', '#bdb097']);
const lamp = shades(['#827962', '#b4a588', '#d2bb90', '#e2cfaa', '#f4e8ca']);
const olive = shades(['#35443a', '#46594b', '#5e6d5c', '#75816f', '#929480']);
const hide = shades(['#60463a', '#7d5648', '#9a6e56', '#b78b6d', '#cba282']);
const chalk = shades(['#857f72', '#a09988', '#bfb3a0', '#d2c5ac', '#e2d5bc']);
const wrap = shades(['#784944', '#97574c', '#af6a57', '#be816c']);
const hoodie = shades(['#555952', '#6c7167', '#888c81', '#a4a89b', '#c7c7b9']);
const hair = shades(['#32342c', '#4a4c40', '#64675a', '#868373']);

export function makeBoxingMist(shot: number) {
  const field = new Points(701 + shot * 83);
  const fog = shades(['#53564a', '#5a5d50', '#656658', '#777565']);
  for (let i = 0; i < 2400; i++) {
    const x = field.range(-11, 11);
    const z = field.range(-11, -.65);
    const drift = Math.sin(x * .67 + z * .51 + shot) * .6 + Math.sin(z * 1.2) * .4;
    if (field.random() > .56 + .4 * drift) continue;
    const y = .06 + field.random() ** 2.4 * (z < -4 ? 1.5 : .35);
    field.point(x, y, z, fog, field.range(.08, .18), field.range(.2, .88));
  }
  return field.geometry();
}

export function makeBoxingHaze(shot: number, foreground: boolean) {
  const field = new Points(1061 + shot * 83 + Number(foreground) * 59);
  const fog = shades(['#56594c', '#626457', '#706f5e', '#817d69']);
  for (let i = 0; i < (foreground ? 350 : 670); i++) {
    const x = field.range(-10, 10);
    const z = foreground ? field.range(.95, 3.65) : field.range(-10.5, -2.1);
    const fold = Math.sin(x * .42 + z * .55 + shot) * .5;
    const y = foreground
      ? .06 + field.random() ** 1.7 * (.72 + .34 * Math.abs(fold))
      : 1.25 + fold + field.range(-.98, .94);
    field.point(x, y, z, fog, field.range(2.4, 5.4), field.range(.12, .92));
  }
  return field.geometry();
}

export function makeBoxingSet(shot: number) {
  const room = new Points(2004 + shot * 31), props = new Points(1976 + shot * 71), foreground = new Points(1980 + shot * 13);
  const isRing = shot !== 1;
  const zFar = shot === 0 ? -8 : -4.7;
  for (let i = 0; i < 5700; i++) {
    const x = room.range(-10.5, 10.5), y = room.range(-.3, 6);
    const glow = Math.exp(-x * x / 25 - (y - 2.35) ** 2 / 8);
    room.point(x, y, zFar + room.range(-.2, .2), shot === 0 ? graphite : olive, room.range(.13, .34), .14 + .67 * glow * room.random());
  }
  for (let i = 0; i < 4250; i++) {
    const x = room.range(-11.8, 11.8), z = room.range(-13, 4.8);
    const glow = Math.exp(-x * x / 34 - (z + .3) ** 2 / 42);
    const grain = .18 * Math.sin(x * (shot === 1 ? 26 : 2.8));
    room.point(x, room.range(-.04, .01), z, canvas, room.range(.14, .27), .10 + .65 * glow * room.random() + grain);
  }
  for (let i = 0; i < 1800; i++) {
    const x = room.range(-9.5, 9.5), z = room.range(-10, 1.8);
    const height = 1.95 + .47 * Math.sin(x * .74 + z * .17);
    room.point(x, height + room.range(-.72, .72), z, shot === 0 ? chalk : olive, room.range(.055, .22), room.range(.25, .7));
  }
  if (isRing) {
    const ww = 4.1, near = 3.05, far = -3.9;
    const ropes = shot === 0 ? graphite : olive;
    for (const x of [-ww, ww]) {
      for (const z of [near, far]) {
        props.box([x, .91, z], [.19, 1.90, .19], 640, graphite, .22);
        props.box([x, .94, z], [.3, .74, .26], 345, olive, .20);
      }
    }
    for (const y of [.48, .97, 1.48]) {
      props.limb([-ww, y, far], [ww, y, far], .038, .038, 780, ropes);
      for (const x of [-ww, ww]) props.limb([x, y, far], [x, y, near], .04, .04, 850, ropes);
      if (shot === 0) foreground.limb([-ww, y, near], [ww, y, near], .038, .038, 840, hair);
    }
    if (shot === 0) {
      for (let i = 0; i < 7; i++) props.ellipsoid([(i - 3) * .35, 3.54, -6.1], [.052, .041, .034], 42, chalk, .17);
    } else {
      props.box([0, 3.16, -4.6], [10, .16, .22], 750, graphite, .18);
    }
  } else {
    // Mount, wall frame and the dim heavy bag behind the small speed bag.
    props.ellipsoid([.04, 2.49, .33], [.62, .055, .43], 1050, canvas, .20);
    props.box([-.55, 2.49, -.22], [1.20, .12, .17], 410, graphite, .21);
    props.limb([-.65, 2.72, -.48], [-.65, 3.75, -.48], .055, .055, 480, graphite);
    props.limb([2.57, 2.10, -2.8], [2.57, .87, -2.8], .31, .30, 1700, olive);
    props.limb([2.57, 3.6, -2.8], [2.57, 2.0, -2.8], .015, .015, 330, graphite);
    props.box([-2.65, 1.9, -2.85], [.19, 4.1, .34], 690, canvas, .23);
    for (const x of [-1.8, -.1, 1.6]) props.box([x, 3.26, -4.12], [1.02, .12, .12], 225, lamp, .24);
  }
  return { room: room.geometry(), props: props.geometry(), foreground: foreground.geometry() };
}

export const speedBagPivot: Vec3 = [.04, 2.45, .33];

export function makeSpeedBag() {
  const p = new Points(80);
  const leather = shades(['#695145', '#866958', '#9d7a63', '#b48e70', '#c6a68a']);
  for (let i = 0; i < 1510; i++) {
    const t = p.range(0, 1), a = p.range(0, 2 * Math.PI);
    const r = Math.sin(Math.PI * t) ** .72 * (.09 + t * .23);
    p.point(Math.cos(a) * r, -.05 - t * .48, Math.sin(a) * r, leather, p.range(.15, .26),
      .43 + .27 * Math.cos(a + .75) + .22 * p.random());
  }
  p.limb([0, 0, 0], [0, -.15, 0], .027, .045, 185, graphite);
  return p.geometry();
}

export type BoxingFigureKind = 'hood' | 'speed' | 'coach' | 'strength' | 'corner';

export function makeBoxingFigure(kind: BoxingFigureKind) {
  const index = ['hood', 'speed', 'coach', 'strength', 'corner'].indexOf(kind);
  const make = (seed: number) => new Points(seed + index * 47);
  const body = make(15), arm = make(31), forearm = make(48), glove = make(64), thigh = make(79), calf = make(95), shoe = make(110);
  const hooded = kind === 'hood', strong = kind === 'strength', secondary = kind === 'coach' || kind === 'corner';
  const top = hooded ? hoodie : strong ? chalk : secondary ? graphite : olive;
  const legs = hooded ? graphite : olive;
  const complexion = secondary ? graphite : hide;
  body.ellipsoid([0, .34, 0], [strong ? .28 : .25, .40, .153], 1610, top, .195);
  body.ellipsoid([0, .025, -.015], [.212, .15, .141], 410, legs, .185);
  body.ellipsoid([0, .72, .014], [.083, .124, .081], 265, hooded ? top : complexion, .16);
  body.ellipsoid([0, .88, .044], [.133, .173, .121], 810, hooded ? chalk : complexion, .16);
  if (hooded) {
    body.ellipsoid([0, .925, -.006], [.18, .208, .141], 940, hoodie, .18);
    body.ellipsoid([0, .889, .113], [.096, .119, .028], 380, hair, .16);
  } else {
    body.ellipsoid([0, .965, .004], [.131, .103, .119], 430, secondary ? graphite : hair, .155);
    body.ellipsoid([0, .88, .146], [.039, .042, .035], 128, complexion, .135);
  }
  arm.limb([0, .02, 0], [0, 1, 0], .101, .075, 525, strong || secondary ? complexion : top);
  forearm.limb([0, .02, 0], [0, 1, 0], .079, .053, 475, hooded ? top : complexion);
  glove.ellipsoid([0, 0, 0], strong ? [.085, .046, .103] : [.09, .094, .108], 425, kind === 'speed' ? wrap : strong || hooded ? chalk : complexion, .172);
  thigh.limb([0, .02, 0], [0, 1, 0], .112, .083, 548, legs);
  calf.limb([0, .02, 0], [0, 1, 0], .084, .06, 488, legs);
  shoe.ellipsoid([0, 0, .035], [.075, .06, .129], 300, hair, .165);
  return { body: body.geometry(), arm: arm.geometry(), forearm: forearm.geometry(), glove: glove.geometry(),
    thigh: thigh.geometry(), calf: calf.geometry(), shoe: shoe.geometry() };
}
