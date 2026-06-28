'use server';

import { createClient } from '@/supabase/server';
import type { Roster } from '@/lib/types';

function genCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export interface RoomRow {
  id:           string;
  host_id:      string;
  guest_id:     string | null;
  status:       'waiting' | 'drafting' | 'done';
  host_name:    string;
  guest_name:   string | null;
  host_roster:  Roster | null;
  guest_roster: Roster | null;
  result:       { winner: 'host' | 'guest'; host_score: number; guest_score: number } | null;
}

export interface RoomResult {
  ok:    boolean;
  room?: RoomRow;
  error: string | null;
}

export async function createRoom(displayName: string): Promise<RoomResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated — sign in to create a room' };

  // Try up to 5 times to generate a unique code
  let code = '';
  for (let i = 0; i < 5; i++) {
    code = genCode();
    const { data: existing } = await supabase.from('rooms').select('id').eq('id', code).single();
    if (!existing) break;
  }

  const { data, error } = await supabase.from('rooms').insert({
    id:        code,
    host_id:   user.id,
    host_name: displayName,
    status:    'waiting',
  }).select().single();

  if (error || !data) return { ok: false, error: error?.message ?? 'Failed to create room' };
  return { ok: true, room: data as RoomRow, error: null };
}

export async function joinRoom(code: string, displayName: string): Promise<RoomResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated — sign in to join a room' };

  const { data: existing, error: fetchErr } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', code.toUpperCase())
    .single();

  if (fetchErr || !existing) return { ok: false, error: 'Room not found' };
  if (existing.status !== 'waiting') return { ok: false, error: 'Room is already full or started' };
  if (existing.host_id === user.id) return { ok: false, error: "You can't join your own room" };

  const { data, error } = await supabase
    .from('rooms')
    .update({ guest_id: user.id, guest_name: displayName, status: 'drafting' })
    .eq('id', code.toUpperCase())
    .select()
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? 'Failed to join room' };
  return { ok: true, room: data as RoomRow, error: null };
}

export async function submitRoster(roomId: string, roster: Roster, role: 'host' | 'guest'): Promise<RoomResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const field = role === 'host' ? 'host_roster' : 'guest_roster';
  const { data, error } = await supabase
    .from('rooms')
    .update({ [field]: roster, status: 'drafting' })
    .eq('id', roomId)
    .select()
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? 'Failed to submit roster' };

  const room = data as RoomRow;
  // If both rosters are in, resolve on server
  if (room.host_roster && room.guest_roster && room.status !== 'done') {
    await supabase.rpc('resolve_room', { p_room_id: roomId });
    const { data: resolved } = await supabase.from('rooms').select('*').eq('id', roomId).single();
    return { ok: true, room: (resolved ?? data) as RoomRow, error: null };
  }

  return { ok: true, room, error: null };
}

export async function getRoom(roomId: string): Promise<RoomResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('rooms').select('*').eq('id', roomId).single();
  if (error || !data) return { ok: false, error: 'Room not found' };
  return { ok: true, room: data as RoomRow, error: null };
}

export async function leaveRoom(roomId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: room } = await supabase.from('rooms').select('host_id, guest_id').eq('id', roomId).single();
  if (!room) return;

  if (room.host_id === user.id) {
    // Host leaving — delete the room
    await supabase.from('rooms').delete().eq('id', roomId);
  } else if (room.guest_id === user.id) {
    // Guest leaving — reset room to waiting
    await supabase.from('rooms').update({ guest_id: null, guest_name: null, status: 'waiting' }).eq('id', roomId);
  }
}
