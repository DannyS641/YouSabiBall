'use server';

import { createClient } from '@/supabase/server';
import { scoreRun } from '@/lib/sim';
import type { Bracket, Save } from '@/lib/types';

export interface RecordRunResult {
  ok:           boolean;
  pointsEarned: number;
  coinsEarned:  number;
  runLabel:     string;
  error:        string | null;
}

/**
 * Server-authoritative run recording.
 * Re-derives points/coins from the bracket on the server — the client
 * never sends a score it computed itself.
 */
export async function recordRunServer(
  bracket:    Bracket,
  diffMult:   number,
  difficulty: string
): Promise<RecordRunResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, pointsEarned: 0, coinsEarned: 0, runLabel: '', error: 'Not authenticated' };

  const human = bracket.teams.find(t => t.isHuman);
  if (!human) return { ok: false, pointsEarned: 0, coinsEarned: 0, runLabel: '', error: 'No human team in bracket' };

  // Server re-computes score — never trust client-sent numbers
  const rec = scoreRun(bracket, human, diffMult);

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single();

  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? 'GM';

  // Insert run record
  const { error: runErr } = await supabase.from('runs').insert({
    user_id:       user.id,
    display_name:  displayName,
    difficulty,
    round_reached: rec.winsCount,
    is_champion:   rec.isChampion,
    points_earned: rec.pointsEarned,
    coins_earned:  rec.coinsEarned,
    run_label:     rec.runLabel,
  });
  if (runErr) console.error('[recordRunServer] run insert:', runErr.message);

  // Upsert leaderboard aggregation via security-definer function
  const { error: lbErr } = await supabase.rpc('upsert_leaderboard', {
    p_user_id:      user.id,
    p_display_name: displayName,
    p_points_delta: rec.pointsEarned,
    p_games_delta:  1,
    p_titles_delta: rec.isChampion ? 1 : 0,
    p_best_round:   rec.winsCount,
  });
  if (lbErr) console.error('[recordRunServer] lb upsert:', lbErr.message);

  return {
    ok:           true,
    pointsEarned: rec.pointsEarned,
    coinsEarned:  rec.coinsEarned,
    runLabel:     rec.runLabel,
    error:        null,
  };
}

export interface ClaimResult {
  ok:     boolean;
  coins:  number;
  streak: number;
  error:  string | null;
}

/**
 * Server-side streak claim — validates date server-side so clients
 * can't manipulate lastClaim to re-collect rewards.
 */
export async function claimStreakServer(): Promise<ClaimResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, coins: 0, streak: 0, error: 'Not authenticated' };

  const today = new Date().toISOString().slice(0, 10);

  const { data: row } = await supabase
    .from('saves')
    .select('data')
    .eq('id', user.id)
    .single();

  const save: Partial<Save> = (row?.data as Partial<Save>) ?? {};
  if (save.lastClaim === today) {
    return { ok: false, coins: 0, streak: save.streak ?? 0, error: 'Already claimed today' };
  }

  const yest   = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
  const streak = save.lastClaim === yest ? (save.streak ?? 0) + 1 : 1;
  const day    = ((streak - 1) % 30) + 1;

  // Simple day reward formula (mirrors economy.ts)
  const BASE_COINS = 50;
  const coins = BASE_COINS + Math.floor(day / 7) * 25 + (day % 7) * 5;

  const updated: Partial<Save> = { ...save, lastClaim: today, streak, coins: (save.coins ?? 500) + coins };

  await supabase.from('saves').upsert({ id: user.id, data: updated, updated_at: new Date().toISOString() });

  return { ok: true, coins, streak, error: null };
}

export async function syncSave(save: Save): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase
    .from('saves')
    .upsert({ id: user.id, data: save, updated_at: new Date().toISOString() });

  return { ok: !error };
}

export async function loadCloudSave(): Promise<Save | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from('saves').select('data').eq('id', user.id).single();
  return data?.data as Save | null;
}

export async function fetchLeaderboard(): Promise<Array<{
  user_id: string; display_name: string; total_points: number;
  titles: number; games: number; best_round: number;
}>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('leaderboard')
    .select('user_id, display_name, total_points, titles, games, best_round')
    .order('total_points', { ascending: false })
    .limit(50);
  return data ?? [];
}
