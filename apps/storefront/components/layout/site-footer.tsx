import { SocialIcon } from './social-icon';
import Link from 'next/link';
import { Logo } from '@/components/brand/logo';

const groups = [
  [
    'Покупцям',
    [
      ['Як замовити', '/help/how-to-order'],
      ['Доставка і оплата', '/help/delivery'],
      ['Повернення товару', '/help/returns'],
    ],
  ],
  [
    'BAZAR',
    [
      ['Про нас', '/about'],
      ['Контакти', '/contacts'],
      ['Вакансії', '/careers'],
    ],
  ],
  [
    'Акаунт',
    [
      ['Профіль', '/profile'],
      ['Мої замовлення', '/profile/orders'],
      ['Обране', '/profile/wishlist'],
    ],
  ],
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Logo />
          <p>
            © 2026 BAZAR
            <br />
            Маркетплейс щоденних покупок
          </p>
          <nav className="footer-socials" aria-label="Соціальні мережі">
            {[
              ['Facebook', 'https://www.facebook.com/'],
              ['Instagram', 'https://www.instagram.com/'],
              ['Threads', 'https://www.threads.net/'],
              ['Telegram', 'https://telegram.org/'],
            ].map(([name, href]) => (
              <a
                href={href}
                key={name}
                aria-label={name}
                target="_blank"
                rel="noopener noreferrer"
              >
                <SocialIcon name={name} />
              </a>
            ))}
          </nav>
          <small>
            Посилання на платформи; офіційні сторінки BAZAR ще не погоджено.
          </small>
        </div>
        <div className="footer-links">
          {groups.map(([title, links]) => (
            <section key={title}>
              <h2>{title}</h2>
              <ul>
                {links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href}>{label}</Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <address>
            <h2>Підтримка</h2>
            <p>Щодня з 9:00 до 21:00</p>
            <span>support@example.invalid</span>
            <small>Демонстраційна адреса</small>
          </address>
        </div>
      </div>
    </footer>
  );
}
