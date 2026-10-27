import Link from 'next/link';

export function Logo() {
  return (
    <Link className="logo" href="/" aria-label="B BAZAR — головна">
      <svg viewBox="0 0 246 72" aria-hidden="true">
        <g transform="translate(12.3 3.6) scale(.9)">
          <path d="M22 21v-6C22 7.3 28.3 1 36 1s14 6.3 14 14v6" fill="none" stroke="#2563ff" strokeLinecap="round" strokeWidth="8" />
          <path d="M12.4 22h47.2c4.1 0 7.5 3.1 7.9 7.2l3.5 33.9c.5 4.7-3.2 8.9-7.9 8.9H8.9C4.2 72 .5 67.8 1 63.1L4.5 29.2C4.9 25.1 8.3 22 12.4 22Z" fill="#2563ff" />
          <text x="36" y="48" fill="#fff" dominantBaseline="middle" fontFamily="Inter,Arial,sans-serif" fontSize="38" fontWeight="900" textAnchor="middle">{'B '}</text>
          <text x="91" y="50" fill="#07143b" dominantBaseline="middle" fontFamily="Inter,Arial,sans-serif" fontSize="48" fontWeight="900" letterSpacing="2">BAZAR</text>
        </g>
      </svg>
    </Link>
  );
}
