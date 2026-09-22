/**
 * admin-config-api — single-row config_kv (home/support/rules) (Phase 1.1.8).
 *
 * Singleton row holds 3 jsonb blobs that drive admin/home, admin/support
 * and admin/rules. Falls back to adminStore.homeCfg/supportCfg/rules.
 */

import { getSupabase } from './supabase-client';
import {
  adminStore,
  type AdminHomeCfg,
  type AdminSupportCfg,
  type AdminRules,
} from '../admin/fixtures';

interface ConfigRow {
  id: number;
  home: AdminHomeCfg;
  support: AdminSupportCfg;
  rules: AdminRules;
  updated_at: string;
}

/** Fetch the singleton config row. */
export async function fetchAllConfig(): Promise<{
  home: AdminHomeCfg;
  support: AdminSupportCfg;
  rules: AdminRules;
} | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('config_kv')
    .select('id, home, support, rules, updated_at')
    .eq('id', 1)
    .maybeSingle();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[admin-config-api] fetchAllConfig:', error);
    return null;
  }
  if (!data) return null;
  const row = data as unknown as ConfigRow;
  return { home: row.home, support: row.support, rules: row.rules };
}

/** Persist the home/support/rules bundle in one go. */
export async function saveConfigAll(cfg: {
  home: AdminHomeCfg;
  support: AdminSupportCfg;
  rules: AdminRules;
}): Promise<boolean> {
  adminStore.homeCfg.write(cfg.home);
  adminStore.supportCfg.write(cfg.support);
  adminStore.rules.write(cfg.rules);

  const sb = getSupabase();
  if (!sb) return true;
  const { error } = await sb
    .from('config_kv')
    .upsert({
      id: 1,
      home: cfg.home,
      support: cfg.support,
      rules: cfg.rules,
      updated_at: new Date().toISOString(),
    });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[admin-config-api] saveConfigAll:', error);
    return false;
  }
  return true;
}