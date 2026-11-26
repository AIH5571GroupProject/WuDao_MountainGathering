import { useState } from 'react';
import type { KimariteId } from './sumoEngine';

export type WoodblockArtKey = KimariteId | 'banzuke-crest';

const ART_FILES: Record<WoodblockArtKey, string> = {
  oshidashi: 'experiences/sumo/art/kimarite-oshidashi.png',
  yorikiri: 'experiences/sumo/art/kimarite-yorikiri.png',
  uwatenage: 'experiences/sumo/art/kimarite-uwatenage.png',
  hatakikomi: 'experiences/sumo/art/kimarite-hatakikomi.png',
  'banzuke-crest': 'experiences/sumo/art/banzuke-crest.png',
};

function resolveAssetUrl(relativePath: string): string {
  const base = import.meta.env?.BASE_URL ?? '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}${relativePath}`;
}

/**
 * Expressive Edo Sumi-e / Ukiyo-e Woodblock Print SVG Artworks.
 * Built with flowing calligraphic ink brushwork, asymmetrical negative space,
 * layered wash tones, and vermilion hanko seals matching the 3D ink-and-terracotta palette.
 * Drop-in PNGs in `public/experiences/sumo/art/` override these automatically.
 */
function WoodblockSvg({ artKey }: { artKey: WoodblockArtKey }) {
  if (artKey === 'banzuke-crest') {
    return (
      <svg viewBox="0 0 240 240" className="sumo-art-svg" role="img" aria-label="Yokozuna Tsuna and Gunbai crest">
        {/* Calligraphic Enso ink-brush circle */}
        <path
          d="M124 32 C176 34 210 74 206 126 C202 178 160 208 112 204 C62 200 30 160 36 108 C41 64 74 38 110 33"
          fill="none"
          stroke="#253422"
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.14"
        />
        <circle cx="120" cy="118" r="70" fill="#d9dfd0" opacity="0.45" />

        {/* Wooden Gyōji Gunbai war fan */}
        <g transform="translate(120 112)">
          <path d="M-5 36 L-6 90 C-6 95 6 95 6 90 L5 36 Z" fill="#5a4636" stroke="#253422" strokeWidth="2.2" />
          <path d="M0 86 C18 95 30 105 24 120" fill="none" stroke="#b8432e" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M24 117 L16 132 L31 132 Z" fill="#b8432e" />
          <path
            d="M0 -68 C27 -63 47 -40 47 -10 C47 16 28 35 8 41 L-8 41 C-28 35 -47 16 -47 -10 C-47 -40 -27 -63 0 -68 Z"
            fill="#9c8772"
            stroke="#253422"
            strokeWidth="2.5"
          />
          <path d="M0 -62 L0 36" stroke="#253422" strokeWidth="1.2" opacity="0.5" />
          <circle cx="-18" cy="-16" r="9.5" fill="#b8432e" opacity="0.9" />
          <path d="M16 -25 A9.5 9.5 0 1 0 16 -7 A6.8 6.8 0 1 1 16 -25 Z" fill="#e9ecdf" />
        </g>

        {/* Braided white Yokozuna Tsuna rope */}
        <path d="M34 124 C74 154 166 154 206 124" fill="none" stroke="#253422" strokeWidth="18" strokeLinecap="round" />
        <path d="M34 124 C74 154 166 154 206 124" fill="none" stroke="#f7f8ef" strokeWidth="13" strokeLinecap="round" />
        <path
          d="M52 134 L62 124 M74 142 L84 132 M96 146 L108 136 M120 148 L132 137 M144 146 L154 136 M166 142 L175 131 M185 134 L193 124"
          stroke="#253422"
          strokeWidth="1.7"
          strokeLinecap="round"
          opacity="0.7"
        />

        {/* Five folded zigzag Shide paper streamers */}
        {[64, 92, 120, 148, 176].map((x, i) => {
          const y0 = 136 + (i === 2 ? 10 : i === 1 || i === 3 ? 7 : 1);
          return (
            <g key={x}>
              <path
                d={`M${x - 4} ${y0} L${x + 6} ${y0 + 10} L${x - 6} ${y0 + 21} L${x + 5} ${y0 + 32} L${x - 3} ${y0 + 42}`}
                fill="none"
                stroke="#253422"
                strokeWidth="6.5"
                strokeLinejoin="miter"
              />
              <path
                d={`M${x - 4} ${y0} L${x + 6} ${y0 + 10} L${x - 6} ${y0 + 21} L${x + 5} ${y0 + 32} L${x - 3} ${y0 + 42}`}
                fill="none"
                stroke="#fafbf3"
                strokeWidth="3.8"
                strokeLinejoin="miter"
              />
            </g>
          );
        })}

        {/* Vermilion hanko seal */}
        <rect x="184" y="32" width="24" height="24" rx="2" fill="#b8432e" opacity="0.92" />
        <text x="196" y="49" textAnchor="middle" fill="#e9ecdf" fontSize="13" fontFamily="serif" fontWeight="700">
          纲
        </text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 280 220" className="sumo-art-svg" role="img" aria-label={`Sumi-e woodblock print of ${artKey}`}>
      {/* Fine woodblock border */}
      <rect x="6" y="6" width="268" height="208" fill="#e9ecdf" stroke="#253422" strokeWidth="1.6" />
      <rect x="11" y="11" width="258" height="198" fill="none" stroke="#253422" strokeWidth="0.6" opacity="0.4" />

      {/* Soft bokashi Mt. Fuji & mountain wash + vermilion sun disc */}
      <path d="M12 166 Q65 116 128 144 Q190 102 268 150 L268 208 L12 208 Z" fill="#cfd8ca" opacity="0.55" />
      <circle cx="144" cy="94" r="50" fill="#b8432e" opacity="0.12" />

      {/* Sweeping woodblock Tawara clay ring */}
      <path d="M22 184 Q140 162 258 186" fill="none" stroke="#c8b683" strokeWidth="10" strokeLinecap="round" />
      <path d="M22 184 Q140 162 258 186" fill="none" stroke="#19241a" strokeWidth="2.2" strokeDasharray="11 6" opacity="0.78" />

      {artKey === 'oshidashi' && (
        <g>
          {/* Explosive twin calligraphic thrust arcs */}
          <path d="M98 88 Q138 78 176 74" fill="none" stroke="#b8432e" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M104 108 Q144 102 184 104" fill="none" stroke="#b8432e" strokeWidth="3.2" strokeLinecap="round" opacity="0.85" />
          {/* East Nishiki-e Rikishi (warm ochre-skin + Edo Ai-iro indigo mawashi) */}
          <g fill="#dfc3a4" stroke="#19241a" strokeWidth="2.2" strokeLinejoin="round">
            <path d="M84 48 C90 42 100 45 97 53 C92 55 86 54 84 48 Z" fill="#18201a" />
            <ellipse cx="94" cy="64" rx="13" ry="14" />
            <path d="M62 84 C74 70 106 72 118 90 C128 106 126 128 116 142 C98 152 68 148 56 128 C48 112 52 94 62 84 Z" />
            <path d="M102 86 C120 82 138 82 154 84 C156 90 154 96 148 97 L106 102 Z" />
            <path d="M106 102 C126 100 144 101 158 105 C158 111 154 116 146 116 L104 117 Z" />
            <path d="M68 140 C56 154 48 168 44 182 L60 183 C64 170 72 158 84 146 Z" />
            <path d="M98 142 C108 154 114 166 116 180 L132 180 C130 164 122 150 110 138 Z" />
          </g>
          <path d="M58 124 Q90 135 120 124 L116 141 Q88 150 62 140 Z" fill="#1f383d" stroke="#19241a" strokeWidth="2" />
          <path d="M62 132 Q90 141 116 132" fill="none" stroke="#c7a455" strokeWidth="1.6" />

          {/* West Nishiki-e Rikishi (staggered over tawara, kakishibu persimmon mawashi) */}
          <g fill="#d4ae8c" stroke="#19241a" strokeWidth="2.2" strokeLinejoin="round">
            <path d="M188 52 C194 45 204 48 201 56 Z" fill="#18201a" />
            <ellipse cx="192" cy="68" rx="13" ry="14" />
            <path d="M162 88 C176 74 206 78 218 98 C226 114 222 134 210 144 C192 152 164 146 156 124 C152 108 154 96 162 88 Z" />
            <path d="M164 96 C150 86 142 78 136 70 L144 64 C152 74 160 80 172 88 Z" />
            <path d="M214 98 C228 92 240 86 248 78 L252 86 C242 96 228 104 214 108 Z" />
            <path d="M170 142 L158 180 L172 182 L184 146 Z" />
            <path d="M198 142 L222 182 L236 180 L212 138 Z" />
          </g>
          <path d="M160 124 Q188 135 216 126 L212 142 Q186 150 164 140 Z" fill="#8c3b28" stroke="#19241a" strokeWidth="2" />
          <circle cx="229" cy="182" r="11" fill="none" stroke="#b8432e" strokeWidth="2.6" />
        </g>
      )}

      {artKey === 'yorikiri' && (
        <g>
          <path d="M36 116 Q142 94 238 118" fill="none" stroke="#235a58" strokeWidth="4.2" strokeLinecap="round" opacity="0.72" />
          <path d="M44 128 Q144 108 232 130" fill="none" stroke="#b8432e" strokeWidth="2.2" strokeDasharray="8 6" />
          <g fill="#dfc3a4" stroke="#19241a" strokeWidth="2.2" strokeLinejoin="round">
            <path d="M108 50 C115 43 125 46 121 55 Z" fill="#18201a" />
            <ellipse cx="116" cy="66" rx="13" ry="14" />
            <path d="M84 86 C98 72 128 74 140 94 C148 112 146 132 136 144 C118 152 88 148 78 128 C72 112 74 96 84 86 Z" />
            <path d="M126 98 C144 108 160 116 174 122 L168 134 C150 126 132 118 118 110 Z" />
            <path d="M90 142 L68 182 L84 183 L104 146 Z" />
            <path d="M120 142 L134 180 L149 180 L134 140 Z" />
          </g>
          <path d="M82 126 Q112 137 140 126 L136 142 Q110 150 86 140 Z" fill="#1f383d" stroke="#19241a" strokeWidth="2" />
          <path d="M86 134 Q112 143 136 134" fill="none" stroke="#c7a455" strokeWidth="1.6" />

          <g fill="#d4ae8c" stroke="#19241a" strokeWidth="2.2" strokeLinejoin="round">
            <path d="M174 46 C181 40 190 43 187 51 Z" fill="#18201a" />
            <ellipse cx="176" cy="62" rx="13" ry="14" />
            <path d="M150 84 C164 70 194 74 204 94 C210 112 208 132 198 144 C180 152 152 146 144 124 C140 108 142 94 150 84 Z" />
            <path d="M162 142 L152 180 L166 182 L176 146 Z" />
            <path d="M188 142 L212 182 L226 180 L202 138 Z" />
          </g>
          <path d="M148 124 Q176 135 202 124 L198 140 Q174 149 152 138 Z" fill="#8c3b28" stroke="#19241a" strokeWidth="2" />
          <circle cx="170" cy="130" r="10" fill="none" stroke="#b8432e" strokeWidth="2.8" />
        </g>
      )}

      {artKey === 'uwatenage' && (
        <g>
          <path d="M74 140 C80 34 198 22 232 108" fill="none" stroke="#b8432e" strokeWidth="5.2" strokeLinecap="round" />
          <path d="M220 98 L233 111 L237 93" fill="none" stroke="#b8432e" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M88 146 C96 54 188 44 218 112" fill="none" stroke="#19241a" strokeWidth="1.6" strokeDasharray="7 5" opacity="0.45" />

          <g fill="#dfc3a4" stroke="#19241a" strokeWidth="2.2" strokeLinejoin="round">
            <path d="M96 66 C103 60 112 63 108 71 Z" fill="#18201a" />
            <ellipse cx="102" cy="82" rx="12.5" ry="13.5" />
            <path d="M74 98 C88 86 116 88 126 108 C132 124 128 140 118 148 C100 156 74 150 68 130 C64 116 66 106 74 98 Z" />
            <path d="M112 102 L152 72 L159 83 L120 114 Z" />
            <path d="M82 144 L64 182 L80 183 L96 148 Z" />
            <path d="M110 144 L128 180 L144 180 L124 142 Z" />
          </g>
          <path d="M70 128 Q98 139 124 130 L121 144 Q96 152 74 142 Z" fill="#1f383d" stroke="#19241a" strokeWidth="2" />
          <path d="M74 136 Q98 145 121 136" fill="none" stroke="#c7a455" strokeWidth="1.6" />

          <g transform="translate(182 88) rotate(54)" fill="#d4ae8c" stroke="#19241a" strokeWidth="2.1">
            <ellipse cx="0" cy="-35" rx="12.5" ry="13.5" />
            <path d="M-24 -18 C-16 -28 16 -28 24 -16 C30 0 28 22 18 30 C4 36 -16 34 -24 22 C-30 8 -28 -6 -24 -18 Z" />
            <path d="M-20 -10 L-44 -22 M20 -8 L44 -18" stroke="#d4ae8c" strokeWidth="9" strokeLinecap="round" />
            <path d="M-12 28 L-24 58 M12 28 L26 56" stroke="#d4ae8c" strokeWidth="11" strokeLinecap="round" />
            <rect x="-25" y="4" width="50" height="13" rx="4" fill="#8c3b28" />
          </g>
        </g>
      )}

      {artKey === 'hatakikomi' && (
        <g>
          <path d="M118 62 Q174 78 212 152" fill="none" stroke="#b8432e" strokeWidth="4.8" strokeLinecap="round" />
          <path d="M200 144 L213 154 L217 138" fill="none" stroke="#b8432e" strokeWidth="3.2" strokeLinecap="round" />

          <g fill="#dfc3a4" stroke="#19241a" strokeWidth="2.2" strokeLinejoin="round">
            <path d="M74 46 C81 40 90 43 87 51 Z" fill="#18201a" />
            <ellipse cx="82" cy="62" rx="13" ry="14" />
            <path d="M56 84 C68 70 98 72 108 92 C114 110 112 128 102 140 C86 148 60 144 52 122 C48 108 50 94 56 84 Z" />
            <path d="M100 86 L142 96 L138 109 L94 100 Z" />
            <path d="M66 138 L48 180 L64 181 L80 142 Z" />
            <path d="M92 138 L104 180 L118 180 L106 138 Z" />
          </g>
          <path d="M56 120 Q84 131 108 122 L105 137 Q82 145 60 135 Z" fill="#1f383d" stroke="#19241a" strokeWidth="2" />
          <path d="M60 128 Q84 137 105 128" fill="none" stroke="#c7a455" strokeWidth="1.6" />

          <g transform="translate(176 134) rotate(74)" fill="#d4ae8c" stroke="#19241a" strokeWidth="2.1">
            <ellipse cx="0" cy="-35" rx="12.5" ry="13.5" />
            <path d="M-23 -18 C-14 -28 14 -28 23 -16 C28 0 26 20 16 28 C2 34 -16 32 -23 20 C-28 8 -26 -6 -23 -18 Z" />
            <path d="M-16 -12 L-30 -38 M16 -12 L30 -36" stroke="#d4ae8c" strokeWidth="8.5" strokeLinecap="round" />
            <path d="M-10 24 L-16 54 M12 24 L20 52" stroke="#d4ae8c" strokeWidth="10.5" strokeLinecap="round" />
            <rect x="-24" y="4" width="48" height="12" rx="4" fill="#8c3b28" />
          </g>
          <path d="M214 168 Q226 155 238 170 M198 172 Q208 161 219 174" fill="none" stroke="#19241a" strokeWidth="1.8" opacity="0.6" />
        </g>
      )}

      {/* Corner Vermilion Hanko Stamp */}
      <rect x="234" y="20" width="24" height="24" rx="2" fill="#b8432e" opacity="0.92" />
      <text x="246" y="37" textAnchor="middle" fill="#e9ecdf" fontSize="13" fontFamily="serif" fontWeight="700">
        决
      </text>
    </svg>
  );
}

export function WoodblockArt({ artKey, alt }: { artKey: WoodblockArtKey; alt: string }) {
  const [imgError, setImgError] = useState(false);
  const src = resolveAssetUrl(ART_FILES[artKey]);

  if (!imgError) {
    return (
      <div className="sumo-art-frame">
        <img
          src={src}
          alt={alt}
          className="sumo-art-img"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div className="sumo-art-frame">
      <WoodblockSvg artKey={artKey} />
    </div>
  );
}
