import Form from 'next/form';
import Link from 'next/link';
import { ProductCard } from '@/components/product/product-card';
import { parsePositiveInteger, parseProductSort } from '@/domain/catalog/query';
import { getCatalogService } from '@/services/service-provider.server';

export const metadata = { title: 'Каталог' };
type Params = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const query = one(params.q) ?? '';
  const category = one(params.category) ?? '';
  const requestedSubcategory = one(params.subcategory) ?? '';
  const categoryList = await getCatalogService().getCategories();
  const subcategory = categoryList
    .find((c) => c.id === category)
    ?.subcategories.includes(requestedSubcategory)
    ? requestedSubcategory
    : '';
  const minRaw = one(params.minPrice) ?? '',
    maxRaw = one(params.maxPrice) ?? '';
  const validPrice = (v: string) =>
    v === '' ||
    (/^\d{1,9}(?:[.,]\d{1,2})?$/.test(v) &&
      Number.isSafeInteger(Math.round(Number(v.replace(',', '.')) * 100)));
  const minPrice = minRaw
      ? Math.round(Number(minRaw.replace(',', '.')) * 100)
      : undefined,
    maxPrice = maxRaw
      ? Math.round(Number(maxRaw.replace(',', '.')) * 100)
      : undefined;
  const priceError =
    !validPrice(minRaw) ||
    !validPrice(maxRaw) ||
    (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice);
  const preview = one(params.preview);
  const vendor = one(params.vendor) ?? '';
  const sort = parseProductSort(one(params.sort));
  const page = parsePositiveInteger(one(params.page), 1);
  const service = getCatalogService();
  const [result, categories, all] = await Promise.all([
    service.listProducts({
      query,
      category,
      subcategory,
      vendor,
      minPrice: priceError ? undefined : minPrice,
      maxPrice: priceError ? undefined : maxPrice,
      sort,
      page,
      limit: 8,
    }),
    service.getCategories(),
    service.listProducts({ limit: 24 }),
  ]);
  const selectedCategory = categories.find((item) => item.id === category);
  const vendors = [...new Set(all.items.map((item) => item.vendor))].sort(
    (a, b) => a.localeCompare(b, 'uk'),
  );
  const base = new URLSearchParams();
  if (query) base.set('q', query);
  if (category) base.set('category', category);
  if (subcategory) base.set('subcategory', subcategory);
  if (vendor) base.set('vendor', vendor);
  if (minRaw) base.set('minPrice', minRaw);
  if (maxRaw) base.set('maxPrice', maxRaw);
  if (sort !== 'featured') base.set('sort', sort);

  return (
    <div className="container catalog-page">
      <nav className="breadcrumbs" aria-label="Навігаційний шлях">
        <Link href="/">Головна</Link>
        <span>/</span>
        <span>Каталог</span>
      </nav>
      <header className="catalog-heading">
        <div>
          <p className="eyebrow">Каталог</p>
          <h1>{selectedCategory?.title ?? 'Товари BAZAR'}</h1>
          <p>
            Демонстраційний каталог працює без Shopify. Ціни та наявність не є
            комерційною пропозицією.
          </p>
        </div>
        <strong>
          {preview === 'empty' || preview === 'error' || priceError
            ? 0
            : result.total}{' '}
          товарів
        </strong>
      </header>

      <div className="catalog-layout">
        <aside className="catalog-filters" aria-label="Фільтри каталогу">
          <Form key={'filters' + base.toString()} action="/catalog">
            {query && <input type="hidden" name="q" value={query} />}
            <fieldset>
              <legend>Категорія</legend>
              <label>
                <input
                  type="radio"
                  name="category"
                  value=""
                  defaultChecked={!category}
                />{' '}
                Усі категорії
              </label>
              {categories.map((item) => (
                <label key={item.id}>
                  <input
                    type="radio"
                    name="category"
                    value={item.id}
                    defaultChecked={category === item.id}
                  />{' '}
                  {item.title}
                </label>
              ))}
            </fieldset>
            {selectedCategory && (
              <fieldset>
                <legend>Підкатегорія</legend>
                <label>
                  <input
                    type="radio"
                    name="subcategory"
                    value=""
                    defaultChecked={!subcategory}
                  />{' '}
                  Усі
                </label>
                {selectedCategory.subcategories.map((item) => (
                  <label key={item}>
                    <input
                      type="radio"
                      name="subcategory"
                      value={item}
                      defaultChecked={subcategory === item}
                    />{' '}
                    {item}
                  </label>
                ))}
              </fieldset>
            )}
            <fieldset>
              <legend>Бренд</legend>
              <select aria-label="Бренд" name="vendor" defaultValue={vendor}>
                <option value="">Усі бренди</option>
                {vendors.map((item) => (
                  <option value={item} key={item}>
                    {item}
                  </option>
                ))}
              </select>
            </fieldset>
            <fieldset>
              <legend>Ціна, грн</legend>
              <label htmlFor="minPrice">
                Від
                <input
                  id="minPrice"
                  name="minPrice"
                  inputMode="decimal"
                  defaultValue={minRaw}
                />
              </label>
              <label htmlFor="maxPrice">
                До
                <input
                  id="maxPrice"
                  name="maxPrice"
                  inputMode="decimal"
                  defaultValue={maxRaw}
                />
              </label>
            </fieldset>
            <input type="hidden" name="sort" value={sort} />
            <div className="filter-actions">
              <button className="button" type="submit">
                Застосувати
              </button>
              <Link href="/catalog">Скинути</Link>
            </div>
          </Form>
        </aside>

        <section className="catalog-results" aria-label="Список товарів">
          <Form
            key={'sort' + base.toString()}
            className="catalog-toolbar"
            action="/catalog"
          >
            {query && <input type="hidden" name="q" value={query} />}
            {category && (
              <input type="hidden" name="category" value={category} />
            )}
            {subcategory && (
              <input type="hidden" name="subcategory" value={subcategory} />
            )}
            {vendor && <input type="hidden" name="vendor" value={vendor} />}
            {minRaw && (
              <input type="hidden" name="minPrice" value={minRaw} />
            )}{' '}
            {maxRaw && <input type="hidden" name="maxPrice" value={maxRaw} />}
            <label htmlFor="catalog-sort">Сортування</label>
            <select id="catalog-sort" name="sort" defaultValue={sort}>
              <option value="featured">Рекомендовані</option>
              <option value="price-asc">Від дешевих</option>
              <option value="price-desc">Від дорогих</option>
              <option value="name">За назвою</option>
            </select>
            <button type="submit">ОК</button>
          </Form>
          {(query || category || subcategory || vendor) && (
            <div className="active-filters">
              <span>Активні фільтри:</span>
              {query && <span>«{query}»</span>}
              {selectedCategory && <span>{selectedCategory.title}</span>}
              {subcategory && <span>{subcategory}</span>}
              {vendor && <span>{vendor}</span>}
              <Link href="/catalog">Очистити</Link>
            </div>
          )}
          {preview === 'error' ? (
            <div className="empty-state" role="alert">
              <h2>Не вдалося завантажити демо-каталог</h2>
              <p>Демонстраційний стан помилки. Реальні API не викликаються.</p>
              <Link className="button" href={`/catalog?${base}`}>
                Спробувати ще раз
              </Link>
            </div>
          ) : priceError ? (
            <div className="empty-state" role="alert">
              <h2>Перевірте діапазон ціни</h2>
              <p>
                Вкажіть невід’ємні суми до двох десяткових знаків; ціна «Від» не
                може перевищувати «До».
              </p>
              <Link href="/catalog">Очистити фільтри</Link>
            </div>
          ) : result.items.length && preview !== 'empty' ? (
            <div className="product-grid">
              {result.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span aria-hidden="true">⌕</span>
              <h2>Товарів не знайдено</h2>
              <p>Спробуйте змінити фільтри або очистити пошук.</p>
              <Link className="button" href="/catalog">
                Очистити фільтри
              </Link>
            </div>
          )}
          {!priceError &&
            preview !== 'empty' &&
            preview !== 'error' &&
            result.pageCount > 1 && (
              <nav className="pagination" aria-label="Сторінки каталогу">
                {Array.from({ length: result.pageCount }, (_, index) => {
                  const number = index + 1;
                  const href = new URLSearchParams(base);
                  href.set('page', String(number));
                  return (
                    <Link
                      className={number === result.page ? 'is-active' : ''}
                      aria-current={number === result.page ? 'page' : undefined}
                      href={`/catalog?${href}`}
                      key={number}
                    >
                      {number}
                    </Link>
                  );
                })}
              </nav>
            )}
        </section>
      </div>
    </div>
  );
}
