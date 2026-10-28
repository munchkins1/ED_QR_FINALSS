import { supabase } from '@/lib/supabase';
import type { EventRow, EventStatus, UserRole } from '@/types/database';
import { refusedMessage, verifyPatch } from './verify';

/**
 * Events data layer (spec section 3).
 * Students see only open events; staff (teacher + admin) see every row
 * RLS allows.
 */

export type EventInput = {
  name: string;
  description: string | null;
  venue: string | null;
  start_datetime: string | null;
  end_datetime: string | null;
  status: EventStatus;
};

export type SaveResult = {
  data: EventRow | null;
  error: string | null;
};

// Columns that exist in the target schema. NOTE: the clean CampusQR
// schema has NO legacy columns (event_code/title/start_time/end_time),
// so we select only the columns that actually exist.
const EVENT_COLUMNS =
  'id, name, description, venue, start_datetime, end_datetime, status, qr_token, created_by, created_at';

/** Validates end >= start before touching the database. */
export function validateEventTimes(
  start: string | null,
  end: string | null
): string | null {
  if (start && end) {
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
      return 'Invalid date format.';
    }
    if (endMs < startMs) {
      return 'End date must be on or after the start date.';
    }
  }
  return null;
}

/** Lists the ids of every teacher (staff can read profiles via RLS). */
async function listTeacherIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'teacher');
  if (error) {
    console.warn('[campusqr/events] listTeacherIds failed:', error.message);
    return [];
  }
  return (data ?? []).map((row) => row.id as string);
}

/**
 * Lists events visible to the given role (spec listVisibleEvents).
 * - student: open + closed events - their status flips live (RLS same).
 * - teacher + admin: no extra filter — staff see every row RLS allows.
 */
export async function listVisibleEvents(
  role: UserRole | null,
  userId: string | null
): Promise<EventRow[]> {
  let query = supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .order('start_datetime', { ascending: false, nullsFirst: false });

  if (role === 'student') {
    query = query.in('status', ['open', 'closed']);
  }
  // teacher + admin: no extra filter — staff see every row RLS allows.

  const { data, error } = await query;
  if (error) {
    console.warn('[campusqr/events] listVisibleEvents failed:', error.message);
    return [];
  }
  return (data as EventRow[]) ?? [];
}

/**
 * Student "Class" view: open events created by a teacher (as opposed to the
 * "Events" view, which is every open event including admin-created ones).
 * Teacher ids come from a plain profiles select inside existing RLS — no
 * schema change. Falls back to an empty list when no teacher ids resolve.
 */
export async function listStudentClassEvents(): Promise<EventRow[]> {
  const teacherIds = await listTeacherIds();
  if (teacherIds.length === 0) return [];

  const { data, error } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .eq('status', 'open')
    .in('created_by', teacherIds)
    .order('start_datetime', { ascending: false, nullsFirst: false });

  if (error) {
    console.warn('[campusqr/events] listStudentClassEvents failed:', error.message);
    return [];
  }
  return (data as EventRow[]) ?? [];
}

/** Fetches one event by id (for the form / QR display screens). */
export async function getEventById(id: string): Promise<EventRow | null> {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.warn('[campusqr/events] getEventById failed:', error.message);
    return null;
  }
  return data as EventRow | null;
}

/** Creates a new event. Re-reads the inserted row before reporting success. */
export async function saveNewEvent(
  input: EventInput,
  createdBy: string
): Promise<SaveResult> {
  const timeError = validateEventTimes(input.start_datetime, input.end_datetime);
  if (timeError) return { data: null, error: timeError };

  const { data, error } = await supabase
    .from('events')
    .insert({
      name: input.name.trim(),
      // description/venue are NOT NULL DEFAULT '' in the schema — coerce.
      description: input.description ?? '',
      venue: input.venue ?? '',
      start_datetime: input.start_datetime,
      end_datetime: input.end_datetime,
      status: input.status,
      created_by: createdBy,
    })
    .select(EVENT_COLUMNS)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as EventRow, error: null };
}

/** Updates an event and re-reads the row to confirm the change persisted. */
export async function updateEvent(
  id: string,
  input: EventInput
): Promise<SaveResult & { refused?: string[] }> {
  const timeError = validateEventTimes(input.start_datetime, input.end_datetime);
  if (timeError) return { data: null, error: timeError };

  const patch = {
    name: input.name.trim(),
    // description/venue are NOT NULL DEFAULT '' in the schema — coerce.
    description: input.description ?? '',
    venue: input.venue ?? '',
    start_datetime: input.start_datetime,
    end_datetime: input.end_datetime,
    status: input.status,
  };

  const { error } = await supabase
    .from('events')
    .update(patch)
    .eq('id', id);
  if (error) return { data: null, error: error.message };

  // Re-read: an RLS-blocked update affects 0 rows and returns no error.
  const row = await getEventById(id);
  const check = verifyPatch(row as unknown as Record<string, unknown> | null, patch);
  if (!check.ok) {
    return { data: null, error: refusedMessage(check.refused), refused: check.refused };
  }
  return { data: row, error: null };
}

/** Sets draft/open/closed status and verifies the write. */
export async function setEventStatus(
  id: string,
  status: EventStatus
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('events')
    .update({ status })
    .eq('id', id);
  if (error) return { error: error.message };

  const row = await getEventById(id);
  const check = verifyPatch(row as unknown as Record<string, unknown> | null, {
    status,
  });
  if (!check.ok) return { error: refusedMessage(check.refused) };
  return { error: null };
}

/** Deletes an event (staff — RLS enforces server-side). */
export async function deleteEvent(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) return { error: error.message };

  const row = await getEventById(id);
  if (row) return { error: 'The database refused to delete this event.' };
  return { error: null };
}

/** The QR payload for an event: "CAMPUSQR:<qr_token>". */
export function qrPayload(event: EventRow): string {
  return `CAMPUSQR:${event.qr_token}`;
}

/**
 * Rotates an event's QR token (Live Display Mode). Generates a fresh
 * token server-side via gen_random_uuid() so screenshots expire.
 * Returns the refreshed row, or an error string.
 */
export async function rotateQrToken(id: string): Promise<{ data: EventRow | null; error: string | null }> {
  // Prefer a server-side rotation RPC when present (kills screenshots).
  const { error: rpcError } = await supabase.rpc('rotate_qr_token' as never, { p_event_id: id } as never);
  if (!rpcError) {
    const row = await getEventById(id);
    if (row) return { data: row, error: null };
  }
  // Fallback: fresh random token via direct update (owner/admin RLS applies).
  const fresh =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? (crypto as any).randomUUID()
      : `qr-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const { error: updateError } = await supabase.from('events').update({ qr_token: fresh }).eq('id', id);
  if (updateError) return { data: null, error: updateError.message };
  const row = await getEventById(id);
  return { data: row, error: null };
}
