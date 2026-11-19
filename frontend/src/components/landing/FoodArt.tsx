// Original top-down food illustrations for the landing page — no photos or
// licences needed. Each plate is a 200×200 SVG; pass className to size it.
// Swap any of these for a real photo of your own dishes later.

type ArtProps = { className?: string; title: string };

function Plate({ children, className, title }: ArtProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label={title}>
      <title>{title}</title>
      <ellipse cx="100" cy="108" rx="88" ry="86" fill="#000" opacity="0.08" />
      <circle cx="100" cy="100" r="88" fill="#FFFFFF" />
      <circle cx="100" cy="100" r="88" fill="none" stroke="#E6E2D9" strokeWidth="2" />
      <circle cx="100" cy="100" r="70" fill="none" stroke="#EFEBE3" strokeWidth="3" />
      {children}
    </svg>
  );
}

// Scatter of small grains/dots inside a circle, deterministic (no random).
function grains(cx: number, cy: number, r: number, count: number, seed: number) {
  const out: { x: number; y: number; a: number }[] = [];
  for (let i = 0; i < count; i++) {
    const t = i * 2.399963 + seed; // golden angle spiral
    const d = r * Math.sqrt((i + 0.5) / count);
    out.push({ x: cx + d * Math.cos(t), y: cy + d * Math.sin(t), a: (t * 57.3) % 180 });
  }
  return out;
}

export function WaliMaharage({ className, title = "Wali maharage" }: Partial<ArtProps>) {
  return (
    <Plate className={className} title={title}>
      {/* rice */}
      <circle cx="80" cy="92" r="44" fill="#FBF8F1" stroke="#EEE8DA" strokeWidth="1.5" />
      {grains(80, 92, 40, 70, 0).map((g, i) => (
        <ellipse key={i} cx={g.x} cy={g.y} rx="4.2" ry="1.6" fill="#EDE6D4" transform={`rotate(${g.a} ${g.x} ${g.y})`} />
      ))}
      {/* beans in sauce */}
      <circle cx="124" cy="124" r="36" fill="#9C4A23" />
      <circle cx="124" cy="124" r="36" fill="none" stroke="#7E3818" strokeWidth="2" />
      {grains(124, 124, 30, 26, 1.3).map((g, i) => (
        <g key={i} transform={`rotate(${g.a} ${g.x} ${g.y})`}>
          <ellipse cx={g.x} cy={g.y} rx="5.5" ry="3.6" fill="#5E2A12" />
          <ellipse cx={g.x - 1.2} cy={g.y - 1} rx="2" ry="1" fill="#A65F3A" />
        </g>
      ))}
      {/* coriander */}
      {[[60, 70], [96, 108], [140, 104]].map(([x, y], i) => (
        <path key={i} d={`M${x} ${y} q4 -6 8 0 q-4 6 -8 0z`} fill="#3E8E4B" />
      ))}
    </Plate>
  );
}

export function ChipsiMayai({ className, title = "Chipsi mayai" }: Partial<ArtProps>) {
  const fries = [
    [58, 84, 20], [76, 70, -30], [96, 64, 60], [118, 72, 10], [136, 88, -50], [70, 104, 75],
    [92, 92, -10], [114, 100, 40], [134, 114, -20], [80, 124, 30], [104, 122, -60], [124, 136, 15],
    [62, 120, -40], [96, 142, 70], [118, 150, -15],
  ];
  return (
    <Plate className={className} title={title}>
      {/* omelette */}
      <path d="M100 32c34 0 66 26 66 66s-30 70-66 70-70-26-70-68 34-68 70-68z" fill="#F6CF56" />
      <path d="M100 32c34 0 66 26 66 66s-30 70-66 70-70-26-70-68 34-68 70-68z" fill="none" stroke="#E2B23A" strokeWidth="3" />
      {[[74, 60], [128, 66], [150, 120], [58, 140], [110, 160]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="6" fill="#E8A93A" opacity="0.55" />
      ))}
      {/* fries */}
      {fries.map(([x, y, a], i) => (
        <g key={i} transform={`rotate(${a} ${x} ${y})`}>
          <rect x={x - 15} y={y - 3.5} width="30" height="7" rx="2" fill="#F2B640" />
          <rect x={x - 15} y={y - 3.5} width="30" height="3" rx="1.5" fill="#F9D274" />
        </g>
      ))}
      {/* tomato sauce */}
      <circle cx="146" cy="56" r="13" fill="#C9362A" />
      <circle cx="142" cy="52" r="3.5" fill="#E0614F" />
    </Plate>
  );
}

export function Pilau({ className, title = "Pilau" }: Partial<ArtProps>) {
  return (
    <Plate className={className} title={title}>
      <circle cx="100" cy="100" r="62" fill="#B97A3D" />
      {grains(100, 100, 58, 110, 0.7).map((g, i) => (
        <ellipse key={i} cx={g.x} cy={g.y} rx="4.4" ry="1.7"
          fill={i % 3 === 0 ? "#D29A57" : i % 3 === 1 ? "#A66A31" : "#C4894A"}
          transform={`rotate(${g.a} ${g.x} ${g.y})`} />
      ))}
      {/* beef pieces */}
      {[[78, 82], [118, 76], [128, 118], [86, 124], [104, 100]].map(([x, y], i) => (
        <g key={i}>
          <rect x={x - 10} y={y - 8} width="20" height="16" rx="6" fill="#6B3418" transform={`rotate(${i * 37} ${x} ${y})`} />
          <rect x={x - 6} y={y - 5} width="8" height="4" rx="2" fill="#8F4C27" transform={`rotate(${i * 37} ${x} ${y})`} />
        </g>
      ))}
      {/* cardamom pods & onion */}
      {[[66, 104], [140, 96], [108, 140]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="4" ry="2.6" fill="#7E8C4A" />
      ))}
      <path d="M60 130c10-8 22-8 30 0" stroke="#F2E3C4" strokeWidth="3" fill="none" strokeLinecap="round" />
    </Plate>
  );
}

export function UgaliSamaki({ className, title = "Ugali samaki" }: Partial<ArtProps>) {
  return (
    <Plate className={className} title={title}>
      {/* ugali */}
      <path d="M44 104c0-24 14-40 36-40s34 16 34 40-12 38-34 38-36-14-36-38z" fill="#F7F2E2" />
      <path d="M50 96c6-14 18-22 32-20" stroke="#E7DFC8" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* fried fish */}
      <g transform="translate(18 14) scale(0.86) rotate(-28 128 106)">
        <path d="M92 106c10-20 38-30 62-20 6 2 10 6 12 10l18-14-4 24 4 24-18-14c-2 4-6 8-12 10-24 10-52 0-62-20z" fill="#B5652B" />
        <path d="M102 106c10-12 30-18 48-12" stroke="#8C4A1C" strokeWidth="2.5" fill="none" />
        <path d="M104 114c12 8 30 10 44 4" stroke="#8C4A1C" strokeWidth="2.5" fill="none" />
        {[118, 130, 142].map((x) => (
          <path key={x} d={`M${x} 92l-6 14 6 14`} stroke="#9A5523" strokeWidth="2" fill="none" />
        ))}
        <circle cx="104" cy="102" r="3.5" fill="#2A1A10" />
        <circle cx="103" cy="101" r="1.2" fill="#FFF" />
      </g>
      {/* kachumbari */}
      {[[62, 150, "#D63B2F"], [76, 158, "#D63B2F"], [90, 152, "#E6EBD8"], [70, 140, "#3E8E4B"], [84, 144, "#D63B2F"]].map(
        ([x, y, c], i) => <rect key={i} x={Number(x) - 4} y={Number(y) - 4} width="8" height="8" rx="2" fill={String(c)} transform={`rotate(${i * 25} ${x} ${y})`} />
      )}
      <path d="M138 52c4 6 10 8 16 6" stroke="#F2E15B" strokeWidth="6" strokeLinecap="round" />
    </Plate>
  );
}

export function Chapati({ className, title = "Chapati" }: Partial<ArtProps>) {
  return (
    <Plate className={className} title={title}>
      {[0, 1].map((k) => (
        <g key={k} transform={`translate(${k * 10} ${k * -8})`}>
          <circle cx="96" cy="104" r="58" fill={k ? "#E6B363" : "#D9A04E"} />
          <path d="M96 104m-46 0a46 46 0 1 0 92 0a46 46 0 1 0 -92 0" fill="none" stroke="#C7893A" strokeWidth="2" opacity="0.6" />
          <path d="M96 104m-30 0a30 30 0 1 0 60 0a30 30 0 1 0 -60 0" fill="none" stroke="#C7893A" strokeWidth="2" opacity="0.5" />
          {grains(96, 104, 52, 16, 2.1 + k).map((g, i) => (
            <ellipse key={i} cx={g.x} cy={g.y} rx="6" ry="4" fill="#B87631" opacity="0.55" />
          ))}
        </g>
      ))}
    </Plate>
  );
}

export function Chai({ className, title = "Chai" }: Partial<ArtProps>) {
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label={title}>
      <title>{title}</title>
      <ellipse cx="100" cy="110" rx="78" ry="76" fill="#000" opacity="0.08" />
      {/* saucer */}
      <circle cx="100" cy="102" r="78" fill="#FFFFFF" stroke="#E6E2D9" strokeWidth="2" />
      <circle cx="100" cy="102" r="56" fill="none" stroke="#EFEBE3" strokeWidth="3" />
      {/* cup */}
      <path d="M150 92c18 0 26 8 26 18s-8 18-26 18" stroke="#FFFFFF" strokeWidth="14" fill="none" />
      <path d="M150 92c18 0 26 8 26 18s-8 18-26 18" stroke="#E6E2D9" strokeWidth="2" fill="none" />
      <circle cx="100" cy="102" r="50" fill="#FFFFFF" stroke="#E0DBD0" strokeWidth="3" />
      <circle cx="100" cy="102" r="42" fill="#B07A4C" />
      <ellipse cx="88" cy="92" rx="16" ry="8" fill="#C79668" opacity="0.7" />
      {/* spoon */}
      <path d="M38 158l44-34" stroke="#C9CCD1" strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="34" cy="161" rx="9" ry="6" fill="#C9CCD1" transform="rotate(-38 34 161)" />
    </svg>
  );
}

export const FOOD_ITEMS = [
  { key: "wali", name: "Wali maharage", price: 3000, Art: WaliMaharage },
  { key: "chipsi", name: "Chipsi mayai", price: 3500, Art: ChipsiMayai },
  { key: "pilau", name: "Pilau nyama", price: 5000, Art: Pilau },
  { key: "ugali", name: "Ugali samaki", price: 6000, Art: UgaliSamaki },
  { key: "chapati", name: "Chapati", price: 500, Art: Chapati },
  { key: "chai", name: "Chai", price: 500, Art: Chai },
] as const;
