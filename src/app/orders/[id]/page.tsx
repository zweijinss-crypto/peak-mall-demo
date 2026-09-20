import { notFound } from 'next/navigation';
import OrderDetailClient from './order-detail-client';
import { buildDemoOrders } from '@/lib/pay-fixtures';

/**
 * Server component: pre-render one static page per demo order id so the
 * static export gets /orders/{id}. User-placed orders (zustand cart) don't
 * have a known id at build time, so they fall through to the client-side
 * fallback in OrderDetailClient (mounted gate + zustand lookup).
 *
 * output:export requires generateStaticParams; combined with dynamicParams=false
 * this is the cleanest way to ship 404s instead of 500s for unknown ids.
 */
export function generateStaticParams() {
  return buildDemoOrders().map((o) => ({ id: o.id }));
}

export const dynamicParams = false;

export function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return params.then(({ id }) => {
    const o = buildDemoOrders().find((x) => x.id === id);
    if (!o) return { title: '订单不存在 · PEAK MALL' };
    return {
      title: `订单 ${o.id} · PEAK MALL`,
      description: `订单详情 · ${o.items.length} 件商品 · ${o.status}`,
    };
  });
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const demo = buildDemoOrders().find((o) => o.id === id);
  if (!demo) notFound();
  return <OrderDetailClient demoOrder={demo} />;
}