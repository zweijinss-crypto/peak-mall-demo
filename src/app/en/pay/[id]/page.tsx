import { redirect } from 'next/navigation';

export function generateStaticParams() {
  return [{ id: 'any' }];
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect('/en/checkout');
}