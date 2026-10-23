import Link from 'next/link';

export const metadata = { title: 'Пошук' };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  return (
    <div className="container page-shell page-shell--center">
      <p className="eyebrow">Пошук</p>
      <h1>{q ? `Результати для «${q}»` : 'Знайдіть потрібний товар'}</h1>
      <p className="page-intro">Пошук буде підключено до каталогу в наступній фазі. Зараз форма перевіряє навігаційний сценарій.</p>
      <Link className="button" href="/catalog">Перейти до каталогу</Link>
    </div>
  );
}
