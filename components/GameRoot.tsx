'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import Navbar          from '@/components/Navbar';
import RewardToast     from '@/components/RewardToast';
import HighlightCard   from '@/components/HighlightCard';

import RegisterScreen    from '@/components/screens/RegisterScreen';
import HomeScreen        from '@/components/screens/HomeScreen';
import DraftScreen       from '@/components/screens/DraftScreen';
import CourtScreen       from '@/components/screens/CourtScreen';
import BracketScreen     from '@/components/screens/BracketScreen';
import LiveGameScreen    from '@/components/screens/LiveGameScreen';
import LeaderboardScreen       from '@/components/screens/LeaderboardScreen';
import ChallengesScreen        from '@/components/screens/ChallengesScreen';
import LobbyScreen             from '@/components/screens/LobbyScreen';
import MultiplayerRoomScreen   from '@/components/screens/MultiplayerRoomScreen';
import FriendsScreen           from '@/components/screens/FriendsScreen';

export default function GameRoot() {
  const phase = useGameStore(s => s.phase);
  const init  = useGameStore(s => s.init);

  useEffect(() => { init(); }, [init]);

  if (phase === 'register') return <RegisterScreen />;

  return (
    <div style={{ background: '#F4F5F7', minHeight: '100vh', fontFamily: 'var(--font-jakarta, sans-serif)' }}>
      <Navbar />
      <div style={{ paddingTop: 60 }}>
        {phase === 'home'        && <HomeScreen />}
        {phase === 'draft'       && <DraftScreen />}
        {phase === 'court'       && <CourtScreen />}
        {phase === 'bracket'     && <BracketScreen />}
        {phase === 'game'        && <LiveGameScreen />}
        {phase === 'leaderboard' && <LeaderboardScreen />}
        {phase === 'challenges'  && <ChallengesScreen />}
        {phase === 'lobby'       && <LobbyScreen />}
        {phase === 'mp_room'     && <MultiplayerRoomScreen />}
        {phase === 'friends'     && <FriendsScreen />}
      </div>
      <RewardToast />
      <HighlightCard />
    </div>
  );
}
