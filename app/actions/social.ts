'use server';

import { createClient } from '@/supabase/server';
import type {
  FriendWithStats, PendingRequest, SearchProfile,
  IncomingChallenge, OutgoingChallenge,
} from '@/lib/types';

// ─── Profile search ───────────────────────────────────────────────────────────

export async function searchProfiles(query: string): Promise<{ ok: boolean; profiles: SearchProfile[] }> {
  if (!query.trim()) return { ok: true, profiles: [] };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, profiles: [] };

  const { data } = await supabase
    .from('profiles')
    .select('id, display_name')
    .ilike('display_name', `%${query.trim()}%`)
    .neq('id', user.id)
    .limit(10);

  return {
    ok: true,
    profiles: (data ?? []).map(r => ({ id: r.id, name: r.display_name })),
  };
}

// ─── Friend requests ──────────────────────────────────────────────────────────

export async function sendFriendRequest(addresseeId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const { error } = await supabase
    .from('friendships')
    .insert({ requester_id: user.id, addressee_id: addresseeId });

  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function acceptFriendRequest(friendshipId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId)
    .eq('addressee_id', user.id);

  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function declineFriendRequest(friendshipId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId)
    .eq('addressee_id', user.id);

  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function removeFriendship(friendshipId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId)
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  return error ? { ok: false, error: error.message } : { ok: true };
}

// ─── Get friends (accepted) + their leaderboard stats ────────────────────────

export async function getFriends(): Promise<{ ok: boolean; friends: FriendWithStats[] }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, friends: [] };

  const { data: rows } = await supabase
    .from('friendships')
    .select(`
      id,
      requester:profiles!friendships_requester_id_fkey(id, display_name),
      addressee:profiles!friendships_addressee_id_fkey(id, display_name)
    `)
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .eq('status', 'accepted');

  if (!rows) return { ok: true, friends: [] };

  type Profile = { id: string; display_name: string };
  const friends = rows.map(r => {
    const req = r.requester as unknown as Profile;
    const adr = r.addressee as unknown as Profile;
    const friend = req.id === user.id ? adr : req;
    return { friendshipId: r.id, id: friend.id, name: friend.display_name };
  });

  const friendIds = friends.map(f => f.id);
  let statsMap: Record<string, { points: number; titles: number; games: number }> = {};
  if (friendIds.length) {
    const { data: lb } = await supabase
      .from('leaderboard')
      .select('user_id, total_points, titles, games')
      .in('user_id', friendIds);
    statsMap = Object.fromEntries((lb ?? []).map(r => [r.user_id, { points: r.total_points, titles: r.titles, games: r.games }]));
  }

  return {
    ok: true,
    friends: friends.map(f => ({
      ...f,
      points: statsMap[f.id]?.points ?? 0,
      titles: statsMap[f.id]?.titles ?? 0,
      games:  statsMap[f.id]?.games  ?? 0,
    })),
  };
}

export async function getPendingRequests(): Promise<{ ok: boolean; requests: PendingRequest[] }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, requests: [] };

  const { data } = await supabase
    .from('friendships')
    .select(`id, requester:profiles!friendships_requester_id_fkey(id, display_name)`)
    .eq('addressee_id', user.id)
    .eq('status', 'pending');

  return {
    ok: true,
    requests: (data ?? []).map(r => {
      const req = r.requester as unknown as { id: string; display_name: string };
      return { friendshipId: r.id, id: req.id, name: req.display_name };
    }),
  };
}

// ─── Direct score challenges ──────────────────────────────────────────────────

export async function sendDirectChallenge(
  friendId: string,
  targetPoints: number,
  difficulty: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const { error } = await supabase
    .from('direct_challenges')
    .insert({ challenger_id: user.id, challengee_id: friendId, target_points: targetPoints, difficulty });

  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function getDirectChallenges(): Promise<{
  ok: boolean;
  incoming: IncomingChallenge[];
  outgoing: OutgoingChallenge[];
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, incoming: [], outgoing: [] };

  const { data } = await supabase
    .from('direct_challenges')
    .select(`
      id, target_points, difficulty, status, expires_at,
      challenger:profiles!direct_challenges_challenger_id_fkey(id, display_name),
      challengee:profiles!direct_challenges_challengee_id_fkey(id, display_name)
    `)
    .or(`challenger_id.eq.${user.id},challengee_id.eq.${user.id}`)
    .in('status', ['pending', 'beaten'])
    .order('expires_at', { ascending: true });

  const rows = data ?? [];
  type CRow = typeof rows[number];

  type CProfile = { id: string; display_name: string };

  const incoming: IncomingChallenge[] = rows
    .filter(r => (r.challengee as unknown as CProfile).id === user.id)
    .map((r: CRow) => ({
      id:           r.id,
      from:         (r.challenger as unknown as CProfile).display_name,
      targetPoints: r.target_points,
      difficulty:   r.difficulty,
      expiresAt:    r.expires_at,
      status:       r.status as 'pending' | 'beaten',
    }));

  const outgoing: OutgoingChallenge[] = rows
    .filter(r => (r.challenger as unknown as CProfile).id === user.id)
    .map((r: CRow) => ({
      id:           r.id,
      to:           (r.challengee as unknown as CProfile).display_name,
      targetPoints: r.target_points,
      difficulty:   r.difficulty,
      expiresAt:    r.expires_at,
      status:       r.status as 'pending' | 'beaten',
    }));

  return { ok: true, incoming, outgoing };
}

export async function markChallengeBeat(
  challengeId: string,
  resultPoints: number,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const { error } = await supabase
    .from('direct_challenges')
    .update({ status: 'beaten', result_points: resultPoints })
    .eq('id', challengeId)
    .eq('challengee_id', user.id);

  return error ? { ok: false, error: error.message } : { ok: true };
}
