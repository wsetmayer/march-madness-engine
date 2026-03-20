'use client';
import { useState, useEffect } from 'react';

interface Team {
  name: string;
  score: string;
  seed?: string;
  logo: string;
  color: string;
}

interface Game {
  id: string;
  home: Team;
  away: Team;
  status: string;
  venue: string;
  time: string;
  isLive: boolean;
  isFinal: boolean;
}

interface Player {
  id: string;
  name: string;
  team: string;
  teamLogo: string;
  teamSeed: number;
  oppSeed: number;
  oppName: string;
  headshot: string;
  gameName: string;
  gameStatus: string;
  isLive: boolean;
  isFinal: boolean;
  stats: Record<string, { value: string; label: string }>;
  cinderellaScore: number;
}

function parsedGames(data: any): Game[] {
  if (!data?.events) return [];
  return data.events.map((event: any) => {
    const comp = event.competitions[0];
    const home = comp.competitors.find((c: any) => c.homeAway === 'home');
    const away = comp.competitors.find((c: any) => c.homeAway === 'away');
    const status = comp.status?.type?.name || '';
    const detail = comp.status?.type?.shortDetail || comp.status?.displayClock || '';
    return {
      id: event.id,
      home: {
        name: home?.team?.displayName || '',
        score: home?.score || '0',
        seed: home?.curatedRank?.current?.toString() || '',
        logo: home?.team?.logo || '',
        color: home?.team?.color || '333333',
      },
      away: {
        name: away?.team?.displayName || '',
        score: away?.score || '0',
        seed: away?.curatedRank?.current?.toString() || '',
        logo: away?.team?.logo || '',
        color: away?.team?.color || '333333',
      },
      status: detail,
      venue: comp.venue?.fullName || '',
      time: new Date(event.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      isLive: status === 'STATUS_IN_PROGRESS',
      isFinal: status === 'STATUS_FINAL',
    };
  });
}

function scoreColor(score: number) {
  if (score >= 8) return '#22c55e';
  if (score >= 5) return '#ff6b35';
  return '#888';
}

function GameCard({ game }: { game: Game }) {
  const [narrative, setNarrative] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const homeScore = parseInt(game.home.score);
  const awayScore = parseInt(game.away.score);
  const homeWinning = homeScore > awayScore;
  const homeSeed = parseInt(game.home.seed || '8');
  const awaySeed = parseInt(game.away.seed || '8');
  const isUpset = (game.isLive || game.isFinal) && (
    (homeWinning && homeSeed > awaySeed + 3) ||
    (!homeWinning && awaySeed > homeSeed + 3)
  );

  async function generateNarrative() {
    if (narrative) { setExpanded(!expanded); return; }
    setLoading(true); setExpanded(true);
    try {
      const res = await fetch('/api/narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game: {
            home: game.home.name, away: game.away.name,
            homeSeed: game.home.seed, awaySeed: game.away.seed,
            homeScore: game.home.score, awayScore: game.away.score,
            status: game.status, venue: game.venue,
          }
        })
      });
      const data = await res.json();
      setNarrative(data.narrative || 'Unable to generate narrative.');
    } catch { setNarrative('Unable to generate narrative.'); }
    setLoading(false);
  }

  return (
    <div style={{ background: '#1a1a1a', border: `1px solid ${isUpset ? '#ff6b35' : '#2a2a2a'}`, borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 12, position: 'relative' }}>
      {isUpset && <div style={{ position: 'absolute', top: -10, right: 12, background: '#ff6b35', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, letterSpacing: '0.08em' }}>UPSET ALERT</div>}
      {game.isLive && <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'pulse 1.5s infinite' }} /><span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600, letterSpacing: '0.06em' }}>LIVE · {game.status}</span></div>}
      {game.isFinal && <div style={{ fontSize: 11, color: '#888', marginBottom: 8, letterSpacing: '0.06em' }}>FINAL</div>}
      {!game.isLive && !game.isFinal && <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>{game.time}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={game.away.logo} alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
          <div>
            {game.away.seed && <div style={{ fontSize: 10, color: '#888', marginBottom: 1 }}>#{game.away.seed} seed</div>}
            <div style={{ fontSize: 14, fontWeight: 500, color: '#f0f0f0' }}>{game.away.name}</div>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          {(game.isLive || game.isFinal) ? <div style={{ fontSize: 22, fontWeight: 700, color: '#f0f0f0', letterSpacing: 2 }}>{game.away.score} – {game.home.score}</div> : <div style={{ fontSize: 13, color: '#666' }}>vs</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
          <div style={{ textAlign: 'right' }}>
            {game.home.seed && <div style={{ fontSize: 10, color: '#888', marginBottom: 1 }}>#{game.home.seed} seed</div>}
            <div style={{ fontSize: 14, fontWeight: 500, color: '#f0f0f0' }}>{game.home.name}</div>
          </div>
          <img src={game.home.logo} alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
        </div>
      </div>
      {game.venue && <div style={{ fontSize: 11, color: '#555', marginBottom: 10 }}>{game.venue}</div>}
      <button onClick={generateNarrative} style={{ width: '100%', padding: '8px', fontSize: 12, background: 'transparent', border: '1px solid #333', borderRadius: 8, color: '#888', cursor: 'pointer' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#555'; e.currentTarget.style.color = '#f0f0f0'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#888'; }}>
        {loading ? 'Generating story...' : expanded ? 'Hide story' : '✦ Generate AI story'}
      </button>
      {expanded && (
        <div style={{ marginTop: 10, padding: 12, background: '#111', borderRadius: 8, fontSize: 13, color: '#ccc', lineHeight: 1.7, borderLeft: '3px solid #ff6b35' }}>
          {loading ? <div style={{ color: '#666' }}>Claude is writing the story...</div> : narrative}
        </div>
      )}
    </div>
  );
}

function PlayerCard({ player, onNIL }: { player: Player; onNIL: (p: Player) => void }) {
  const color = scoreColor(player.cinderellaScore);
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const progress = (player.cinderellaScore / 10) * circumference;

  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: '1rem', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
        <svg width="52" height="52" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="26" cy="26" r={radius} fill="none" stroke="#2a2a2a" strokeWidth="3" />
          <circle cx="26" cy="26" r={radius} fill="none" stroke={color} strokeWidth="3" strokeDasharray={`${progress} ${circumference}`} strokeLinecap="round" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color }}>
          {player.cinderellaScore}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        {player.headshot ? (
          <img src={player.headshot} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} onError={(e) => (e.currentTarget.style.display = 'none')} />
        ) : (
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#2a2a2a', flexShrink: 0 }} />
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#f0f0f0', marginBottom: 2 }}>{player.name}</div>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
            #{player.teamSeed} {player.team} vs #{player.oppSeed} {player.oppName}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.values(player.stats).slice(0, 3).map((stat, i) => (
              <span key={i} style={{ fontSize: 11, background: '#2a2a2a', color: '#ccc', padding: '2px 8px', borderRadius: 20 }}>
                {stat.value} {stat.label}
              </span>
            ))}
            {player.isLive && <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>● LIVE</span>}
          </div>
        </div>
      </div>
      <button onClick={() => onNIL(player)} style={{ flexShrink: 0, padding: '6px 12px', fontSize: 11, background: 'transparent', border: '1px solid #333', borderRadius: 8, color: '#888', cursor: 'pointer', whiteSpace: 'nowrap' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff6b35'; e.currentTarget.style.color = '#ff6b35'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#888'; }}>
        NIL Value ↗
      </button>
    </div>
  );
}

function NILModal({ player, onClose }: { player: Player; onClose: () => void }) {
  const [nilData, setNilData] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function generateNIL() {
      try {
        const res = await fetch('/api/nil', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ player })
        });
        const data = await res.json();
        setNilData(data.analysis || 'Unable to generate NIL analysis.');
      } catch { setNilData('Unable to generate NIL analysis.'); }
      setLoading(false);
    }
    generateNIL();
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
      <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 16, padding: '1.5rem', maxWidth: 500, width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#f0f0f0', marginBottom: 4 }}>{player.name}</div>
            <div style={{ fontSize: 12, color: '#888' }}>#{player.teamSeed} {player.team} · NIL Spotlight</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ display: 'flex', gap: 12, marginBottom: '1rem' }}>
          {player.headshot && <img src={player.headshot} alt="" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover' }} onError={(e) => (e.currentTarget.style.display = 'none')} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>Cinderella Score</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: scoreColor(player.cinderellaScore) }}>{player.cinderellaScore}<span style={{ fontSize: 14, color: '#888' }}>/10</span></div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1rem' }}>
          {Object.values(player.stats).map((stat, i) => (
            <div key={i} style={{ background: '#111', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#f0f0f0' }}>{stat.value}</div>
              <div style={{ fontSize: 10, color: '#888' }}>{stat.label}</div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: '1rem' }}>
          <div style={{ fontSize: 11, color: '#ff6b35', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 10 }}>✦ AI NIL ANALYSIS</div>
          {loading ? (
            <div style={{ color: '#666', fontSize: 13 }}>Claude is generating NIL valuation...</div>
          ) : (
            <div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{nilData}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'games' | 'players'>('games');
  const [gameFilter, setGameFilter] = useState<'all' | 'live' | 'final' | 'upcoming'>('all');
  const [nilPlayer, setNilPlayer] = useState<Player | null>(null);

  useEffect(() => {
    async function fetchAll() {
      const [gamesRes, playersRes] = await Promise.all([
        fetch('/api/games'),
        fetch('/api/players')
      ]);
      const gamesData = await gamesRes.json();
      const playersData = await playersRes.json();
      setGames(parsedGames(gamesData));
      setPlayers(playersData.players || []);
      setGamesLoading(false);
      setPlayersLoading(false);
    }
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredGames = games.filter(g => {
    if (gameFilter === 'live') return g.isLive;
    if (gameFilter === 'final') return g.isFinal;
    if (gameFilter === 'upcoming') return !g.isLive && !g.isFinal;
    return true;
  });

  const liveCount = games.filter(g => g.isLive).length;

  return (
    <main style={{ background: '#111', minHeight: '100vh', padding: '2rem 1.5rem', maxWidth: 680, margin: '0 auto' }}>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f0f0f0' }}>March Madness</h1>
          <span style={{ fontSize: 13, color: '#ff6b35', fontWeight: 600 }}>Story Engine</span>
        </div>
        <p style={{ fontSize: 13, color: '#666' }}>Live games · AI narratives · Cinderella tracker · NIL spotlight</p>
        {liveCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
            <span style={{ fontSize: 12, color: '#22c55e' }}>{liveCount} game{liveCount > 1 ? 's' : ''} live right now</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: '1.5rem', background: '#1a1a1a', borderRadius: 10, padding: 4 }}>
        {(['games', 'players'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            flex: 1, padding: '8px', fontSize: 13, fontWeight: 500,
            background: activeTab === tab ? '#ff6b35' : 'transparent',
            border: 'none', borderRadius: 8,
            color: activeTab === tab ? '#fff' : '#888',
            cursor: 'pointer'
          }}>
            {tab === 'games' ? '🏀 Live Games' : '⭐ Cinderella Tracker'}
          </button>
        ))}
      </div>

      {activeTab === 'games' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {(['all', 'live', 'final', 'upcoming'] as const).map(f => (
              <button key={f} onClick={() => setGameFilter(f)} style={{
                padding: '6px 14px', fontSize: 12, borderRadius: 20, border: '1px solid',
                borderColor: gameFilter === f ? '#ff6b35' : '#333',
                background: gameFilter === f ? '#ff6b35' : 'transparent',
                color: gameFilter === f ? '#fff' : '#888', cursor: 'pointer'
              }}>
                {f === 'live' && liveCount > 0 ? `Live (${liveCount})` : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          {gamesLoading && <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>Loading games...</div>}
          {filteredGames.map(game => <GameCard key={game.id} game={game} />)}
        </>
      )}

      {activeTab === 'players' && (
        <>
          <div style={{ marginBottom: '1rem', padding: '12px 16px', background: '#1a1a1a', borderRadius: 10, border: '1px solid #2a2a2a' }}>
            <div style={{ fontSize: 12, color: '#ff6b35', fontWeight: 600, marginBottom: 4 }}>CINDERELLA SCORE</div>
            <div style={{ fontSize: 12, color: '#666', lineHeight: 1.6 }}>
              Ranked by seed differential × statistical performance. Higher seed = higher potential. Click NIL Value to see AI-generated market analysis.
            </div>
          </div>
          {playersLoading && <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>Loading players...</div>}
          {players.map(player => <PlayerCard key={player.id} player={player} onNIL={setNilPlayer} />)}
        </>
      )}

      <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: 11, color: '#444' }}>
        Updates every 30 seconds · Powered by ESPN & Claude AI
      </div>

      {nilPlayer && <NILModal player={nilPlayer} onClose={() => setNilPlayer(null)} />}
    </main>
  );
}