/**
 * /admin/* layout — top-level RBAC gate.
 *
 * The gate logic now lives in src/components/admin/AdminGateLayout.tsx
 * so that /en/admin/* can share the exact same auth code. Previously
 * this file held the logic inline and /en/admin/* had NO layout at
 * all — every localized admin route skipped the session/role/resource
 * checks entirely.
 *
 * See AdminGateLayout for the full gate contract.
 */
export { default } from '@/components/admin/AdminGateLayout';
