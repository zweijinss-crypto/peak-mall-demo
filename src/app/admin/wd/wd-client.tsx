'use client';

import { useState, useEffect } from 'react';
import { DataTable, Th, Td } from '@/components/admin/DataTable';
import { StatusBadge, type StatusKind } from '@/components/admin/StatusBadge';

import { useT } from '@/lib/use-t';
import { PageBanner } from '@/components/peak-mall';
import { useAdminStore } from '@/lib/admin/use-admin-store';
import { usd, wdStatusLabel, type WdStatus } from '@/lib/admin/fixtures';
import { Modal } from '@/components/admin/Modal';

const STATUS_KIND: Record<WdStatus, StatusKind> = {
  pending: 'pending',
  approved: 'info',
  paid: 'active',
  rejected: 'danger',
};

/**
 * WdClient — admin withdrawal review table.
 *
 * Three actions live here:
 *   - approve: pending → approved (with confirm modal showing net payout + fee)
 *   - reject:  pending → rejected (modal with required reason textarea)
 *   - markPaid: approved → paid (confirms + deducts user balance)
 *
 * Why a modal instead of window.prompt: prompt can't be styled, isn't
 * keyboard-friendly (no Esc), and on mobile it breaks. It also doesn't
 * let us show context (amount + fee + bound address) before the user
 * commits.
 */
export function WdClient() {
  const t = useT();
  const [wd, setWd, mounted, isEn] = useAdminStore('wd');
  const [users, setUsers] = useAdminStore('users');

  // Modal state — one at a time so the focus trap is straightforward.
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [reasonError, setReasonError] = useState(false);

  if (!mounted) return <div className="text-neutral-500 text-[13px]">Loading…</div>;

  const locale = isEn ? 'en' : 'zh';
  const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

  const approve = (id: number) => setApprovingId(id);
  const reject = (id: number) => {
    setRejectingId(id);
    setRejectReason('');
    setReasonError(false);
  };
  const markPaid = (id: number) => setPayingId(id);

  const handleConfirmApprove = () => {
    if (approvingId === null) return;
    setWd(
      wd.map((w: any) =>
        w.id === approvingId
          ? { ...w, status: 'approved' as const, processed_at: now() }
          : w,
      ),
    );
    setApprovingId(null);
  };

  const handleConfirmReject = () => {
    if (rejectingId === null) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setReasonError(true);
      return;
    }
    setWd(
      wd.map((w: any) =>
        w.id === rejectingId
          ? { ...w, status: 'rejected' as const, reject_reason: reason, processed_at: now() }
          : w,
      ),
    );
    setRejectingId(null);
    setRejectReason('');
    setReasonError(false);
  };

  const handleConfirmPay = () => {
    if (payingId === null) return;
    const target = wd.find((w: any) => w.id === payingId);
    if (!target) {
      setPayingId(null);
      return;
    }
    // Deduct from the matching user balance (match by username).
    const updatedUsers = users.map((u: any) =>
      u.username === target.username
        ? { ...u, balance: Math.max(0, +(u.balance - target.amount).toFixed(2)) }
        : u,
    );
    setUsers(updatedUsers);
    setWd(
      wd.map((w: any) =>
        w.id === payingId
          ? { ...w, status: 'paid' as const, paid_at: now() }
          : w,
      ),
    );
    setPayingId(null);
  };

  // Resolve modal target row — kept in render so amount/fee labels stay live.
  const rejectingRow = rejectingId !== null ? wd.find((w: any) => w.id === rejectingId) : null;
  const approvingRow = approvingId !== null ? wd.find((w: any) => w.id === approvingId) : null;
  const payingRow = payingId !== null ? wd.find((w: any) => w.id === payingId) : null;

  return (
    <div>
      <PageBanner title={t.admin.wd.title} accent="emerald" />
      <DataTable minWidth="780px">
          <thead>
            <tr>
              <Th>{t.admin.wd.colId}</Th>
              <Th>{t.admin.wd.colUser}</Th>
              <Th>{t.admin.wd.colAmt}</Th>
              <Th>{t.admin.wd.colFee}</Th>
              <Th>{t.admin.wd.colMethod}</Th>
              <Th>{t.admin.wd.colReject}</Th>
              <Th>{t.admin.wd.colStatus}</Th>
              <Th>{t.admin.wd.colTime}</Th>
              <Th>{t.admin.wd.colProcessed}</Th>
              <Th>{t.admin.wd.colAddr}</Th>
              <Th>{t.admin.wd.colAction}</Th>
            </tr>
          </thead>
          <tbody>
            {wd.length === 0 ? (
              <tr><Td colSpan={11} className="text-center text-neutral-500 py-6">{t.admin.wd.empty}</Td></tr>
            ) : (
              wd.map((w: any) => {
                const mismatch = w.method === 'usdt_trc20' && w.bound_address && w.account && w.account !== w.bound_address;
                return (
                  <tr key={w.id} className="hover:bg-neutral-50 transition-colors">
                    <Td className="font-mono text-[12px]">#{w.id}</Td>
                    <Td>@{w.username}</Td>
                    <Td className="font-bold tabular-nums">{usd(w.amount)}</Td>
                    <Td>{usd(w.fee)}</Td>
                    <Td>{w.method === 'usdt_trc20' ? 'USDT-TRC20' : w.method}</Td>
                    <Td muted className="max-w-[180px] truncate">{w.reject_reason || '—'}</Td>
                    <Td>
                      <StatusBadge kind={STATUS_KIND[w.status as WdStatus]}>
                        {wdStatusLabel(w.status, locale as any)}
                      </StatusBadge>
                    </Td>
                    <Td muted>{w.created_at}</Td>
                    <Td muted>{w.processed_at || '—'}</Td>
                    <Td muted className="max-w-[180px] truncate">
                      {w.bound_address ? w.bound_address : <span className="text-neutral-700">{t.admin.wd.unbound}</span>}
                      {mismatch && <div className="text-rose-600 font-semibold mt-1">{t.admin.wd.addrMismatch}</div>}
                    </Td>
                    <Td className="whitespace-nowrap">
                      {w.status === 'pending' && (
                        <>
                          <button onClick={() => approve(w.id)} className="px-2 py-0.5 text-[11px] rounded bg-emerald-700 text-white hover:bg-emerald-700 mr-1">{t.admin.wd.approve}</button>
                          <button onClick={() => reject(w.id)} className="px-2 py-0.5 text-[11px] rounded bg-rose-600 text-white hover:bg-rose-700">{t.admin.wd.reject}</button>
                        </>
                      )}
                      {w.status === 'approved' && (
                        <button onClick={() => markPaid(w.id)} className="px-2 py-0.5 text-[11px] rounded bg-emerald-700 text-white hover:bg-emerald-700">{t.admin.wd.markPaid}</button>
                      )}
                      {(w.status === 'paid' || w.status === 'rejected') && (
                        <span className="text-neutral-700 text-[11px]">{t.admin.wd.view}</span>
                      )}
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </DataTable>

      {/* Reject modal — reason is required */}
      <Modal
        open={rejectingId !== null}
        title={t.admin.wd.rejectTitle}
        onClose={() => {
          setRejectingId(null);
          setRejectReason('');
          setReasonError(false);
        }}
      >
        {rejectingRow && (
          <div>
            <p className="text-[13px] text-neutral-700 mb-3">
              <span className="font-bold">@{rejectingRow.username}</span>
              {' · '}
              <span className="font-bold tabular-nums">{usd(rejectingRow.amount)}</span>
              {' · '}
              <span className="text-neutral-500">{rejectingRow.method === 'usdt_trc20' ? 'USDT-TRC20' : rejectingRow.method}</span>
            </p>
            <label htmlFor="wd-reject-reason" className="block text-[12px] font-semibold text-neutral-700 mb-1">
              {t.admin.wd.rejectReasonLabel}
              <span className="text-rose-600 ml-0.5">*</span>
            </label>
            <textarea
              id="wd-reject-reason"
              autoFocus
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value);
                if (reasonError && e.target.value.trim()) setReasonError(false);
              }}
              placeholder={t.admin.wd.rejectReasonPh}
              rows={3}
              aria-invalid={reasonError}
              aria-describedby={reasonError ? 'wd-reject-error' : undefined}
              className={`w-full border rounded-md px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-orange-500/40 ${
                reasonError ? 'border-rose-500 bg-rose-50' : 'border-neutral-300'
              }`}
            />
            {reasonError && (
              <p id="wd-reject-error" className="mt-1 text-[11.5px] text-rose-600 font-medium">
                {t.admin.wd.rejectReasonRequired}
              </p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setRejectingId(null);
                  setRejectReason('');
                  setReasonError(false);
                }}
                className="px-3 py-1.5 text-[12.5px] font-medium border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                {t.admin.wd.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-3 py-1.5 text-[12.5px] font-bold rounded-md bg-rose-600 text-white hover:bg-rose-700 transition-colors"
              >
                {t.admin.wd.confirmReject}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Approve modal — confirm + show net payout */}
      <Modal
        open={approvingId !== null}
        title={t.admin.wd.approveTitle}
        onClose={() => setApprovingId(null)}
      >
        {approvingRow && (
          <div>
            <p className="text-[13px] text-neutral-700 mb-3">{t.admin.wd.approveBodyApprove}</p>
            <dl className="bg-neutral-50 border border-neutral-200 rounded-md p-3 text-[12.5px] space-y-1.5 mb-4">
              <div className="flex justify-between">
                <dt className="text-neutral-500">{t.admin.wd.colUser}</dt>
                <dd className="font-mono">@{approvingRow.username}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">{t.admin.wd.colAmt}</dt>
                <dd className="font-bold tabular-nums">{usd(approvingRow.amount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">{t.admin.wd.approveFeeLabel}</dt>
                <dd className="tabular-nums text-rose-600">−{usd(approvingRow.fee)}</dd>
              </div>
              <div className="flex justify-between border-t border-neutral-200 pt-1.5">
                <dt className="text-neutral-700 font-semibold">{t.admin.wd.approveNetLabel}</dt>
                <dd className="font-bold tabular-nums text-emerald-700">
                  {usd(+(approvingRow.amount - approvingRow.fee).toFixed(2))}
                </dd>
              </div>
              {approvingRow.bound_address && (
                <div className="flex justify-between pt-1">
                  <dt className="text-neutral-500">{t.admin.wd.colAddr}</dt>
                  <dd className="font-mono text-[11px] text-neutral-700 truncate ml-2 max-w-[260px]">
                    {approvingRow.bound_address}
                  </dd>
                </div>
              )}
            </dl>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setApprovingId(null)}
                className="px-3 py-1.5 text-[12.5px] font-medium border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                {t.admin.wd.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                className="px-3 py-1.5 text-[12.5px] font-bold rounded-md bg-emerald-700 text-white hover:bg-emerald-700 transition-colors"
              >
                {t.admin.wd.confirmApprove}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Pay modal — confirms balance deduction */}
      <Modal
        open={payingId !== null}
        title={t.admin.wd.paidTitle}
        onClose={() => setPayingId(null)}
      >
        {payingRow && (
          <div>
            <p className="text-[13px] text-neutral-700 mb-3">{t.admin.wd.paidBody}</p>
            <dl className="bg-neutral-50 border border-neutral-200 rounded-md p-3 text-[12.5px] space-y-1.5 mb-4">
              <div className="flex justify-between">
                <dt className="text-neutral-500">{t.admin.wd.colUser}</dt>
                <dd className="font-mono">@{payingRow.username}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">{t.admin.wd.colAmt}</dt>
                <dd className="font-bold tabular-nums text-rose-600">−{usd(payingRow.amount)}</dd>
              </div>
            </dl>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPayingId(null)}
                className="px-3 py-1.5 text-[12.5px] font-medium border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                {t.admin.wd.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmPay}
                className="px-3 py-1.5 text-[12.5px] font-bold rounded-md bg-emerald-700 text-white hover:bg-emerald-700 transition-colors"
              >
                {t.admin.wd.confirmPay}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
