/**
 * useRequireAdmin — client-side admin gating hook.
 *
 * Pair with the /admin/* layout (which gates at the layout level).
 * Use this in a page when you need to know *which* roles the caller
 * has, e.g. to hide a destructive action button.
 *
 * Returns:
 *   - status: 'loading' | 'denied' | 'ok'
 *   - role:   { email, roles } on success
 *   - roles:  AdminRole[] the caller holds
 *
 * Stays in sync with the layout by sharing the same RBAC helpers.
 * If the layout already denied access, this hook returns denied — same
 * logic, just exposed as state for the component.
 */
"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/api/supabase-client";
import { isSupabaseConfigured } from "@/lib/api";
import { getMyAdminRoles, type AdminRole } from "@/lib/admin/rbac";

export type AdminGateStatus = "loading" | "denied" | "ok";

export type AdminGateResult = {
  status: AdminGateStatus;
  email: string | null;
  roles: AdminRole[];
};

export function useRequireAdmin(): AdminGateResult {
  const [state, setState] = useState<AdminGateResult>({
    status: "loading",
    email: null,
    roles: [],
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = getSupabase();
      if (!supabase) {
        if (!isSupabaseConfigured()) {
          if (!cancelled) {
            setState({
              status: "ok",
              email: "demo@local",
              roles: ["super_admin"],
            });
          }
          return;
        }
        if (!cancelled) setState({ status: "denied", email: null, roles: [] });
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      const email = sess.session?.user?.email ?? null;
      if (!uid) {
        if (!cancelled) setState({ status: "denied", email, roles: [] });
        return;
      }
      const roles = await getMyAdminRoles();
      if (cancelled) return;
      if (roles.length === 0) {
        setState({ status: "denied", email, roles });
        return;
      }
      setState({ status: "ok", email, roles });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}