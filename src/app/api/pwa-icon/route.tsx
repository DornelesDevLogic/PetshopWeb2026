import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

export function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const size      = Number(searchParams.get('size') ?? '512');
  const maskable  = searchParams.has('maskable');

  // Paw print usando círculos e elipses em SVG inline
  const pad      = maskable ? size * 0.15 : 0;          // safe zone maskable: 15%
  const inner    = size - pad * 2;
  const cx       = size / 2;
  const cy       = size / 2 + inner * 0.03;
  const r        = inner * 0.30;                        // palma principal
  const toe      = inner * 0.095;                       // dedinho raio
  const toeSmall = inner * 0.075;

  const bgRadius = maskable ? 0 : size * 0.22;

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: maskable
            ? 'linear-gradient(145deg, #1a2a4a 0%, #0d0f1a 100%)'
            : 'transparent',
          borderRadius: bgRadius,
        }}
      >
        <svg
          width={inner}
          height={inner}
          viewBox={`0 0 100 100`}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Fundo azul arredondado */}
          <rect
            x="4" y="4" width="92" height="92"
            rx="22" ry="22"
            fill="#2997ff"
          />
          {/* Reflexo especular */}
          <rect
            x="4" y="4" width="92" height="46"
            rx="22" ry="22"
            fill="rgba(255,255,255,0.10)"
          />
          {/* Dedos superiores */}
          <ellipse cx="30" cy="30" rx="8" ry="9.5" fill="white" opacity="0.95" />
          <ellipse cx="44" cy="24" rx="7.5" ry="9"  fill="white" opacity="0.95" />
          <ellipse cx="57" cy="24" rx="7.5" ry="9"  fill="white" opacity="0.95" />
          <ellipse cx="70" cy="30" rx="8"   ry="9.5" fill="white" opacity="0.95" />
          {/* Palma */}
          <ellipse cx="50" cy="62" rx="19" ry="15.5" fill="white" opacity="0.95" />
        </svg>
      </div>
    ),
    {
      width: size,
      height: size,
    },
  );
}
