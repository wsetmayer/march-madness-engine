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
        seed: home?.curatedRank?.current?.toString() || home?.seed || '',
        logo: home?.team?.logo || '',
        color: home?.team?.color || '333333',
      },
      away: {
        name: away?.team?.displayName || '',
        score: away?.score || '0',
        seed: away?.curatedRank?.current?.toString() || away?.seed || '',
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

function GameCard({ game }: { game: Game }) {
  const [narrative, setNarrative] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const homeWinning = parseInt(game.home.score) > parseInt(game.away.score);
  const isUpset = game.home.seed && game.away.seed &&
    ((homeWinning && parseInt(game.home.seed) > parseInt(game.away.seed) + 3) ||
     (!homeWinning && parseInt(game.away.seed) > parseInt(game.home.seed) + 3));

  async function generateNarrative() {
    if (narrative) { setExpanded(!expanded); return; }
    setLoading(true);
    setExpanded(true);
    try {
      const res = await fetch('/api/narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game: {
            home: game.home.name,
            away: game.away.name,
            homeSeed: game.home.seed,
            awaySeed: game.away.seed,
            homeScore: game.home.score,
            awayScore: game.away.score,
            status: game.status,
            venue: game.venue,
          }
        })
      });
      const data = await res.json();
      setNarrative(data.narrative || 'Unable to generate narrative.');
    } catch {
      setNarrative('Unable to generate narrative.');
    }
    setLoading(false);
  }

  return (
    <div style={{
      background: '#1a1a1a',
      border: `1px solid ${isUpset ? '#ff6b35' : '#2a2a2a'}`,
      borderRadius: 12,
      padding: '1rem 1.25rem',
      marginBottom: 12,
      position: 'relative'
    }}>
      {isUpset && (
        <div style={{
          position: 'absolute', top: -10, right: 12,
          background: '#ff6b35', color: '#fff',
          fontSize: 10, fontWeight: 700, padding: '2px 8px',
          borderRadius: 20, letterSpacing: '0.08em'
        }}>UPSET ALERT</div>
      )}

      {game.isLive && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'pulse 1.5s infinite' }} />
          <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600, letterSpacing: '0.06em' }}>LIVE · {game.status}</span>
        </div>
      )}

      {game.isFinal && (
        <div style={{ fontSize: 11, color: '#888', marginBottom: 8, letterSpacing: '0.06em' }}>FINAL</div>
      )}

      {!game.isLive && !game.isFinal && (
        <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>{game.time}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={game.away.logo} alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
          <div>
            {game.away.seed && <div style={{ fontSize: 10, color: '#888', marginBottom: 1 }}>#{game.away.seed} seed</div>}
            <div style={{ fontSize: 14, fontWeight: 500, color: '#f0f0f0' }}>{game.away.name}</div>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          {(game.isLive || game.isFinal) ? (
            <div style={{ fontSize: 22, fontWeight: 700, color: '#f0f0f0', letterSpacing: 2 }}>
              {game.away.score} – {game.home.score}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#666' }}>vs</div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
          <div style={{ textAlign: 'right' }}>
            {game.home.seed && <div style={{ fontSize: 10, color: '#888', marginBottom: 1 }}>#{game.home.seed} seed</div>}
            <div style={{ fontSize: 14, fontWeight: 500, color: '#f0f0f0' }}>{game.home.name}</div>
          </div>
          <img src={game.home.logo} alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
        </div>
      </div>

      {game.venue && (
        <div style={{ fontSize: 11, color: '#555', marginBottom: 10 }}>{game.venue}</div>
      )}

      <button onClick={generateNarrative} style={{
        width: '100%', padding: '8px', fontSize: 12,
        background: 'transparent', border: '1px solid #333',
        borderRadius: 8, color: '#888', cursor: 'pointer',
        transition: 'all 0.2s'
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#555'; e.currentTarget.style.color = '#f0f0f0'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#888'; }}
      >
        {loading ? 'Generating story...' : expanded ? 'Hide story' : '✦ Generate AI story'}
      </button>

      {expanded && (
        <div style={{
          marginTop: 10, padding: 12,
          background: '#111', borderRadius: 8,
          fontSize: 13, color: '#ccc', lineHeight: 1.7,
          borderLeft: '3px solid #ff6b35'
        }}>
          {loading ? (
            <div style={{ color: '#666' }}>Claude is writing the story...</div>
          ) : narrative}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'live' | 'final' | 'upcoming'>('all');

  useEffect(() => {
    async function fetchGames() {
      try {
        const res = await fetch('/api/games');
        const data = await res.json();
        setGames(parsedGames(data));
      } catch {
        console.error('Failed to fetch games');
      }
      setLoading(false);
    }
    fetchGames();
    const interval = setInterval(fetchGames, 30000);
    return () => clearInterval(interval);
  }, []);

  const filtered = games.filter(g => {
    if (filter === 'live') return g.isLive;
    if (filter === 'final') return g.isFinal;
    if (filter === 'upcoming') return !g.isLive && !g.isFinal;
    return true;
  });

  const liveCount = games.filter(g => g.isLive).length;

  return (
    <main style={{ background: '#111', minHeight: '100vh', padding: '2rem 1.5rem', maxWidth: 680, margin: '0 auto' }}>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>

      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f0f0f0' }}>March Madness</h1>
          <span style={{ fontSize: 13, color: '#ff6b35', fontWeight: 600 }}>Story Engine</span>
        </div>
        <p style={{ fontSize: 13, color: '#666' }}>
          Live tournament games · AI-powered narratives · 2026 NCAA Tournament
        </p>
        {liveCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
            <span style={{ fontSize: 12, color: '#22c55e' }}>{liveCount} game{liveCount > 1 ? 's' : ''} live right now</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {(['all', 'live', 'final', 'upcoming'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 14px', fontSize: 12, borderRadius: 20,
            border: '1px solid',
            borderColor: filter === f ? '#ff6b35' : '#333',
            background: filter === f ? '#ff6b35' : 'transparent',
            color: filter === f ? '#fff' : '#888',
            cursor: 'pointer', textTransform: 'capitalize'
          }}>
            {f === 'live' && liveCount > 0 ? `Live (${liveCount})` : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
          Loading tournament games...
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
          No games found for this filter.
        </div>
      )}

      {filtered.map(game => <GameCard key={game.id} game={game} />)}

      <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: 11, color: '#444' }}>
        Updates every 30 seconds · Powered by ESPN & Claude AI
      </div>
    </main>
  );
}