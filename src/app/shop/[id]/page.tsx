import { PRODUCTS } from '@/data/products';
import ShopDetailClient from './shop-detail-client';
import { isKnownProductId } from '@/data/product-lookup';
import { notFound } from 'next/navigation';

/**
 * Server component: 预渲染 16 件商品的静态页
 * export 模式必须用 generateStaticParams
 */
export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ id: String(p.id) }));
}

/**
 * static-only: any id not in PRODUCTS goes to 404 (cleaner than 500 from
 * output:export). Combined with dynamicParams=false below, this is the only
 * way to surface a real 404 in a fully-static build.
 */
export const dynamicParams = false;

export function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return params.then(({ id }) => {
    const p = PRODUCTS.find((x) => x.id === Number(id));
    if (!p) return { title: '商品不存在 · PEAK MALL' };
    return {
      title: `${p.name} · PEAK MALL`,
      description: p.description?.slice(0, 120) || `${p.name} · 顶峰商城`,
    };
  });
}

export default async function ShopDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isKnownProductId(id)) notFound();
  return <ShopDetailClient id={id} />;
}
