import type { ProductSummary } from './catalog';

export interface NavigationItem {
  readonly id: string;
  readonly title: string;
  readonly href: string;
  readonly icon: string;
}
export interface HeroSlide {
  readonly id: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly text: string;
  readonly primary: { label: string; href: string };
  readonly secondary: { label: string; href: string };
}
export interface Promotion {
  readonly id: string;
  readonly title: string;
  readonly text: string;
  readonly linkLabel: string;
  readonly href: string;
}
export interface HomePageContent {
  readonly heroSlides: readonly HeroSlide[];
  readonly categories: readonly NavigationItem[];
  readonly recommended: readonly ProductSummary[];
  readonly popular: readonly ProductSummary[];
  readonly newProducts: readonly ProductSummary[];
  readonly promotions: readonly Promotion[];
}
export interface ContentService {
  getInfoPage(slug: string): Promise<import('./info').InfoPage | null>;
  getHomePage(): Promise<HomePageContent>;
}
