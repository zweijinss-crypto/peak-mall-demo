import { redirect } from 'next/navigation';
import { PRODUCTS } from '@/data/products';

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ id: String(p.id) }));
}

export const dynamicParams = false;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/en/shop/${id}`);
}