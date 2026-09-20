'use client';

import { useT } from '@/lib/use-t';
import { useAdminStore } from '@/lib/admin/use-admin-store';
import { usd } from '@/lib/admin/fixtures';

const STATUS_CLASS: Record<'active' | 'frozen', string> = {
  active: 'bg-emerald-100 text-emerald-700',
  frozen: 'bg-rose-100 text-rose-700',
};

export function UsersClient() {
  const t = useT();
  const [users, setUsers, mounted] = useAdminStore('users');

  if (!mounted) return <div className="text-neutral-500 text-[13px]">Loading…</div>;

  const toggle = (id: number) =>
    setUsers(users.map((u: any) => (u.id === id ? { ...u, status: u.status === 'active' ? 'frozen' : 'active' } : u)));
  const add = () => {
    const id = Math.max(0, ...users.map((u: any) => u.id)) + 1;
    setUsers([
      ...users,
      { id, nickname: '新用户', username: `user_${id}`, role: 'fx', referrer: '—', teamCount: 0, status: 'active', created_at: '2026-09-20', balance: 0 },
    ]);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h1 className="text-[20px] font-extrabold text-neutral-900">{t.admin.users.title}</h1>
        <button onClick={add} className="px-3 py-1.5 text-[12.5px] font-bold rounded-md bg-orange-700 text-white hover:bg-orange-700">
          + {t.admin.users.add}
        </button>
      </div>
      <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
        <table className="w-full text-[12.5px] min-w-[920px]">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">{t.admin.users.colRole}</th>
              <th className="px-3 py-2 text-left">{t.admin.users.colReferrer}</th>
              <th className="px-3 py-2 text-left">{t.admin.users.colTeam}</th>
              <th className="px-3 py-2 text-left">{t.admin.users.colBal}</th>
              <th className="px-3 py-2 text-left">{t.admin.users.colStatus}</th>
              <th className="px-3 py-2 text-left">{t.admin.users.colReg}</th>
              <th className="px-3 py-2 text-left">{t.admin.users.colTrc20}</th>
              <th className="px-3 py-2 text-left">{t.admin.users.colAction}</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={9} className="text-center text-neutral-500 py-6">{t.admin.users.empty}</td></tr>
            ) : (
              users.map((u: any) => (
                <tr key={u.id} className="border-t border-neutral-100">
                  <td className="px-3 py-2">{u.id}</td>
                  <td className="px-3 py-2">{u.nickname} <span className="text-neutral-700">@{u.username}</span></td>
                  <td className="px-3 py-2">{u.role === 'agent' ? t.admin.users.colRoleAgent : t.admin.users.colRoleFx}</td>
                  <td className="px-3 py-2">{u.referrer || '—'}</td>
                  <td className="px-3 py-2">{u.teamCount || 0}</td>
                  <td className="px-3 py-2 font-bold">{usd(u.balance)}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${STATUS_CLASS[u.status as 'active' | 'frozen']}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-neutral-500">{u.created_at}</td>
                  <td className="px-3 py-2 max-w-[160px] truncate text-[11px]">{u.withdraw_address || '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <button onClick={() => toggle(u.id)} className="px-2 py-0.5 text-[11px] rounded border border-neutral-300 text-neutral-700 hover:bg-neutral-50 mr-1">
                      {u.status === 'active' ? t.admin.users.freeze : t.admin.users.unfreeze}
                    </button>
                    <button className="px-2 py-0.5 text-[11px] rounded border border-neutral-300 text-neutral-700 hover:bg-neutral-50">
                      {t.admin.users.resetPwd}
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