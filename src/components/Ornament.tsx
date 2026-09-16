import type { OrnamentId } from '../lib/types';

interface OrnamentProps {
  kind: OrnamentId;
  /** Drawn in currentColor; set the colour on the wrapping element. */
  className?: string;
}

/**
 * A decorative band stamped across spines and covers. Each variant is a short
 * repeating motif drawn in a 120×14 box and stretched to whatever width it is
 * given, which is what lets one component serve a 34px spine and a full cover.
 */
export function Ornament({ kind, className }: OrnamentProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 14"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      vectorEffect="non-scaling-stroke"
    >
      {shapes[kind]}
    </svg>
  );
}

const shapes: Record<OrnamentId, React.ReactNode> = {
  rule: (
    <>
      <line x1="0" y1="4" x2="120" y2="4" strokeWidth="1" />
      <line x1="0" y1="10" x2="120" y2="10" strokeWidth="0.6" opacity="0.7" />
    </>
  ),
  diamond: (
    <>
      <line x1="0" y1="7" x2="120" y2="7" strokeWidth="0.6" opacity="0.5" />
      {[15, 45, 75, 105].map((x) => (
        <path key={x} d={`M${x} 2 L${x + 6} 7 L${x} 12 L${x - 6} 7 Z`} strokeWidth="0.9" />
      ))}
    </>
  ),
  laurel: (
    <>
      <line x1="0" y1="7" x2="120" y2="7" strokeWidth="0.7" />
      {[10, 30, 50, 70, 90, 110].map((x) => (
        <g key={x}>
          <path d={`M${x} 7 Q${x + 5} 2 ${x + 10} 7`} strokeWidth="0.8" />
          <path d={`M${x} 7 Q${x + 5} 12 ${x + 10} 7`} strokeWidth="0.8" opacity="0.65" />
        </g>
      ))}
    </>
  ),
  chevron: (
    <>
      {[0, 20, 40, 60, 80, 100].map((x) => (
        <path key={x} d={`M${x} 12 L${x + 10} 3 L${x + 20} 12`} strokeWidth="0.9" />
      ))}
    </>
  ),
  dots: (
    <>
      <line x1="0" y1="7" x2="120" y2="7" strokeWidth="0.5" opacity="0.45" />
      {[8, 24, 40, 56, 72, 88, 104].map((x) => (
        <circle key={x} cx={x} cy="7" r="2.2" strokeWidth="0.9" />
      ))}
    </>
  ),
  wave: (
    <>
      <path
        d="M0 7 Q10 1 20 7 T40 7 T60 7 T80 7 T100 7 T120 7"
        strokeWidth="1"
      />
      <path
        d="M0 11 Q10 5 20 11 T40 11 T60 11 T80 11 T100 11 T120 11"
        strokeWidth="0.6"
        opacity="0.55"
      />
    </>
  ),
  starburst: (
    <>
      <line x1="0" y1="7" x2="120" y2="7" strokeWidth="0.6" opacity="0.5" />
      {[20, 60, 100].map((x) => (
        <g key={x}>
          <line x1={x - 6} y1="7" x2={x + 6} y2="7" strokeWidth="0.9" />
          <line x1={x} y1="1" x2={x} y2="13" strokeWidth="0.9" />
          <line x1={x - 4} y1="3" x2={x + 4} y2="11" strokeWidth="0.6" />
          <line x1={x - 4} y1="11" x2={x + 4} y2="3" strokeWidth="0.6" />
        </g>
      ))}
    </>
  ),
  lattice: (
    <>
      <line x1="0" y1="2" x2="120" y2="2" strokeWidth="0.6" />
      <line x1="0" y1="12" x2="120" y2="12" strokeWidth="0.6" />
      {[0, 12, 24, 36, 48, 60, 72, 84, 96, 108].map((x) => (
        <g key={x}>
          <line x1={x} y1="2" x2={x + 12} y2="12" strokeWidth="0.7" />
          <line x1={x + 12} y1="2" x2={x} y2="12" strokeWidth="0.7" />
        </g>
      ))}
    </>
  ),
};
