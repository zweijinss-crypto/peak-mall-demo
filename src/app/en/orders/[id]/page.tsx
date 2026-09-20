import { notFound } from 'next/navigation';
import OrderDetailClient from '../../../orders/[id]/order-detail-client';
import { buildDemoOrders } from '@/lib/pay-fixtures';

/**
 * EN mirror — same generateStaticParams as the zh page so /en/orders/{id}
 * pre-renders one static file per demo order id.
 */
export function generateStaticParams() {
  return buildDemoOrders().map((o) => ({ id: o.id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = buildDemoOrders().find((x) => x.id === id);
  if (!o) return { title: 'Order not found · PEAK MALL' };
  return {
    title: `Order ${o.id} · PEAK MALL`,
    description: `Order details · ${o.items.length} items · ${o.status}`,
  };
}

export default async function EnOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const demo = buildDemoOrders().find((o) => o.id === id);
  if (!demo) notFound();
  return <OrderDetailClient demoOrder={demo} />;
}