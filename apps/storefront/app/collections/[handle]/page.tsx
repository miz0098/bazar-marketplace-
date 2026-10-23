import { redirect } from 'next/navigation';
import { getCatalogService } from '@/services/service-provider.server';

export default async function CollectionPage({ params }: { params: Promise<{ handle: string }> }) {
  const handle = (await params).handle;
  const categories = await getCatalogService().getCategories();
  const category = categories.find((item) => item.id === handle);
  redirect(category ? `/catalog?category=${category.id}` : '/catalog');
}
