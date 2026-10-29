/**
 * /en/admin/* layout — top-level RBAC gate (EN).
 *
 * Shares the exact same gate component as /admin/* so the two
 * languages can never drift on auth behavior:
 *   /admin/*    → src/app/admin/layout.tsx
 *   /en/admin/* → this file
 * Both re-export src/components/admin/AdminGateLayout.tsx.
 *
 * Without this, /en/admin/* bypassed the session / role / resource
 * checks that /admin/* enforced.
 */
export { default } from '@/components/admin/AdminGateLayout';
