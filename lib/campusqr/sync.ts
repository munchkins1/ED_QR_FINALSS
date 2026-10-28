import { useEffect, useRef } from 'react';

import { useToast } from '@/components/CampusToast';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { EventStatus } from '@/types/database';
import { signOut } from './auth';
import { useCampusRealtime } from './realtime';
import { useCampusRole } from './roles';

/**
 * Global cross-cutting realtime behaviour (spec B5) that is not tied to a
 * single screen:
 *   • toast when a remote event's status changes (draft→open / open→closed)
 *   • toast when staff receive a check-in recorded from another device
 *   • force sign-out when the signed-in account is deactivated
 *
 * Echo suppression (in realtime.ts) already filters out this client's own
 * writes, so every event handled here is genuinely remote. The channel is
 * optional polish — the app still works with manual refresh if it fails.
 */
const STATUS_VERB: Record<string, string> = {
  open: 'opened',
  closed: 'closed',
  draft: 'moved back to draft',
};

export function useGlobalSync(): void {
  const toast = useToast();
  const { user } = useAuth();
  const { isStaff } = useCampusRole();
  const eventStatus = useRef(new Map<string, string>());
  const signedOutRef = useRef(false);

  // Seed the last-known event statuses so the first remote change can be
  // diffed (Realtime UPDATE payloads only guarantee the primary key in `old`).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabase.from('events').select('id, status');
        if (!active || !data) return;
        for (const row of data as { id: string; status: EventStatus }[]) {
          eventStatus.current.set(row.id, row.status);
        }
      } catch {
        // Realtime is optional polish — ignore seeding failures.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useCampusRealtime((change) => {
    if (change.table === 'events' && change.eventType === 'UPDATE' && change.new) {
      const id = String(change.new.id ?? '');
      const status = String(change.new.status ?? '');
      const prev = eventStatus.current.get(id);
      eventStatus.current.set(id, status);
      if (prev && prev !== status) {
        toast.info(`An event was ${STATUS_VERB[status] ?? 'updated'}.`);
      }
    }

    if (change.table === 'attendance' && change.eventType === 'INSERT' && isStaff) {
      toast.success('A student just checked in.');
    }

    if (
      change.table === 'profiles' &&
      change.eventType === 'UPDATE' &&
      user &&
      change.new &&
      String(change.new.id) === user.id &&
      change.new.is_active === false &&
      !signedOutRef.current
    ) {
      signedOutRef.current = true;
      toast.error('Your account has been deactivated. You have been signed out.');
      signOut().catch(() => {});
    }
  });
}
