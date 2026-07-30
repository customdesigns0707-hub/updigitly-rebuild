import { ImageResponse } from 'next/og';

// Next.js App Router file convention: auto-generates the favicon / browser
// tab icon. Same orange "Up" tile as the nav/footer logo mark.
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          background: 'linear-gradient(135deg, #FF8A3D, #E8600E)',
          fontFamily: 'sans-serif',
          fontWeight: 700,
          fontSize: 15,
          letterSpacing: '-0.01em',
          color: '#fff',
        }}
      >
        Up
      </div>
    ),
    { ...size }
  );
}
