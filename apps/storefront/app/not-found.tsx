import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container not-found">
      <span className="not-found__code">404</span>
      <h1>Сторінку не знайдено</h1>
      <p>Можливо, посилання застаріло або сторінка ще не перенесена до нової вітрини.</p>
      <Link className="button" href="/">Повернутися на головну</Link>
    </div>
  );
}
