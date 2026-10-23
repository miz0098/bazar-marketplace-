'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { HeroSlide } from '@/services/contracts/content';

export function Hero({ slides }: { slides: readonly HeroSlide[] }) {
  const [active, setActive] = useState(0);
  const slide = slides[active] ?? slides[0];
  if (!slide) return null;

  const change = (direction: number) => setActive((active + direction + slides.length) % slides.length);

  return (
    <section className="hero"><div className="container"><div className="hero-card">
      <div className="hero-content"><p>{slide.eyebrow}</p><h1>{slide.title}</h1><div>{slide.text}</div><nav><Link className="button button--light" href={slide.primary.href}>{slide.primary.label}</Link><Link className="button button--ghost" href={slide.secondary.href}>{slide.secondary.label}</Link></nav></div>
      <div className="hero-art" aria-hidden="true"><span className="hero-art__bag" /><span className="hero-art__box" /><span className="hero-art__card" /><span className="hero-art__spark" /></div>
      <div className="hero-controls"><button type="button" onClick={() => change(-1)} aria-label="Попередній слайд">‹</button><div>{slides.map((item, index) => <button className={index === active ? 'is-active' : ''} type="button" aria-label={`Показати слайд ${index + 1}`} aria-current={index === active} onClick={() => setActive(index)} key={item.id} />)}</div><button type="button" onClick={() => change(1)} aria-label="Наступний слайд">›</button></div>
    </div></div></section>
  );
}
