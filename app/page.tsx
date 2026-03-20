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
  isWinner?: boolean;
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
      isLive: status === 'STATUS_IN_PROGRESS' || status === 'STATUS_HALFTIME',
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
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [narrativeExpanded, setNarrativeExpanded] = useState(false);
  const [boxScore, setBoxScore] = useState<any>(null);
  const [boxScoreLoading, setBoxScoreLoading] = useState(false);
  const [boxScoreExpanded, setBoxScoreExpanded] = useState(false);

  const homeScore = parseInt(game.home.score);
  const awayScore = parseInt(game.away.score);
  const homeWinning = homeScore > awayScore;
  const homeSeed = parseInt(game.home.seed || '8');
  const awaySeed = parseInt(game.away.seed || '8');
  const isUpset = (game.isLive || game.isFinal) && (
    (homeWinning && homeSeed > awaySeed + 3) ||
    (!homeWinning && awaySeed > homeSeed + 3)
  );

  const accentColor = isUpset ? '#ff6b35' : game.isLive ? '#22c55e33' : '#2a2a2a';

  async function generateNarrative() {
    if (narrative) { setNarrativeExpanded(!narrativeExpanded); return; }
    setNarrativeLoading(true); setNarrativeExpanded(true);
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
    setNarrativeLoading(false);
  }

  async function toggleBoxScore() {
    if (boxScoreExpanded) { setBoxScoreExpanded(false); return; }
    setBoxScoreExpanded(true);
    if (boxScore) return;
    setBoxScoreLoading(true);
    try {
      const res = await fetch(`/api/boxscore?id=${game.id}`);
      const data = await res.json();
      setBoxScore(data.teams);
    } catch { }
    setBoxScoreLoading(false);
  }

  return (
    <div style={{
      background: '#1a1a1a',
      border: `1px solid ${accentColor}`,
      borderRadius: 14,
      padding: '1rem 1.25rem',
      marginBottom: 12,
      position: 'relative',
      borderLeft: `4px solid ${accentColor}`,
    }}>
      {isUpset && (
        <div style={{
          position: 'absolute', top: -10, right: 12,
          background: 'linear-gradient(135deg, #ff6b35, #ff4500)',
          color: '#fff', fontSize: 10, fontWeight: 800,
          padding: '3px 10px', borderRadius: 20,
          letterSpacing: '0.1em', boxShadow: '0 2px 8px rgba(255,107,53,0.4)'
        }}>⚡ UPSET ALERT</div>
      )}

      {game.isLive && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'pulse 1.5s infinite' }} />
          <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 700, letterSpacing: '0.08em' }}>LIVE · {game.status}</span>
        </div>
      )}
      {game.isFinal && (
        <div style={{ fontSize: 11, color: '#666', marginBottom: 10, letterSpacing: '0.08em', fontWeight: 600 }}>FINAL</div>
      )}
      {!game.isLive && !game.isFinal && (
        <div style={{ fontSize: 11, color: '#666', marginBottom: 10 }}>{game.time}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: `#${game.away.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <img src={game.away.logo} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
          </div>
          <div>
            {game.away.seed && <div style={{ fontSize: 10, color: '#666', marginBottom: 2 }}>#{game.away.seed} seed</div>}
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f0', lineHeight: 1.3 }}>{game.away.name}</div>
          </div>
        </div>

        <div style={{ textAlign: 'center', minWidth: 80 }}>
          {(game.isLive || game.isFinal) ? (
            <div style={{ fontSize: 24, fontWeight: 800, color: '#f0f0f0', letterSpacing: 1 }}>
              {game.away.score} <span style={{ color: '#444', fontSize: 16 }}>–</span> {game.home.score}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#555', fontWeight: 600 }}>VS</div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
          <div style={{ textAlign: 'right' }}>
            {game.home.seed && <div style={{ fontSize: 10, color: '#666', marginBottom: 2 }}>#{game.home.seed} seed</div>}
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f0', lineHeight: 1.3 }}>{game.home.name}</div>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: `#${game.home.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <img src={game.home.logo} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
          </div>
        </div>
      </div>

      {game.venue && <div style={{ fontSize: 11, color: '#444', marginBottom: 12 }}>📍 {game.venue}</div>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={toggleBoxScore} style={{
          flex: 1, padding: '9px', fontSize: 12, fontWeight: 600,
          background: boxScoreExpanded ? '#2a2a2a' : 'transparent',
          border: '1px solid #2a2a2a', borderRadius: 8,
          color: boxScoreExpanded ? '#f0f0f0' : '#666', cursor: 'pointer',
          letterSpacing: '0.03em'
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#555'; e.currentTarget.style.color = '#f0f0f0'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = boxScoreExpanded ? '#f0f0f0' : '#666'; }}>
          {boxScoreLoading ? 'Loading...' : boxScoreExpanded ? '▲ Hide box score' : '📊 Box score'}
        </button>
        <button onClick={generateNarrative} style={{
          flex: 1, padding: '9px', fontSize: 12, fontWeight: 600,
          background: narrativeExpanded ? '#2a2a2a' : 'transparent',
          border: '1px solid #2a2a2a', borderRadius: 8,
          color: narrativeExpanded ? '#f0f0f0' : '#666', cursor: 'pointer',
          letterSpacing: '0.03em'
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff6b35'; e.currentTarget.style.color = '#ff6b35'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = narrativeExpanded ? '#f0f0f0' : '#666'; }}>
          {narrativeLoading ? '✦ Writing...' : narrativeExpanded ? '▲ Hide story' : '✦ AI story'}
        </button>
      </div>

      {boxScoreExpanded && (
        <div style={{ marginTop: 10 }}>
          {boxScoreLoading ? (
            <div style={{ textAlign: 'center', padding: '1rem', color: '#555', fontSize: 13 }}>Loading box score...</div>
          ) : boxScore ? (
            boxScore.map((team: any, ti: number) => (
              <div key={ti} style={{ marginBottom: ti === 0 ? 16 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <img src={team.logo} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#f0f0f0' }}>{team.team}</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                        {['PLAYER', 'MIN', 'PTS', 'REB', 'AST', 'STL', 'BLK', 'FG', '3PT', 'FT', 'TO'].map(h => (
                          <th key={h} style={{ padding: '4px 6px', color: '#555', fontWeight: 600, textAlign: h === 'PLAYER' ? 'left' : 'center', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {team.players.map((p: any, pi: number) => (
                        <tr key={pi} style={{ borderBottom: '1px solid #1f1f1f' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#222')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <td style={{ padding: '6px 6px', color: '#ccc', whiteSpace: 'nowrap', fontWeight: p.starter ? 600 : 400 }}>
                            {p.starter && <span style={{ color: '#ff6b35', marginRight: 4, fontSize: 9 }}>▶</span>}
                            {p.name}
                          </td>
                          <td style={{ padding: '6px 6px', color: '#666', textAlign: 'center' }}>{p.min}</td>
                          <td style={{ padding: '6px 6px', color: parseInt(p.pts) >= 15 ? '#22c55e' : '#f0f0f0', textAlign: 'center', fontWeight: parseInt(p.pts) >= 15 ? 700 : 400 }}>{p.pts}</td>
                          <td style={{ padding: '6px 6px', color: '#ccc', textAlign: 'center' }}>{p.reb}</td>
                          <td style={{ padding: '6px 6px', color: '#ccc', textAlign: 'center' }}>{p.ast}</td>
                          <td style={{ padding: '6px 6px', color: '#ccc', textAlign: 'center' }}>{p.stl}</td>
                          <td style={{ padding: '6px 6px', color: '#ccc', textAlign: 'center' }}>{p.blk}</td>
                          <td style={{ padding: '6px 6px', color: '#666', textAlign: 'center' }}>{p.fg}</td>
                          <td style={{ padding: '6px 6px', color: '#666', textAlign: 'center' }}>{p.threes}</td>
                          <td style={{ padding: '6px 6px', color: '#666', textAlign: 'center' }}>{p.ft}</td>
                          <td style={{ padding: '6px 6px', color: '#666', textAlign: 'center' }}>{p.to}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem', color: '#555', fontSize: 13 }}>Box score unavailable</div>
          )}
        </div>
      )}

      {narrativeExpanded && (
        <div style={{
          marginTop: 10, padding: '14px 16px',
          background: '#111', borderRadius: 10,
          fontSize: 13, color: '#bbb', lineHeight: 1.8,
          borderLeft: '3px solid #ff6b35'
        }}>
          {narrativeLoading ? (
            <div style={{ color: '#555', fontStyle: 'italic' }}>Claude is writing the story...</div>
          ) : narrative}
        </div>
      )}
    </div>
  );
}

function PlayerCard({ player, onNIL }: { player: Player; onNIL: (p: Player) => void }) {
  const score = player.cinderellaScore;
  const color = scoreColor(score);
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 10) * circumference;
  const isElite = score >= 8;

  return (
    <div style={{
      background: isElite ? 'linear-gradient(135deg, #1a1a1a, #1f2a1f)' : '#1a1a1a',
      border: `1px solid ${isElite ? color + '44' : '#2a2a2a'}`,
      borderRadius: 14,
      padding: '1rem',
      marginBottom: 10,
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {isElite && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`
        }} />
      )}

      <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
        <svg width="56" height="56" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="28" cy="28" r={radius} fill="none" stroke="#2a2a2a" strokeWidth="3" />
          <circle cx="28" cy="28" r={radius} fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${progress} ${circumference}`} strokeLinecap="round" />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column'
        }}>
          <span style={{ fontSize: 16, fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: 8, color: '#555', letterSpacing: '0.05em' }}>SCORE</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        {player.headshot ? (
          <img src={player.headshot} alt="" style={{
            width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
            border: `2px solid ${isElite ? color + '66' : '#2a2a2a'}`
          }} onError={(e) => (e.currentTarget.style.display = 'none')} />
        ) : (
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#2a2a2a', flexShrink: 0 }} />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f0' }}>{player.name}</div>
            {isElite && <span style={{ fontSize: 10, background: color + '22', color, padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>TOP</span>}
          </div>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>
            #{player.teamSeed} {player.team} upset #{player.oppSeed} {player.oppName}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.values(player.stats).filter((s: any) => parseFloat(s.value) > 0).slice(0, 3).map((stat, i) => (
              <span key={i} style={{
                fontSize: 11, fontWeight: 600,
                background: '#222', color: '#ccc',
                padding: '3px 8px', borderRadius: 6,
                border: '1px solid #333'
              }}>
                {stat.value} {stat.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <button onClick={() => onNIL(player)} style={{
        flexShrink: 0, padding: '7px 14px', fontSize: 11, fontWeight: 700,
        background: 'transparent', border: `1px solid #333`,
        borderRadius: 8, color: '#888', cursor: 'pointer', whiteSpace: 'nowrap',
        letterSpacing: '0.03em'
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff6b35'; e.currentTarget.style.color = '#ff6b35'; e.currentTarget.style.background = '#ff6b3511'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#888'; e.currentTarget.style.background = 'transparent'; }}>
        NIL ↗
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

  const color = scoreColor(player.cinderellaScore);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
      <div style={{ background: '#161616', border: '1px solid #2a2a2a', borderRadius: 20, padding: '1.5rem', maxWidth: 500, width: '100%', maxHeight: '85vh', overflowY: 'auto', position: 'relative' }}>

        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${color}, transparent)`, borderRadius: '20px 20px 0 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {player.headshot && (
              <img src={player.headshot} alt="" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${color}44` }} onError={(e) => (e.currentTarget.style.display = 'none')} />
            )}
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f0', marginBottom: 2 }}>{player.name}</div>
              <div style={{ fontSize: 11, color: '#666' }}>#{player.teamSeed} {player.team} · NIL Spotlight</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#2a2a2a', border: 'none', color: '#888', fontSize: 16, cursor: 'pointer', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem', alignItems: 'center' }}>
          <div style={{ background: '#1a1a1a', borderRadius: 12, padding: '12px 16px', border: `1px solid ${color}33`, textAlign: 'center', minWidth: 80 }}>
            <div style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>{player.cinderellaScore}</div>
            <div style={{ fontSize: 10, color: '#666', marginTop: 2, letterSpacing: '0.06em' }}>CINDERELLA</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
            {Object.values(player.stats).filter((s: any) => parseFloat(s.value) > 0).map((stat, i) => (
              <div key={i} style={{ background: '#1a1a1a', borderRadius: 10, padding: '10px 14px', textAlign: 'center', border: '1px solid #2a2a2a', flex: 1, minWidth: 60 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f0' }}>{stat.value}</div>
                <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#1a1a1a', borderRadius: 10, padding: '10px 14px', marginBottom: '1.25rem', border: '1px solid #2a2a2a' }}>
          <div style={{ fontSize: 11, color: '#666' }}>
            #{player.teamSeed} {player.team} defeated #{player.oppSeed} {player.oppName}
          </div>
        </div>

        <div style={{ borderTop: '1px solid #222', paddingTop: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff6b35' }} />
            <div style={{ fontSize: 11, color: '#ff6b35', fontWeight: 700, letterSpacing: '0.08em' }}>AI NIL ANALYSIS</div>
          </div>
          {loading ? (
            <div style={{ color: '#555', fontSize: 13, fontStyle: 'italic' }}>Claude is generating NIL valuation...</div>
          ) : (
            <div style={{ fontSize: 13, color: '#bbb', lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{nilData}</div>
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
  const [gameSearch, setGameSearch] = useState('');
  const [playerSearch, setPlayerSearch] = useState('');

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
    const interval = setInterval(async () => {
      const [gamesRes, playersRes] = await Promise.all([
        fetch('/api/games'),
        fetch('/api/players')
      ]);
      const gamesData = await gamesRes.json();
      const playersData = await playersRes.json();
      setGames(parsedGames(gamesData));
      setPlayers(playersData.players || []);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const filteredGames = games
    .filter(g => {
    const matchesFilter = gameFilter === 'all' ? true :
      gameFilter === 'live' ? g.isLive :
      gameFilter === 'final' ? g.isFinal :
      !g.isLive && !g.isFinal;
    const matchesSearch = gameSearch === '' ? true :
      g.home.name.toLowerCase().includes(gameSearch.toLowerCase()) ||
      g.away.name.toLowerCase().includes(gameSearch.toLowerCase());
    return matchesFilter && matchesSearch;
    })
    .sort((a, b) => {
      // Finals first
      if (a.isFinal && !b.isFinal) return -1;
      if (!a.isFinal && b.isFinal) return 1;
      // Among live games, sort by time remaining (parse clock)
      if (a.isLive && b.isLive) {
        const parseTime = (s: string) => {
          const match = s.match(/(\d+):(\d+)/);
          if (!match) return 999;
          return parseInt(match[1]) * 60 + parseInt(match[2]);
        };
        const aTime = parseTime(a.status);
        const bTime = parseTime(b.status);
        // 2nd half less time = closer to end = first
        const aHalf = a.status.includes('2nd') ? 0 : 1;
        const bHalf = b.status.includes('2nd') ? 0 : 1;
        if (aHalf !== bHalf) return aHalf - bHalf;
        return aTime - bTime;
      }
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;
      return 0;
    });

  const filteredPlayers = players.filter(p =>
    playerSearch === '' ? true :
    p.name.toLowerCase().includes(playerSearch.toLowerCase()) ||
    p.team.toLowerCase().includes(playerSearch.toLowerCase())
  );

  const liveCount = games.filter(g => g.isLive).length;

  return (
    <main style={{ background: '#0f0f0f', minHeight: '100vh', padding: '1.5rem 1.25rem', maxWidth: 680, margin: '0 auto' }}>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#f0f0f0', letterSpacing: '-0.5px' }}>
            March Madness
          </h1>
          <span style={{
            fontSize: 12, color: '#ff6b35', fontWeight: 800,
            background: '#ff6b3522', padding: '2px 8px',
            borderRadius: 6, letterSpacing: '0.05em'
          }}>STORY ENGINE</span>
        </div>
        <p style={{ fontSize: 12, color: '#555' }}>Live games · AI narratives · Cinderella tracker · NIL spotlight</p>
        {liveCount > 0 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, background: '#22c55e18', padding: '4px 10px', borderRadius: 20, border: '1px solid #22c55e33' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 700 }}>{liveCount} game{liveCount > 1 ? 's' : ''} live now</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: '1.25rem', background: '#1a1a1a', borderRadius: 12, padding: 4, border: '1px solid #2a2a2a' }}>
        {(['games', 'players'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            flex: 1, padding: '10px 8px', fontSize: 13, fontWeight: 700,
            background: activeTab === tab ? '#ff6b35' : 'transparent',
            border: 'none', borderRadius: 9,
            color: activeTab === tab ? '#fff' : '#555',
            cursor: 'pointer', transition: 'all 0.15s',
            letterSpacing: '0.02em'
          }}>
            {tab === 'games' ? '🏀 Live Games' : '⭐ Cinderella Tracker'}
          </button>
        ))}
      </div>

      {activeTab === 'games' && (
        <>
          <input
            value={gameSearch}
            onChange={e => setGameSearch(e.target.value)}
            placeholder="Search teams..."
            style={{
              width: '100%', fontSize: 14, padding: '11px 16px',
              border: '1px solid #2a2a2a', borderRadius: 10,
              background: '#1a1a1a', color: '#f0f0f0',
              marginBottom: 12, outline: 'none'
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {(['all', 'live', 'final', 'upcoming'] as const).map(f => (
              <button key={f} onClick={() => setGameFilter(f)} style={{
                padding: '6px 16px', fontSize: 12, fontWeight: 600,
                borderRadius: 20, border: '1px solid',
                borderColor: gameFilter === f ? '#ff6b35' : '#2a2a2a',
                background: gameFilter === f ? '#ff6b35' : 'transparent',
                color: gameFilter === f ? '#fff' : '#666', cursor: 'pointer'
              }}>
                {f === 'live' && liveCount > 0 ? `Live (${liveCount})` : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          {gamesLoading && <div style={{ textAlign: 'center', padding: '3rem', color: '#555' }}>Loading games...</div>}
          {filteredGames.map(game => <GameCard key={game.id} game={game} />)}
        </>
      )}

      {activeTab === 'players' && (
        <>
          <input
            value={playerSearch}
            onChange={e => setPlayerSearch(e.target.value)}
            placeholder="Search players or teams..."
            style={{
              width: '100%', fontSize: 14, padding: '11px 16px',
              border: '1px solid #2a2a2a', borderRadius: 10,
              background: '#1a1a1a', color: '#f0f0f0',
              marginBottom: 12, outline: 'none'
            }}
          />
          <div style={{ marginBottom: '1rem', padding: '12px 16px', background: '#1a1a1a', borderRadius: 10, border: '1px solid #2a2a2a' }}>
            <div style={{ fontSize: 11, color: '#ff6b35', fontWeight: 800, marginBottom: 4, letterSpacing: '0.06em' }}>CINDERELLA SCORE</div>
            <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6 }}>
              Players from upset wins ranked by performance + upset factor + underdog narrative. Click NIL ↗ for AI social buzz score and market valuation.
            </div>
          </div>
          {playersLoading && <div style={{ textAlign: 'center', padding: '3rem', color: '#555' }}>Loading players...</div>}
          {filteredPlayers.length === 0 && !playersLoading && (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#555' }}>No upset players found yet. Check back as games finish.</div>
          )}
          {filteredPlayers.map(player => <PlayerCard key={player.id} player={player} onNIL={setNilPlayer} />)}
        </>
      )}

      <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: 11, color: '#333' }}>
        Updates every 60 seconds · ESPN + Claude AI
      </div>

      {nilPlayer && <NILModal player={nilPlayer} onClose={() => setNilPlayer(null)} />}
    </main>
  );
}