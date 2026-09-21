'use client';
import { DataTable, Th, Td } from '@/components/admin/DataTable';
import { StatusBadge, type StatusKind } from '@/components/admin/StatusBadge';

import { useT } from '@/lib/use-t';
import { PageBanner } from '@/components/peak-mall';
import { useAdminStore } from '@/lib/admin/use-admin-store';

export function ProductsClient() {
  const t = useT();
  const [products, setProducts, mounted] = useAdminStore('products');

  if (!mounted) return <div className="text-neutral-500 text-[13px]">Loading…</div>;

  const toggle = (id: number, currentStatus: boolean) => {
    setProducts(products.map((p: any) => (p.id === id ? { ...p, status: !currentStatus } : p)));
  };
  const save = (id: number) => {
    const name = (document.getElementById(`pn_${id}`) as HTMLInputElement)?.value;
    const cat = (document.getElementById(`pc_${id}`) as HTMLInputElement)?.value;
    const price = Number((document.getElementById(`pp_${id}`) as HTMLInputElement)?.value);
    const stock = Number((document.getElementById(`ps_${id}`) as HTMLInputElement)?.value);
    const desc = (document.getElementById(`pd_${id}`) as HTMLInputElement)?.value;
    setProducts(products.map((p: any) => (p.id === id ? { ...p, name, category: cat, price, stock, description: desc } : p)));
  };
  const add = () => {
    const id = Math.max(0, ...products.map((p: any) => p.id)) + 1;
    setProducts([
      ...products,
      { id, name: '新商品', category: '数码电子', price: 0, stock: 0, description: '', cover: '📦', status: true },
    ]);
  };

  return (
    <div>
      <PageBanner
        title={t.admin.products.title}
        accent="emerald"
        trailing={
          <button
            onClick={add}
            className="px-3 py-1.5 text-[12.5px] font-bold rounded-md bg-orange-700 text-white hover:bg-orange-700"
          >
            + {t.admin.products.add}
          </button>
        }
      />
      <div className="mb-2 text-[12px] text-neutral-500">
        {t.admin.products.count(products.length)}
      </div>
      <DataTable minWidth="720px">
          <thead>
            <tr>
              <Th>ID</Th>
              <Th>{t.admin.products.colImg}</Th>
              <Th>{t.admin.products.colName}</Th>
              <Th>{t.admin.products.colCat}</Th>
              <Th>{t.admin.products.colPrice}</Th>
              <Th>{t.admin.products.colStock}</Th>
              <Th>{t.admin.products.colDesc}</Th>
              <Th>{t.admin.products.colStatus}</Th>
              <Th>{t.admin.products.colAction}</Th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr><Td colSpan={9} className="text-center text-neutral-500 py-6">{t.admin.products.empty}</Td></tr>
            ) : (
              products.map((p: any) => (
                <tr key={p.id} className="hover:bg-neutral-50 transition-colors">
                  <Td>{p.id}</Td>
                  <Td className="text-[18px]">{p.cover}</Td>
                  <Td><input id={`pn_${p.id}`} aria-label={`${t.admin.products.colName} ${p.name}`} defaultValue={p.name} className="border border-neutral-200 rounded px-1.5 py-1 w-[140px]" /></Td>
                  <Td><input id={`pc_${p.id}`} aria-label={`${t.admin.products.colCat} ${p.name}`} defaultValue={p.category} className="border border-neutral-200 rounded px-1.5 py-1 w-[80px]" /></Td>
                  <Td><input id={`pp_${p.id}`} aria-label={`${t.admin.products.colPrice} ${p.name}`} defaultValue={p.price} className="border border-neutral-200 rounded px-1.5 py-1 w-[70px]" /></Td>
                  <Td><input id={`ps_${p.id}`} aria-label={`${t.admin.products.colStock} ${p.name}`} defaultValue={p.stock} className="border border-neutral-200 rounded px-1.5 py-1 w-[60px]" /></Td>
                  <Td><input id={`pd_${p.id}`} aria-label={`${t.admin.products.colDesc} ${p.name}`} defaultValue={p.description} className="border border-neutral-200 rounded px-1.5 py-1 w-[150px]" /></Td>
                  <Td>
                    {p.status ? (
                      <StatusBadge kind="paid">{t.admin.products.on}</StatusBadge>
                    ) : (
                      <StatusBadge kind="mute">{t.admin.products.off}</StatusBadge>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap">
                    <button onClick={() => save(p.id)} className="px-2 py-0.5 text-[11px] rounded bg-emerald-700 text-white hover:bg-emerald-700 mr-1">{t.admin.products.save}</button>
                    <button onClick={() => toggle(p.id, p.status)} className="px-2 py-0.5 text-[11px] rounded border border-neutral-300 text-neutral-700 hover:bg-neutral-50">
                      {p.status ? t.admin.products.off : t.admin.products.on}
                    </button>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </DataTable>
    </div>
  );
}