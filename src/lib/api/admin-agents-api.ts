/**
 * admin-agents-api — admin agent rate config (Phase 1.1.8).
 *
 * Persists agent commission rates to public.users metadata (jsonb
 * `agent_config` column added in migration 0011). Falls back to
 * adminStore.agents (localStorage) when Supabase isn't configured.
 *
 * Schema assumption — migration 0011 adds:
 *   alter table public.users add column if not exists agent_config jsonb;
 *   with shape: { own_rate, sub_rate, sub_rate_limit }
 */

import { getSupabase } from './supabase-client';
import { adminStore, type AdminAgent } from '../admin/fixtures';

interface AgentConfig {
  own_rate: number;
  sub_rate: number;
  sub_rate_limit: number;
}

/** Fetch all agents (admin) — uses users + agent_config join. */
export async function fetchAllAgents(): Promise<AdminAgent[] | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('users')
    .select('id, email, nickname, role, agent_config')
    .in('role', ['fx', 'agent'])
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[admin-agents-api] fetchAllAgents:', error);
    return null;
  }
  return ((data ?? []) as unknown as Array<{
    id: string;
    email: string;
    nickname: string | null;
    role: string;
    agent_config: AgentConfig | null;
  }>).map((r, i) => {
    const cfg = r.agent_config ?? { own_rate: 10, sub_rate: 5, sub_rate_limit: 10 };
    return {
      id: hashId(r.id, i),
      nickname: r.nickname ?? r.email.split('@')[0],
      username: r.email.split('@')[0],
      balance: 0,
      own_rate: cfg.own_rate,
      sub_rate: cfg.sub_rate,
      sub_rate_limit: cfg.sub_rate_limit,
      withdraw_address: undefined,
      uuid: r.id,
    };
  });
}

/** Persist agent commission rates. */
export async function setAgentRates(
  numericId: number,
  rates: AgentConfig,
): Promise<boolean> {
  const all = adminStore.agents.read();
  const next = all.map((a) =>
    a.id === numericId
      ? { ...a, own_rate: rates.own_rate, sub_rate: rates.sub_rate, sub_rate_limit: rates.sub_rate_limit }
      : a,
  );
  adminStore.agents.write(next);

  const sb = getSupabase();
  if (!sb) return true;
  const agent = all.find((a) => a.id === numericId);
  const uuid = agent?.uuid;
  if (!uuid) return true;
  const { error } = await sb
    .from('users')
    .update({ agent_config: rates, updated_at: new Date().toISOString() })
    .eq('id', uuid);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[admin-agents-api] setAgentRates:', error);
    return false;
  }
  return true;
}

function hashId(uuid: string, fallback: number): number {
  let x = 5381 ^ uuid.charCodeAt(0);
  for (let i = 0; i < uuid.length; i++) x = ((x << 5) + x) ^ uuid.charCodeAt(i);
  x = ((x << 5) + x) ^ (fallback & 0xffff);
  return x >>> 0;
}