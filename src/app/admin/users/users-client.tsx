'use client';

import { useT } from '@/lib/use-t';
import { PageBanner } from '@/components/peak-mall';
import { DataTable, Th, Td } from '@/components/admin/DataTable';
import { StatusBadge, type StatusKind } from '@/components/admin/StatusBadge';
import { useAdminStore } from '@/lib/admin/use-admin-store';
import { usd } from '@/lib/admin/fixtures';

const STATUS_KIND: Record<'active' | 'frozen', StatusKind> = {
  active: 'active',
  frozen: 'danger',
};

const ROLE_KIND: Record<'fx' | 'agent', StatusKind> = {
  fx: 'info',
  agent: 'paid',
};

export function UsersClient() {
  const t = useT();
  const [users, setUsers, mounted] = useAdminStore('users');

  if (!mounted) return <div className="text-neutral-500 text-[13px]">Loading…</div>;

  const toggle = (id: number) =>
    setUsers(
      users.map((u: any) =>
        u.id === id ? { ...u, status: u.status === 'active' ? 'frozen' : 'active' } : u
      )
    );

  const add = () => {
    const id = Math.max(0, ...users.map((u: any) => u.id)) + 1;
    setUsers([
      ...users,
      {
        id,
        nickname: '新用户',
        username: `user_${id}`,
        role: 'fx',
        referrer: '—',
        teamCount: 0,
        status: 'active',
        created_at: '2026-09-20',
        balance: 0,
      },
    ]);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <PageBanner title={t.admin.users.title} accent="emerald" />
        <button
          onClick={add}
          className="px-3.5 py-1.5 text-[12.5px] font-bold rounded-md bg-orange-700 hover:bg-orange-800 text-white transition-colors"
        >
          + {t.admin.users.add}
        </button>
      </div>
      <DataTable minWidth="920px">
        <thead>
          <tr>
            <Th>ID</Th>
            <Th>{t.admin.users.colRole}</Th>
            <Th>{t.admin.users.colReferrer}</Th>
            <Th>{t.admin.users.colTeam}</Th>
            <Th>{t.admin.users.colBal}</Th>
            <Th>{t.admin.users.colStatus}</Th>
            <Th>{t.admin.users.colReg}</Th>
            <Th>{t.admin.users.colTrc20}</Th>
            <Th>{t.admin.users.colAction}</Th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <Td colSpan={9} className="text-center text-neutral-500 py-6">
                {t.admin.users.empty}
              </Td>
            </tr>
          ) : (
            users.map((u: any) => (
              <tr key={u.id} className="hover:bg-neutral-50 transition-colors">
                <Td>{u.id}</Td>
                <Td>
                  {u.nickname} <span className="text-neutral-500 text-[12px]">@{u.username}</span>
                </Td>
                <Td>
                  <StatusBadge kind={ROLE_KIND[u.role as 'fx' | 'agent']}>
                    {u.role === 'agent' ? t.admin.users.colRoleAgent : t.admin.users.colRoleFx}
                  </StatusBadge>
                </Td>
                <Td>{u.referrer || '—'}</Td>
                <Td>{u.teamCount || 0}</Td>
                <Td className="font-bold tabular-nums">{usd(u.balance)}</Td>
                <Td>
                  <StatusBadge kind={STATUS_KIND[u.status as 'active' | 'frozen']}>
                    {u.status === 'active' ? t.admin.users.statusActive : t.admin.users.statusFrozen}
                  </StatusBadge>
                </Td>
                <Td muted>{u.created_at}</Td>
                <Td muted className="max-w-[160px] truncate text-[11.5px]">
                  {u.withdraw_address || '—'}
                </Td>
                <Td className="whitespace-nowrap">
                  <button
                    onClick={() => toggle(u.id)}
                    className="px-2 py-0.5 text-[11px] rounded border border-neutral-300 text-neutral-700 hover:bg-neutral-100 mr-1 transition-colors"
                  >
                    {u.status === 'active' ? t.admin.users.freeze : t.admin.users.unfreeze}
                  </button>
                  <button className="px-2 py-0.5 text-[11px] rounded border border-neutral-300 text-neutral-700 hover:bg-neutral-100 transition-colors">
                    {t.admin.users.resetPwd}
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
