import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
        <svg width="32" height="32" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="92" height="92" rx="22" ry="22" fill="#2997ff" />
          <ellipse cx="30" cy="30" rx="8"   ry="9.5" fill="white" opacity="0.95" />
          <ellipse cx="44" cy="24" rx="7.5" ry="9"   fill="white" opacity="0.95" />
          <ellipse cx="57" cy="24" rx="7.5" ry="9"   fill="white" opacity="0.95" />
          <ellipse cx="70" cy="30" rx="8"   ry="9.5" fill="white" opacity="0.95" />
          <ellipse cx="50" cy="62" rx="19"  ry="15.5" fill="white" opacity="0.95" />
        </svg>
      </div>
    ),
    { width: 32, height: 32 },
  );
}
