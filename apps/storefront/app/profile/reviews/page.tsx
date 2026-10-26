import { readAccountScenario } from '@/components/account/account-format';
import { ReviewsScreen } from '@/components/account/reviews-screen';

export const metadata = { title: 'Мої відгуки' };

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ preview?: string | string[] }> }) {
  return <ReviewsScreen scenario={readAccountScenario((await searchParams).preview)} />;
}
