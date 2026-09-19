import { PRODUCTS } from '@/data/products';
import ShopDetailClient from './shop-detail-client';

/**
 * Server component: 预渲染 16 件商品的静态页
 * export 模式必须用 generateStaticParams
 */
export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ id: String(p.id) }));
}

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
  return <ShopDetailClient id={id} />;
}
