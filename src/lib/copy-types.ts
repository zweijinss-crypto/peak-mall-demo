/**
 * copy-types — type helper for partial translation stubs.
 *
 * Phase 3.6.1 lets /ja/* and /ko/* fall back to English on a
 * per-key basis. The empty stub objects cast to PartialDeep<en>
 * so callers can spread / merge safely.
 *
 * Intentionally `any` to match the relaxed typing used by useT().
 */
export type PartialDeep<T> = any;
