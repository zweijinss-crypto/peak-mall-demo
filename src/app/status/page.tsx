import { HealthClient } from './health-client';

export const dynamic = 'force-static';

/**
 * /status — operational status page (Phase 3.3.2).
 *
 * Renders a static shell; the actual probe results come from
 * /api/health on the client. Static export means there's no SSR
 * health probe; polling runs after hydration.
 */
export default function StatusPage() {
  return <HealthClient />;
}