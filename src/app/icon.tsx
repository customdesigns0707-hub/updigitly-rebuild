import { ImageResponse } from 'next/og';

// Next.js App Router file convention: auto-generates the favicon / browser
// tab icon. Same dark olive "Up" tile as the nav/footer logo mark.
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
          borderRadius: 6,
          background: '#5A5347',
          fontFamily: 'sans-serif',
          fontWeight: 700,
          fontSize: 20,
          letterSpacing: '-0.01em',
          color: '#D6EC3C',
        }}
      >
        Up
      </div>
    ),
    { ...size }
  );
}
