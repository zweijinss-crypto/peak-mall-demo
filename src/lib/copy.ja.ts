/**
 * copy.ja — Japanese translation stub (Phase 3.6.1).
 *
 * Empty by design: useT() falls back to English copy when a key is
 * missing here, so the route structure /en/, /ja/, /ko/ works from
 * day one while the actual translations land incrementally.
 *
 * Add keys as translations get done — no need to mirror the full
 * shape of copy.en.ts.
 */
import type { PartialDeep } from './copy-types';
import { COPY_EN } from './copy.en';

export const COPY_JA = {} as PartialDeep<typeof COPY_EN>;
