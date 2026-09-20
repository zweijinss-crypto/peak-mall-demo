'use client';

import { useT } from '@/lib/use-t';
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
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h1 className="text-[20px] font-extrabold text-neutral-900">
          {t.admin.products.title}
          {t.admin.products.count(products.length)}
        </h1>
        <button onClick={add} className="px-3 py-1.5 text-[12.5px] font-bold rounded-md bg-orange-600 text-white hover:bg-orange-700">
          + {t.admin.products.add}
        </button>
      </div>
      <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
        <table className="w-full text-[12.5px] min-w-[760px]">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">{t.admin.products.colImg}</th>
              <th className="px-3 py-2 text-left">{t.admin.products.colName}</th>
              <th className="px-3 py-2 text-left">{t.admin.products.colCat}</th>
              <th className="px-3 py-2 text-left">{t.admin.products.colPrice}</th>
              <th className="px-3 py-2 text-left">{t.admin.products.colStock}</th>
              <th className="px-3 py-2 text-left">{t.admin.products.colDesc}</th>
              <th className="px-3 py-2 text-left">{t.admin.products.colStatus}</th>
              <th className="px-3 py-2 text-left">{t.admin.products.colAction}</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr><td colSpan={9} className="text-center text-neutral-500 py-6">{t.admin.products.empty}</td></tr>
            ) : (
              products.map((p: any) => (
                <tr key={p.id} className="border-t border-neutral-100">
                  <td className="px-3 py-2">{p.id}</td>
                  <td className="px-3 py-2 text-[18px]">{p.cover}</td>
                  <td className="px-3 py-2"><input id={`pn_${p.id}`} defaultValue={p.name} className="border border-neutral-200 rounded px-1.5 py-1 w-[140px]" /></td>
                  <td className="px-3 py-2"><input id={`pc_${p.id}`} defaultValue={p.category} className="border border-neutral-200 rounded px-1.5 py-1 w-[80px]" /></td>
                  <td className="px-3 py-2"><input id={`pp_${p.id}`} defaultValue={p.price} className="border border-neutral-200 rounded px-1.5 py-1 w-[70px]" /></td>
                  <td className="px-3 py-2"><input id={`ps_${p.id}`} defaultValue={p.stock} className="border border-neutral-200 rounded px-1.5 py-1 w-[60px]" /></td>
                  <td className="px-3 py-2"><input id={`pd_${p.id}`} defaultValue={p.description} className="border border-neutral-200 rounded px-1.5 py-1 w-[150px]" /></td>
                  <td className="px-3 py-2">
                    {p.status ? (
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700">{t.admin.products.on}</span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-neutral-200 text-neutral-600">{t.admin.products.off}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <button onClick={() => save(p.id)} className="px-2 py-0.5 text-[11px] rounded bg-emerald-600 text-white hover:bg-emerald-700 mr-1">{t.admin.products.save}</button>
                    <button onClick={() => toggle(p.id, p.status)} className="px-2 py-0.5 text-[11px] rounded border border-neutral-300 text-neutral-700 hover:bg-neutral-50">
                      {p.status ? t.admin.products.off : t.admin.products.on}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}