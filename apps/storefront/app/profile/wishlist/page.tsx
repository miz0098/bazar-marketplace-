import { readAccountScenario } from '@/components/account/account-format';
import { WishlistScreen } from '@/components/account/wishlist-screen';

export const metadata = { title: 'Обране' };

export default async function WishlistPage({ searchParams }: { searchParams: Promise<{ preview?: string | string[] }> }) {
  return <WishlistScreen scenario={readAccountScenario((await searchParams).preview)} />;
}
