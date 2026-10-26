import { redirect, notFound } from 'next/navigation';
import { getCatalogService } from '@/services/service-provider.server';
export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { handle } = await params,
    categories = await getCatalogService().getCategories();
  if (handle !== 'all' && !categories.some((c) => c.id === handle)) notFound();
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams))
    if (
      [
        'q',
        'subcategory',
        'vendor',
        'minPrice',
        'maxPrice',
        'sort',
        'page',
      ].includes(key) &&
      typeof value === 'string'
    )
      query.set(key, value);
  if (handle !== 'all') query.set('category', handle);
  redirect('/catalog' + (query.size ? '?' + query : ''));
}
