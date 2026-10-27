import Link from 'next/link';
import { Hero } from '@/components/home/hero';
import { ProductCard } from '@/components/product/product-card';
import { getContentService } from '@/services/service-provider.server';

export default async function HomePage() {
  const service = getContentService();
  const home = await service.getHomePage();

  return (
    <>
      <Hero slides={home.heroSlides} />

      <section className="home-section" id="categories">
        <div className="container">
          <SectionHeading eyebrow="Категорії" title="Популярні категорії" />
          <div className="category-grid">
            {home.categories.map((category) => (
              <Link className="category-card" href={category.href} key={category.id}>
                <span className="category-card__icon" aria-hidden="true">{category.icon}</span>
                <span>{category.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <ProductRail eyebrow="Рекомендації" title="Рекомендовано для вас" products={home.recommended} soft />

      <section className="home-section">
        <div className="container">
          <SectionHeading eyebrow="Промо" title="Актуальні пропозиції" />
          <div className="promo-grid">
            {home.promotions.map((promotion, index) => (
              <article className={`promo-card ${index === 0 ? 'promo-card--blue' : 'promo-card--soft'}`} key={promotion.id}>
                <div>
                  <h3>{promotion.title}</h3>
                  <p>{promotion.text}</p>
                  <Link className="button promo-card__link" href={promotion.href}>{promotion.linkLabel}</Link>
                </div>
                <div className="promo-art" aria-hidden="true"><span /><span /><span /></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <ProductRail eyebrow="Популярне" title="Популярні товари" products={home.popular} />
      <ProductRail id="new-products" eyebrow="Новинки" title="Нові товари" products={home.newProducts} soft />
    </>
  );
}

function ProductRail({ id, eyebrow, title, products, soft = false }: {
  id?: string;
  eyebrow: string;
  title: string;
  products: Awaited<ReturnType<ReturnType<typeof getContentService>['getHomePage']>>['popular'];
  soft?: boolean;
}) {
  return (
    <section className={`home-section${soft ? ' home-section--soft' : ''}`} id={id}>
      <div className="container">
        <div className="section-heading section-heading--row">
          <div><p>{eyebrow}</p><h2>{title}</h2></div>
          <Link className="button button--secondary" href="/catalog">Дивитися всі</Link>
        </div>
        <div className="product-grid">{products.map((product) => <ProductCard key={product.offerId??product.id} product={product} />)}</div>
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <div className="section-heading"><p>{eyebrow}</p><h2>{title}</h2></div>;
}
