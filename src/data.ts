export type ArenaId = "shaolin" | "wingchun" | "karate" | "boxing" | "sumo";

export type Arena = {
  id: ArenaId;
  cn: string;
  en: string;
  cnTitle: string;
  enTitle: string;
  cnLine: string;
  enLine: string;
  position: [number, number, number];
  color: string;
  mapPoint: [number, number];
  mapOutline: string;
};

export const arenas: Arena[] = [
  {
    id: "shaolin", cn: "少林", en: "Shaolin", cnTitle: "少林 · 松风院", enTitle: "Shaolin · Pinewind Court",
    cnLine: "拳从静处起，山风替你记住每一招。", enLine: "A quiet stance, a mountain breeze, and a thousand-year echo.",
    position: [-7.2, 0.15, 1.55], color: "#879679",
    mapPoint: [.176, .363], mapOutline: 'M115 350 L172 327 L245 356 L223 386 L161 402 L117 372 Z',
  },
  {
    id: "wingchun", cn: "咏春", en: "Wing Chun", cnTitle: "咏春 · 听竹坪", enTitle: "Wing Chun · Listening Grove",
    cnLine: "寸劲落在竹影间，前方留出一处空地。", enLine: "Short strikes meet long shadows in a clearing among the bamboo.",
    position: [-3.5, 0.15, -1.55], color: "#b58a69",
    mapPoint: [.374, .557], mapOutline: 'M299 542 Q343 502 413 534 L439 574 Q398 608 333 588 Z',
  },
  {
    id: "karate", cn: "空手道", en: "Karate", cnTitle: "空手道 · 云石台", enTitle: "Karate · Cloudstone Terrace",
    cnLine: "一声喝，惊起林梢几片新叶。", enLine: "One sharp breath sends the newest leaves into the air.",
    position: [0.1, 0.15, 1.5], color: "#b5a76f",
    mapPoint: [.565, .181], mapOutline: 'M528 169 L562 160 L599 177 L574 200 L538 189 Z',
  },
  {
    id: "boxing", cn: "拳击", en: "Boxing", cnTitle: "拳击 · 回声谷", enTitle: "Boxing · Echo Hollow",
    cnLine: "拳风绕过山坳，在竹海里兜一圈再回来。", enLine: "A swift cross circles the hollow and comes back as an echo.",
    position: [4.7, 0.15, -1.3], color: "#9b765f",
    mapPoint: [.745, .511], mapOutline: 'M680 503 L740 478 L798 509 L759 543 L710 543 Z',
  },
  {
    id: "sumo", cn: "相扑", en: "Sumo", cnTitle: "相扑 · 大地席", enTitle: "Sumo · Earth Ring",
    cnLine: "脚步一沉，整片山林都轻轻晃了一下。", enLine: "One grounded step, and even the mountain seems to sway.",
    position: [2.0, 0.15, -3.6], color: "#927965",
    mapPoint: [.837, .748], mapOutline: 'M780 748 C780 699 888 695 894 744 C900 799 785 802 780 748 Z',
  },
];
