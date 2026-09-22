import { HealthClient } from '@/app/status/health-client';

export const dynamic = 'force-static';

/**
 * /en/status — mirror of /status, Phase 3.3.2.
 */
export default function EnStatusPage() {
  return <HealthClient />;
}