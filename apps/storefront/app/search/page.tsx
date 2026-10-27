import Form from 'next/form';
import Link from 'next/link';
import { ProductCard } from '@/components/product/product-card';
import { parsePositiveInteger, parseProductSort } from '@/domain/catalog/query';
import { getCatalogService } from '@/services/service-provider.server';

export const metadata = { title: 'Пошук' };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    sort?: string | string[];
    category?: string | string[];
    page?: string | string[];
    limit?: string | string[];
    available?: string | string[];
    vendor?:string|string[];
  }>;
}) {
  const raw = await searchParams;
  const one = (v: string | string[] | undefined) =>
    Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
  const q = one(raw.q),
    rawSort = one(raw.sort),
    category = one(raw.category);
  const query = q.trim();
  const sort = parseProductSort(rawSort);
  const service = getCatalogService();
  const [result, categories] = await Promise.all([
    service.listProducts({ query, sort, category, page:parsePositiveInteger(one(raw.page),1), available:one(raw.available)==="true"?true:one(raw.available)==="false"?false:undefined, vendor:one(raw.vendor),limit:Math.min(24,parsePositiveInteger(one(raw.limit),8)) }),
    service.getCategories(),
  ]);

  return (
    <div className="container search-page">
      <p className="eyebrow">Пошук</p>
      <h1>
        {query ? `Результати для «${query}»` : 'Знайдіть потрібний товар'}
      </h1>
      <Form className="search-page__form" action="/search" role="search" aria-label="Пошук на сторінці результатів">
        <label className="sr-only" htmlFor="search-page-input">
          Пошук товарів
        </label>
        <input
          id="search-page-input"
          name="q"
          defaultValue={query}
          placeholder="Назва товару або бренд"
          autoFocus={!query}
        />
        <button className="button" type="submit">
          Знайти
        </button>
        {query && <Link href="/search">Очистити</Link>}
      </Form>
      {query && (
        <div className="search-page__toolbar">
          <p>
            Знайдено: <strong>{result.total}</strong>
          </p>
          <Form action="/search">
            <input type="hidden" name="q" value={query} />
            {["limit","available","vendor"].map(k=>one(raw[k as keyof typeof raw])?<input key={k} type="hidden" name={k} value={one(raw[k as keyof typeof raw])}/>:null)}
            <label>
              Категорія{' '}
              <select name="category" defaultValue={category}>
                <option value="">Усі</option>
                {categories.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Сортування{' '}
              <select name="sort" defaultValue={sort}>
                <option value="featured">Рекомендовані</option>
                <option value="price-asc">Від дешевих</option>
                <option value="price-desc">Від дорогих</option>
                <option value="name">За назвою</option>
              </select>
            </label>
            <button type="submit">Оновити</button>
          </Form>
        </div>
      )}
      {query&&<Link href={`/catalog?${new URLSearchParams({q:query,category:category??"",sort})}`}>Усі фільтри</Link>}
      {!query ? (
        <div className="empty-state empty-state--compact">
          <span aria-hidden="true">⌕</span>
          <h2>Почніть із пошукового запиту</h2>
          <p>
            Введіть щонайменше два символи — у шапці також зʼявляться підказки.
          </p>
        </div>
      ) : result.items.length ? (
        <div className="product-grid">
          {result.items.map((product) => (
            <ProductCard product={product} key={product.offerId??product.id} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span aria-hidden="true">⌕</span>
          <h2>Нічого не знайдено</h2>
          <p>Перевірте написання або спробуйте загальніший запит.</p>
          <Link className="button" href="/catalog">
            Перейти до каталогу
          </Link>
        </div>
      )}
      {query&&result.pageCount>1&&<nav className="pagination" aria-label="Сторінки результатів">{Array.from({length:result.pageCount},(_,i)=>{const p=new URLSearchParams();for(const [k,v] of Object.entries(raw)){const x=one(v);if(x&&k!=="page")p.set(k,x);}p.set("page",String(i+1));return <Link key={i} href={`/search?${p}`} aria-current={result.page===i+1?"page":undefined}>{i+1}</Link>;})}</nav>}
    </div>
  );
}
