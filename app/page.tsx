'use client';
import React, { useState, useEffect } from 'react';

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
  date: string;
  isLive: boolean;
  isFinal: boolean;
  homeWinProb?: number | null;
  awayWinProb?: number | null;
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
        seed: (home?.curatedRank?.current && home.curatedRank.current > 0) ? home.curatedRank.current.toString() : '',
        logo: home?.team?.logo || '',
        color: home?.team?.color || '333333',
      },
      away: {
        name: away?.team?.displayName || '',
        score: away?.score || '0',
        seed: (away?.curatedRank?.current && away.curatedRank.current > 0) ? away.curatedRank.current.toString() : '',
        logo: away?.team?.logo || '',
        color: away?.team?.color || '333333',
      },
      status: detail,
      venue: comp.venue?.fullName || '',
      time: new Date(event.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      date: event.date,
      isLive: status === 'STATUS_IN_PROGRESS' || status === 'STATUS_HALFTIME',
      isFinal: status === 'STATUS_FINAL',
      homeWinProb: comp.homeWinProbability ? Math.round(comp.homeWinProbability * 1000) / 10 : null,
      awayWinProb: comp.awayWinProbability ? Math.round(comp.awayWinProbability * 1000) / 10 : null,
    };
  });
}

function useCountdown(targetTime: string) {
  const [timeLeft, setTimeLeft] = React.useState('');

  React.useEffect(() => {
    function calc() {
      const diff = new Date(targetTime).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Starting soon'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h > 0) setTimeLeft(`${h}h ${m}m`);
      else if (m > 0) setTimeLeft(`${m}m ${s}s`);
      else setTimeLeft(`${s}s`);
    }
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [targetTime]);

  return timeLeft;
}

function useLastUpdated() {
  const [lastUpdated, setLastUpdated] = React.useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = React.useState(0);

  const markUpdated = React.useCallback(() => {
    setLastUpdated(new Date());
    setSecondsAgo(0);
  }, []);

  React.useEffect(() => {
    const id = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  return { secondsAgo, markUpdated };
}

function MomentumMeter({ gameId }: { gameId: string }) {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetch_() {
      try {
        const res = await fetch(`/api/momentum?id=${gameId}`);
        const json = await res.json();
        setData(json);
      } catch { }
      setLoading(false);
    }
    fetch_();
    const id = setInterval(fetch_, 60000);
    return () => clearInterval(id);
  }, [gameId]);

  if (loading || !data || !data.hasData) return null;

  const { homeName, awayName, homeColor, awayColor, homePts, awayPts } = data;
  const total = homePts + awayPts || 1;
  const homeWidth = Math.round((homePts / total) * 100);
  const awayWidth = 100 - homeWidth;
  const diff = Math.abs(homePts - awayPts);
  const isRun = diff >= 7;
  const leader = homePts > awayPts ? homeName : awayName;
  const trailer = homePts > awayPts ? awayName : homeName;
  const leaderPts = Math.max(homePts, awayPts);
  const trailerPts = Math.min(homePts, awayPts);
  const leaderColor = homePts > awayPts ? homeColor : awayColor;

  return (
    <div style={{
      marginTop: 10, padding: '10px 0',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ff6b35', animation: 'pulse 1.5s infinite' }} />
        <span style={{ fontSize: 10, fontWeight: 800, color: '#ff6b35', letterSpacing: '0.08em' }}>
          MOMENTUM · LAST 5 MIN
        </span>
      </div>

      {/* Bar */}
      <div style={{ display: 'flex', height: 6, borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
        <div style={{ width: `${awayWidth}%`, background: `#${awayColor}`, transition: 'width 0.8s ease' }} />
        <div style={{ width: `${homeWidth}%`, background: `#${homeColor}`, transition: 'width 0.8s ease' }} />
      </div>

      {/* Percentages */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, color: '#555', fontWeight: 600 }}>{awayWidth}%</span>
        <span style={{ fontSize: 10, color: '#555', fontWeight: 600 }}>{homeWidth}%</span>
      </div>

      {/* Run alert — only shows when 7+ point differential */}
      {isRun && (
        <div style={{
          marginTop: 8, fontSize: 11, color: '#bbb', lineHeight: 1.5,
          borderTop: '1px solid #222', paddingTop: 8,
        }}>
          🔥 <span style={{ color: `#${leaderColor}`, fontWeight: 700 }}>{leader}</span>
          {' '}on a <span style={{ color: '#f0f0f0', fontWeight: 700 }}>{leaderPts}–{trailerPts}</span> run
          {' '}over {trailer}
        </div>
      )}
    </div>
  );
}

function scoreColor(score: number) {
  if (score >= 8) return '#22c55e';
  if (score >= 5) return '#ff6b35';
  return '#888';
}

function ScoreTicker({ games }: { games: Game[] }) {
  const tickerRef = React.useRef<HTMLDivElement>(null);
  const posRef = React.useRef(0);
  const rafRef = React.useRef<number>(0);

  const tickerGames = [...games]
    .filter(g => g.home.name !== 'TBD' && g.away.name !== 'TBD')
    .sort((a, b) => {
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;
      if (!a.isFinal && b.isFinal) return -1;
      if (a.isFinal && !b.isFinal) return 1;
      return 0;
    });

  useEffect(() => {
    const el = tickerRef.current;
    if (!el) return;
    const half = el.scrollWidth / 2;

    const tick = () => {
      posRef.current += 0.4;
      if (posRef.current >= half) posRef.current = 0;
      el.style.transform = `translateX(-${posRef.current}px)`;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [games]);

  if (tickerGames.length === 0) return null;

  const items = [...tickerGames, ...tickerGames];

  return (
    <div style={{
      background: '#141414',
      borderBottom: '1px solid #2a2a2a',
      overflow: 'hidden',
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 50,
      height: 40,
    }}>
      <div ref={tickerRef} style={{
        display: 'flex',
        alignItems: 'center',
        height: '100%',
        whiteSpace: 'nowrap',
        width: 'max-content',
      }}>
        {items.map((game, i) => {
          const homeScore = parseInt(game.home.score);
          const awayScore = parseInt(game.away.score);
          const homeSeed = parseInt(game.home.seed || '8');
          const awaySeed = parseInt(game.away.seed || '8');
          const homeWinning = homeScore > awayScore;
          const isUpset = (game.isLive || game.isFinal) && (
            (homeWinning && homeSeed > awaySeed + 3) ||
            (!homeWinning && awaySeed > homeSeed + 3)
          );

          return (
            <div key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '0 16px',
              borderRight: '1px solid #222',
              height: '100%',
            }}>
              {isUpset && (
                <span style={{
                  fontSize: 9, color: '#fff', fontWeight: 800,
                  background: '#ff6b35', padding: '1px 5px',
                  borderRadius: 4, letterSpacing: '0.06em', flexShrink: 0
                }}>UPSET</span>
              )}
              <img src={game.away.logo} alt="" style={{ width: 16, height: 16, objectFit: 'contain', flexShrink: 0 }} onError={(e) => (e.currentTarget.style.display = 'none')} />
              <span style={{ fontSize: 11, color: '#999' }}>
                {game.away.name.split(' ').slice(-1)[0]}
              </span>
              {(game.isLive || game.isFinal) && (
                <span style={{ fontSize: 12, fontWeight: 800, color: '#f0f0f0', letterSpacing: '0.5px' }}>
                  {game.away.score}
                </span>
              )}
              <span style={{ fontSize: 10, color: '#444', fontWeight: 600 }}>–</span>
              {(game.isLive || game.isFinal) && (
                <span style={{ fontSize: 12, fontWeight: 800, color: '#f0f0f0', letterSpacing: '0.5px' }}>
                  {game.home.score}
                </span>
              )}
              <span style={{ fontSize: 11, color: '#999' }}>
                {game.home.name.split(' ').slice(-1)[0]}
              </span>
              <img src={game.home.logo} alt="" style={{ width: 16, height: 16, objectFit: 'contain', flexShrink: 0 }} onError={(e) => (e.currentTarget.style.display = 'none')} />
              {game.isLive && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 2 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ff3b30', animation: 'pulse 1s infinite', flexShrink: 0 }} />
                  <span style={{ fontSize: 9, color: '#ff3b30', fontWeight: 700 }}>{game.status}</span>
                </div>
              )}
              {game.isFinal && (
                <span style={{ fontSize: 9, color: '#555', fontWeight: 700, marginLeft: 2 }}>FINAL</span>
              )}
              {!game.isLive && !game.isFinal && (
                <span style={{ fontSize: 9, color: '#666', fontWeight: 600, marginLeft: 2 }}>{game.time}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UpcomingCountdown({ date, time }: { date: string; time: string }) {
  const countdown = useCountdown(date);
  const isImminent = countdown === 'Starting soon';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    }}>
      <span style={{ fontSize: 11, color: '#666', fontWeight: 600 }}>{time}</span>
      <span style={{ fontSize: 10, color: '#444' }}>·</span>
      <span style={{
        fontSize: 11,
        fontWeight: 700,
        color: isImminent ? '#22c55e' : '#ff6b35',
        letterSpacing: '0.03em',
      }}>
        {isImminent ? '🟢 Starting soon' : `⏱ ${countdown}`}
      </span>
    </div>
  );
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

  const isCloseGame = (() => {
    if (!game.isLive) return false;
    const scoreDiff = Math.abs(homeScore - awayScore);
    if (scoreDiff > 5) return false;
    const is2nd = game.status.includes('2nd');
    if (!is2nd) return false;
    const match = game.status.match(/(\d+):(\d+)/);
    if (!match) return false;
    const minsLeft = parseInt(match[1]);
    return minsLeft <= 5;
  })();

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 700, letterSpacing: '0.08em' }}>LIVE · {game.status}</span>
          </div>
          {isCloseGame && (
            <span style={{
              fontSize: 10, fontWeight: 800,
              background: 'linear-gradient(135deg, #ff3b30, #ff6b35)',
              color: '#fff', padding: '2px 8px',
              borderRadius: 10, letterSpacing: '0.06em',
              animation: 'pulse 1s infinite',
            }}>
              🚨 CLOSE GAME
            </span>
          )}
        </div>
      )}
      {game.isFinal && (
        <div style={{ fontSize: 11, color: '#666', marginBottom: 10, letterSpacing: '0.08em', fontWeight: 600 }}>FINAL</div>
      )}
      {!game.isLive && !game.isFinal && (
        <UpcomingCountdown date={game.date} time={game.time} />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: `#${game.away.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <img src={game.away.logo} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
          </div>
          <div>
            {game.away.seed && <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>#{game.away.seed} seed</div>}
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f0', lineHeight: 1.3 }}>{game.away.name}</div>
          </div>
        </div>

        <div style={{ textAlign: 'center', minWidth: 90 }}>
          {(game.isLive || game.isFinal) ? (
            <>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#f0f0f0', letterSpacing: 1, marginBottom: 6 }}>
                {game.away.score} <span style={{ color: '#444', fontSize: 16 }}>–</span> {game.home.score}
              </div>
              {game.isLive && game.homeWinProb !== null && game.homeWinProb !== undefined && (
                <div>
                  <div style={{ display: 'flex', height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 3 }}>
                    <div style={{ width: `${game.awayWinProb}%`, background: `#${game.away.color || '378ADD'}`, transition: 'width 1s' }} />
                    <div style={{ width: `${game.homeWinProb}%`, background: `#${game.home.color || 'D85A30'}`, transition: 'width 1s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#555', fontWeight: 700 }}>
                    <span>{game.awayWinProb}%</span>
                    <span>{game.homeWinProb}%</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 12, color: '#555', fontWeight: 600 }}>VS</div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
          <div style={{ textAlign: 'right' }}>
            {game.home.seed && <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>#{game.home.seed} seed</div>}
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f0', lineHeight: 1.3 }}>{game.home.name}</div>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: `#${game.home.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <img src={game.home.logo} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
          </div>
        </div>
      </div>

      {game.venue && <div style={{ fontSize: 11, color: '#666', marginBottom: 12 }}>📍 {game.venue}</div>}

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
                {team.totals && (
                  <div style={{ marginTop: 10, padding: '10px 12px', background: '#111', borderRadius: 8, border: '1px solid #222' }}>
                    <div style={{ fontSize: 10, color: '#555', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 8 }}>TEAM TOTALS</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {[
                        { label: 'PTS', value: team.totals.pts },
                        { label: 'FG', value: team.totals.fg },
                        { label: 'FG%', value: team.totals.fgPct },
                        { label: '3PT', value: team.totals.threes },
                        { label: '3P%', value: team.totals.threePct },
                        { label: 'FT', value: team.totals.ft },
                        { label: 'FT%', value: team.totals.ftPct },
                        { label: 'REB', value: team.totals.reb },
                        { label: 'OREB', value: team.totals.oreb },
                        { label: 'DREB', value: team.totals.dreb },
                        { label: 'AST', value: team.totals.ast },
                        { label: 'STL', value: team.totals.stl },
                        { label: 'BLK', value: team.totals.blk },
                        { label: 'TO', value: team.totals.to },
                        { label: 'PF', value: team.totals.pf },
                      ].filter(s => s.value && s.value !== '-').map((s, i) => (
                        <div key={i} style={{ background: '#1a1a1a', borderRadius: 6, padding: '5px 8px', textAlign: 'center', minWidth: 44 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#f0f0f0' }}>{s.value}</div>
                          <div style={{ fontSize: 9, color: '#555' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem', color: '#555', fontSize: 13 }}>Box score unavailable</div>
          )}
        </div>
      )}

      {game.isLive && <MomentumMeter gameId={game.id} />}

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
            <div style={{ fontSize: 13, lineHeight: 1.9 }}>
              {nilData.split('\n').map((line, i) => {
                const parsed = line.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#f0f0f0;font-weight:700">$1</strong>');
                const isHeader = /^[📱💰🎯🚀📖⭐🏀]/.test(line);
                if (!line.trim()) return <div key={i} style={{ height: 8 }} />;
                return (
                  <div
                    key={i}
                    style={{
                      marginBottom: isHeader ? 6 : 2,
                      color: isHeader ? '#f0f0f0' : '#bbb',
                      fontWeight: isHeader ? 700 : 400,
                    }}
                    dangerouslySetInnerHTML={{ __html: parsed }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BracketCountdown({ date }: { date: string }) {
  const countdown = useCountdown(date);
  const isImminent = countdown === 'Starting soon';
  return (
    <span style={{
      fontSize: 9,
      fontWeight: 700,
      color: isImminent ? '#22c55e' : '#ff6b35',
    }}>
      {isImminent ? '🟢 Soon' : `⏱ ${countdown}`}
    </span>
  );
}

function BracketGame({ game }: { game: any }) {
  const isUpset = game.isFinal && (
    (game.home.won && parseInt(game.home.seed) > parseInt(game.away.seed) + 2) ||
    (game.away.won && parseInt(game.away.seed) > parseInt(game.home.seed) + 2)
  );

  return (
    <div style={{
      background: '#1a1a1a',
      border: `1px solid ${isUpset ? '#ff6b3544' : '#2a2a2a'}`,
      borderRadius: 8,
      overflow: 'hidden',
      width: '100%',
    }}>
      {[game.away, game.home].map((team: any, i: number) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 10px',
          background: team.won ? '#1f2a1f' : 'transparent',
          borderBottom: i === 0 ? '1px solid #222' : 'none',
          opacity: game.isFinal && !team.won ? 0.5 : 1,
        }}>
          <span style={{ fontSize: 10, color: '#555', width: 16, flexShrink: 0, textAlign: 'center', fontWeight: 600 }}>
            {team.seed || '?'}
          </span>
          {team.logo && <img src={team.logo} alt="" style={{ width: 16, height: 16, objectFit: 'contain', flexShrink: 0 }}
            onError={(e) => (e.currentTarget.style.display = 'none')} />}
          <span style={{
            fontSize: 12, color: team.won ? '#f0f0f0' : '#888',
            fontWeight: team.won ? 700 : 400,
            flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>
            {team.shortName}
          </span>
          {(game.isFinal || game.isLive) && (
            <span style={{ fontSize: 12, fontWeight: 700, color: team.won ? '#22c55e' : game.isLive ? '#ff3b30' : '#555', flexShrink: 0 }}>
              {team.score}
            </span>
          )}
        </div>
      ))}
      <div style={{ padding: '3px 10px', background: '#141414', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9, color: '#444' }}>{game.venue?.split(' ').slice(0, 2).join(' ')}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {isUpset && <span style={{ fontSize: 8, color: '#ff6b35', fontWeight: 800 }}>⚡UPSET</span>}
          {game.isLive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#ff3b30', animation: 'pulse 1s infinite' }} />
              <span style={{ fontSize: 9, color: '#ff3b30', fontWeight: 700 }}>{game.status}</span>
            </div>
          )}
          {game.isFinal && <span style={{ fontSize: 9, color: '#444', fontWeight: 600 }}>FINAL</span>}
          {!game.isLive && !game.isFinal && <BracketCountdown date={game.date} />}
        </div>
      </div>
    </div>
  );
}

function BracketTab() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRound, setActiveRound] = useState('Round of 64');
  const [boxScoreGame, setBoxScoreGame] = useState<any>(null);
  const [boxScore, setBoxScore] = useState<any>(null);
  const [boxScoreLoading, setBoxScoreLoading] = useState(false);

  useEffect(() => {
    async function fetchBracket() {
      try {
        const res = await fetch('/api/bracket');
        const data = await res.json();
        setGames(data.games || []);
      } catch { }
      setLoading(false);
    }
    fetchBracket();
  }, []);

  async function openBoxScore(game: any) {
    setBoxScoreGame(game);
    setBoxScore(null);
    setBoxScoreLoading(true);
    try {
      const res = await fetch(`/api/boxscore?id=${game.id}`);
      const data = await res.json();
      setBoxScore(data.teams);
    } catch { }
    setBoxScoreLoading(false);
  }

  const rounds = ['Round of 64', 'Round of 32', 'Sweet 16', 'Elite 8', 'Final Four', 'Championship'];
  const roundShort: Record<string, string> = {
    'Round of 64': 'R64', 'Round of 32': 'R32',
    'Sweet 16': 'S16', 'Elite 8': 'E8',
    'Final Four': 'F4', 'Championship': 'Chip'
  };

  const roundGames = games
    .filter(g =>
      g.round === activeRound &&
      g.home.name !== 'TBD' &&
      g.away.name !== 'TBD'
    )
    .sort((a, b) => {
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;
      if (a.isFinal && !b.isFinal) return -1;
      if (!a.isFinal && b.isFinal) return 1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

  const roundAllGames = games.filter(g => g.round === activeRound);
  const finalCount = roundAllGames.filter(g => g.isFinal).length;
  const liveCount = roundAllGames.filter(g => g.isLive).length;
  const upsetCount = roundAllGames.filter(g => g.isFinal && (
    (g.home.won && parseInt(g.home.seed) > parseInt(g.away.seed) + 2) ||
    (g.away.won && parseInt(g.away.seed) > parseInt(g.home.seed) + 2)
  )).length;

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: '#555' }}>Loading bracket...</div>;

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ background: '#1a1a1a', borderRadius: 10, padding: '10px 16px', border: '1px solid #2a2a2a', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#22c55e' }}>{finalCount}</div>
          <div style={{ fontSize: 10, color: '#777', letterSpacing: '0.06em' }}>COMPLETED</div>
        </div>
        <div style={{ background: '#1a1a1a', borderRadius: 10, padding: '10px 16px', border: '1px solid #2a2a2a', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#ff3b30' }}>{liveCount}</div>
          <div style={{ fontSize: 10, color: '#777', letterSpacing: '0.06em' }}>LIVE NOW</div>
        </div>
        <div style={{ background: '#1a1a1a', borderRadius: 10, padding: '10px 16px', border: '1px solid #2a2a2a', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#ff6b35' }}>{upsetCount}</div>
          <div style={{ fontSize: 10, color: '#777', letterSpacing: '0.06em' }}>UPSETS</div>
        </div>
        <div style={{ background: '#1a1a1a', borderRadius: 10, padding: '10px 16px', border: '1px solid #2a2a2a', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#f0f0f0' }}>{roundAllGames.length}</div>
          <div style={{ fontSize: 10, color: '#777', letterSpacing: '0.06em' }}>TOTAL GAMES</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {rounds.map(r => (
          <button key={r} onClick={() => setActiveRound(r)} style={{
            padding: '6px 14px', fontSize: 12, fontWeight: 700,
            borderRadius: 20, border: '1px solid',
            borderColor: activeRound === r ? '#ff6b35' : '#2a2a2a',
            background: activeRound === r ? '#ff6b35' : 'transparent',
            color: activeRound === r ? '#fff' : '#666', cursor: 'pointer'
          }}>{roundShort[r]}</button>
        ))}
      </div>

      {roundGames.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#555', fontSize: 13 }}>
          {activeRound === 'Round of 64' ? 'Games loading...' : 'No games yet. Check back as the tournament progresses.'}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {roundGames.map((game: any) => {
          const isUpset = game.isFinal && (
            (game.home.won && parseInt(game.home.seed) > parseInt(game.away.seed) + 2) ||
            (game.away.won && parseInt(game.away.seed) > parseInt(game.home.seed) + 2)
          );
          return (
            <div key={game.id}
              onClick={() => (game.isFinal || game.isLive) && openBoxScore(game)}
              style={{
                background: '#1a1a1a',
                border: `1px solid ${isUpset ? '#ff6b3566' : '#2a2a2a'}`,
                borderRadius: 8,
                overflow: 'hidden',
                cursor: (game.isFinal || game.isLive) ? 'pointer' : 'default',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => { if (game.isFinal || game.isLive) (e.currentTarget as HTMLElement).style.borderColor = '#555'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = isUpset ? '#ff6b3566' : '#2a2a2a'; }}
            >
              {[game.away, game.home].map((team: any, i: number) => {
                const won = game.isFinal && team.won;
                const lost = game.isFinal && !team.won;
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 8px',
                    background: won ? '#1a2a1a' : 'transparent',
                    borderBottom: i === 0 ? '1px solid #222' : 'none',
                    opacity: lost ? 0.45 : 1,
                  }}>
                    <span style={{ fontSize: 10, color: '#555', width: 14, flexShrink: 0, textAlign: 'center', fontWeight: 600 }}>
                      {team.seed || '?'}
                    </span>
                    {team.logo && (
                      <img src={team.logo} alt="" style={{ width: 14, height: 14, objectFit: 'contain', flexShrink: 0 }}
                        onError={(e) => (e.currentTarget.style.display = 'none')} />
                    )}
                    <span style={{
                      fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      color: won ? '#f0f0f0' : '#888', fontWeight: won ? 700 : 400,
                    }}>
                      {team.shortName || team.name}
                    </span>
                    {(game.isFinal || game.isLive) && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: won ? '#22c55e' : game.isLive ? '#ff3b30' : '#555', flexShrink: 0 }}>
                        {team.score}
                      </span>
                    )}
                  </div>
                );
              })}
              <div style={{ padding: '3px 8px', background: '#141414', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {isUpset && <span style={{ fontSize: 8, color: '#ff6b35', fontWeight: 800 }}>⚡UPSET</span>}
                {game.isLive && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#ff3b30', animation: 'pulse 1s infinite' }} />
                    <span style={{ fontSize: 9, color: '#ff3b30', fontWeight: 700 }}>{game.status}</span>
                  </div>
                )}
                {game.isFinal && !isUpset && <span style={{ fontSize: 9, color: '#666' }}>FINAL</span>}
                {!game.isLive && !game.isFinal && (
                  <BracketCountdown date={game.date} />
                )}
                {(game.isFinal || game.isLive) && (
                  <span style={{ fontSize: 9, color: '#777' }}>tap for box score</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {boxScoreGame && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ background: '#161616', border: '1px solid #2a2a2a', borderRadius: 16, padding: '1.25rem', maxWidth: 600, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f0' }}>
                  {boxScoreGame.away.shortName} {boxScoreGame.isFinal ? boxScoreGame.away.score : ''} — {boxScoreGame.isFinal ? boxScoreGame.home.score : ''} {boxScoreGame.home.shortName}
                </div>
                <div style={{ fontSize: 11, color: '#555' }}>{boxScoreGame.status}</div>
              </div>
              <button onClick={() => { setBoxScoreGame(null); setBoxScore(null); }}
                style={{ background: '#2a2a2a', border: 'none', color: '#888', fontSize: 16, cursor: 'pointer', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            {boxScoreLoading && <div style={{ textAlign: 'center', padding: '2rem', color: '#555' }}>Loading box score...</div>}

            {boxScore && boxScore.map((team: any, ti: number) => (
              <div key={ti} style={{ marginBottom: ti === 0 ? 20 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <img src={team.logo} alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#f0f0f0' }}>{team.team}</span>
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
                        <tr key={pi} style={{ borderBottom: '1px solid #1a1a1a' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#222')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <td style={{ padding: '5px 6px', color: '#ccc', whiteSpace: 'nowrap', fontWeight: p.starter ? 600 : 400 }}>
                            {p.starter && <span style={{ color: '#ff6b35', marginRight: 4, fontSize: 9 }}>▶</span>}
                            {p.name}
                          </td>
                          <td style={{ padding: '5px 6px', color: '#555', textAlign: 'center' }}>{p.min}</td>
                          <td style={{ padding: '5px 6px', color: parseInt(p.pts) >= 15 ? '#22c55e' : '#f0f0f0', textAlign: 'center', fontWeight: parseInt(p.pts) >= 15 ? 700 : 400 }}>{p.pts}</td>
                          <td style={{ padding: '5px 6px', color: '#ccc', textAlign: 'center' }}>{p.reb}</td>
                          <td style={{ padding: '5px 6px', color: '#ccc', textAlign: 'center' }}>{p.ast}</td>
                          <td style={{ padding: '5px 6px', color: '#ccc', textAlign: 'center' }}>{p.stl}</td>
                          <td style={{ padding: '5px 6px', color: '#ccc', textAlign: 'center' }}>{p.blk}</td>
                          <td style={{ padding: '5px 6px', color: '#666', textAlign: 'center' }}>{p.fg}</td>
                          <td style={{ padding: '5px 6px', color: '#666', textAlign: 'center' }}>{p.threes}</td>
                          <td style={{ padding: '5px 6px', color: '#666', textAlign: 'center' }}>{p.ft}</td>
                          <td style={{ padding: '5px 6px', color: '#666', textAlign: 'center' }}>{p.to}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {team.totals && (
                  <div style={{ marginTop: 10, padding: '10px 12px', background: '#111', borderRadius: 8, border: '1px solid #222' }}>
                    <div style={{ fontSize: 10, color: '#555', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 8 }}>TEAM TOTALS</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {[
                        { label: 'PTS', value: team.totals.pts },
                        { label: 'FG', value: team.totals.fg },
                        { label: 'FG%', value: team.totals.fgPct },
                        { label: '3PT', value: team.totals.threes },
                        { label: '3P%', value: team.totals.threePct },
                        { label: 'FT', value: team.totals.ft },
                        { label: 'FT%', value: team.totals.ftPct },
                        { label: 'REB', value: team.totals.reb },
                        { label: 'OREB', value: team.totals.oreb },
                        { label: 'DREB', value: team.totals.dreb },
                        { label: 'AST', value: team.totals.ast },
                        { label: 'STL', value: team.totals.stl },
                        { label: 'BLK', value: team.totals.blk },
                        { label: 'TO', value: team.totals.to },
                        { label: 'PF', value: team.totals.pf },
                      ].filter(s => s.value && s.value !== '-').map((s, i) => (
                        <div key={i} style={{ background: '#1a1a1a', borderRadius: 6, padding: '5px 8px', textAlign: 'center', minWidth: 44 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#f0f0f0' }}>{s.value}</div>
                          <div style={{ fontSize: 9, color: '#555' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UpsetHistoryTab() {
  const [upsets, setUpsets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [boxScoreGame, setBoxScoreGame] = useState<any>(null);
  const [boxScore, setBoxScore] = useState<any>(null);
  const [boxScoreLoading, setBoxScoreLoading] = useState(false);

  async function openBoxScore(game: any) {
    setBoxScoreGame(game);
    setBoxScore(null);
    setBoxScoreLoading(true);
    try {
      const res = await fetch(`/api/boxscore?id=${game.id}`);
      const data = await res.json();
      setBoxScore(data.teams);
    } catch { }
    setBoxScoreLoading(false);
  }

  useEffect(() => {
    async function fetchUpsets() {
      try {
        const res = await fetch('/api/bracket');
        const data = await res.json();
        const games = data.games || [];

        const upsetGames = games
          .filter((g: any) => {
            if (!g.isFinal) return false;
            if (g.home.name === 'TBD' || g.away.name === 'TBD') return false;
            const homeSeed = parseInt(g.home.seed || '0');
            const awaySeed = parseInt(g.away.seed || '0');
            if (!homeSeed || !awaySeed) return false;
            const winnerSeed = g.home.won ? homeSeed : awaySeed;
            const loserSeed = g.home.won ? awaySeed : homeSeed;
            return winnerSeed > loserSeed;
          })
          .map((g: any) => {
            const winner = g.home.won ? g.home : g.away;
            const loser = g.home.won ? g.away : g.home;
            const magnitude = parseInt(winner.seed) - parseInt(loser.seed);
            const margin = Math.abs(parseInt(g.home.score) - parseInt(g.away.score));
            return { ...g, winner, loser, magnitude, margin };
          })
          .sort((a: any, b: any) => b.magnitude - a.magnitude);

        setUpsets(upsetGames);
      } catch { }
      setLoading(false);
    }
    fetchUpsets();
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: '#555' }}>Loading upsets...</div>;

  if (upsets.length === 0) return (
    <div style={{ textAlign: 'center', padding: '3rem', color: '#555', fontSize: 13 }}>
      No upsets yet. Check back as games finish.
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: '1rem', padding: '12px 16px', background: '#1a1a1a', borderRadius: 10, border: '1px solid #2a2a2a' }}>
        <div style={{ fontSize: 11, color: '#ff6b35', fontWeight: 800, marginBottom: 4, letterSpacing: '0.06em' }}>⚡ UPSET HISTORY</div>
        <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6 }}>
          Every upset of the 2026 tournament ranked by magnitude. Bigger seed differential = bigger upset.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {upsets.map((g: any, i: number) => (
          <div key={g.id} style={{
            background: '#1a1a1a',
            border: '1px solid #ff6b3533',
            borderRadius: 14,
            padding: '1rem 1.25rem',
            borderLeft: '4px solid #ff6b35',
            position: 'relative',
          }}>
            <div style={{ position: 'absolute', top: 12, right: 12, background: '#ff6b35', color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20 }}>
              #{i + 1} UPSET
            </div>

            <div style={{ fontSize: 10, color: '#ff6b35', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 10 }}>
              {g.magnitude}-SEED UPSET · {g.round}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {g.winner.logo && <img src={g.winner.logo} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} onError={(e) => (e.currentTarget.style.display = 'none')} />}
                <div>
                  <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 700, marginBottom: 2 }}>WINNER</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f0' }}>#{g.winner.seed} {g.winner.shortName}</div>
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#f0f0f0' }}>
                  {g.winner.score} – {g.loser.score}
                </div>
                <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>by {g.margin} pts</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: '#666', fontWeight: 700, marginBottom: 2 }}>ELIMINATED</div>
                  <div style={{ fontSize: 14, fontWeight: 400, color: '#666' }}>#{g.loser.seed} {g.loser.shortName}</div>
                </div>
                {g.loser.logo && <img src={g.loser.logo} alt="" style={{ width: 32, height: 32, objectFit: 'contain', opacity: 0.4 }} onError={(e) => (e.currentTarget.style.display = 'none')} />}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#555' }}>📍 {g.venue}</span>
                <span style={{ fontSize: 11, color: '#444' }}>·</span>
                <span style={{ fontSize: 11, color: '#444' }}>{g.status}</span>
              </div>
              <button onClick={() => openBoxScore(g)} style={{
                padding: '5px 12px', fontSize: 11, fontWeight: 600,
                background: 'transparent', border: '1px solid #333',
                borderRadius: 8, color: '#666', cursor: 'pointer'
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff6b35'; e.currentTarget.style.color = '#ff6b35'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#666'; }}>
                📊 Box score
              </button>
            </div>
          </div>
        ))}
      </div>

      {boxScoreGame && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ background: '#161616', border: '1px solid #2a2a2a', borderRadius: 16, padding: '1.25rem', maxWidth: 600, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f0' }}>
                  ⚡ #{boxScoreGame.winner.seed} {boxScoreGame.winner.shortName} def. #{boxScoreGame.loser.seed} {boxScoreGame.loser.shortName}
                </div>
                <div style={{ fontSize: 11, color: '#555' }}>{boxScoreGame.winner.score} – {boxScoreGame.loser.score} · {boxScoreGame.status}</div>
              </div>
              <button onClick={() => { setBoxScoreGame(null); setBoxScore(null); }}
                style={{ background: '#2a2a2a', border: 'none', color: '#888', fontSize: 16, cursor: 'pointer', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            {boxScoreLoading && <div style={{ textAlign: 'center', padding: '2rem', color: '#555' }}>Loading box score...</div>}

            {boxScore && boxScore.map((team: any, ti: number) => (
              <div key={ti} style={{ marginBottom: ti === 0 ? 20 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <img src={team.logo} alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#f0f0f0' }}>{team.team}</span>
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
                        <tr key={pi} style={{ borderBottom: '1px solid #1a1a1a' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#222')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <td style={{ padding: '5px 6px', color: '#ccc', whiteSpace: 'nowrap', fontWeight: p.starter ? 600 : 400 }}>
                            {p.starter && <span style={{ color: '#ff6b35', marginRight: 4, fontSize: 9 }}>▶</span>}
                            {p.name}
                          </td>
                          <td style={{ padding: '5px 6px', color: '#555', textAlign: 'center' }}>{p.min}</td>
                          <td style={{ padding: '5px 6px', color: parseInt(p.pts) >= 15 ? '#22c55e' : '#f0f0f0', textAlign: 'center', fontWeight: parseInt(p.pts) >= 15 ? 700 : 400 }}>{p.pts}</td>
                          <td style={{ padding: '5px 6px', color: '#ccc', textAlign: 'center' }}>{p.reb}</td>
                          <td style={{ padding: '5px 6px', color: '#ccc', textAlign: 'center' }}>{p.ast}</td>
                          <td style={{ padding: '5px 6px', color: '#ccc', textAlign: 'center' }}>{p.stl}</td>
                          <td style={{ padding: '5px 6px', color: '#ccc', textAlign: 'center' }}>{p.blk}</td>
                          <td style={{ padding: '5px 6px', color: '#666', textAlign: 'center' }}>{p.fg}</td>
                          <td style={{ padding: '5px 6px', color: '#666', textAlign: 'center' }}>{p.threes}</td>
                          <td style={{ padding: '5px 6px', color: '#666', textAlign: 'center' }}>{p.ft}</td>
                          <td style={{ padding: '5px 6px', color: '#666', textAlign: 'center' }}>{p.to}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {team.totals && (
                  <div style={{ marginTop: 10, padding: '10px 12px', background: '#111', borderRadius: 8, border: '1px solid #222' }}>
                    <div style={{ fontSize: 10, color: '#555', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 8 }}>TEAM TOTALS</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {[
                        { label: 'FG', value: team.totals.fg },
                        { label: 'FG%', value: team.totals.fgPct },
                        { label: '3PT', value: team.totals.threes },
                        { label: 'FT', value: team.totals.ft },
                        { label: 'REB', value: team.totals.reb },
                        { label: 'AST', value: team.totals.ast },
                        { label: 'TO', value: team.totals.to },
                        { label: 'STL', value: team.totals.stl },
                        { label: 'BLK', value: team.totals.blk },
                      ].filter(s => s.value && s.value !== '-').map((s, idx) => (
                        <div key={idx} style={{ background: '#1a1a1a', borderRadius: 6, padding: '5px 8px', textAlign: 'center', minWidth: 44 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#f0f0f0' }}>{s.value}</div>
                          <div style={{ fontSize: 9, color: '#555' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


function LeadersTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('topGames');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  

  useEffect(() => {
    async function fetchLeaders() {
      try {
        const res = await fetch('/api/leaders');
        const json = await res.json();
        setData(json);
      } catch { }
      setLoading(false);
    }
    fetchLeaders();
  }, []);

  const categories = [
    { key: 'topGames', label: '🔥 Top Games', statKey: 'gameScore', statLabel: 'SCORE', isTopGame: true },
    { key: 'scoring', label: '🏀 Scoring', statKey: 'ppg', statLabel: 'PPG' },
    { key: 'rebounds', label: '💪 Rebounds', statKey: 'rpg', statLabel: 'RPG' },
    { key: 'assists', label: '🎯 Assists', statKey: 'apg', statLabel: 'APG' },
    { key: 'steals', label: '🔒 Steals', statKey: 'spg', statLabel: 'SPG' },
    { key: 'blocks', label: '🛡 Blocks', statKey: 'bpg', statLabel: 'BPG' },
  ];

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: '#555' }}>Loading leaders...</div>;
  if (!data) return <div style={{ textAlign: 'center', padding: '3rem', color: '#555' }}>No data available.</div>;

  const activeCat = categories.find(c => c.key === activeCategory)!;
  const allPlayers = (data[activeCategory] || []).filter((p: any) =>
    search === '' ? true :
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.team.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(allPlayers.length / PAGE_SIZE);
  const players = allPlayers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {categories.map(c => (
          <button key={c.key} onClick={() => { setActiveCategory(c.key); setSearch(''); setPage(1); }} style={{
            padding: '6px 12px', fontSize: 11, fontWeight: 700,
            borderRadius: 20, border: '1px solid',
            borderColor: activeCategory === c.key ? '#ff6b35' : '#2a2a2a',
            background: activeCategory === c.key ? '#ff6b35' : 'transparent',
            color: activeCategory === c.key ? '#fff' : '#666', cursor: 'pointer'
          }}>{c.label}</button>
        ))}
      </div>

      <input
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(1); }}
        placeholder="Search players or teams..."
        style={{
          width: '100%', fontSize: 14, padding: '11px 16px',
          border: '1px solid #2a2a2a', borderRadius: 10,
          background: '#1a1a1a', color: '#f0f0f0',
          marginBottom: 12, outline: 'none'
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {players.map((p: any, i: number) => {
          const statValue = activeCat.isTopGame ? (p.topGame?.gameScore ?? p.topGame?.pts ?? 0) : p[activeCat.statKey];
          if (i === 0) console.log('top player topGame:', p.topGame);
          const isTop3 = i < 3;

          return (
            <div key={p.id} style={{
              background: '#1a1a1a',
              border: `1px solid ${isTop3 ? '#ff6b3533' : '#2a2a2a'}`,
              borderRadius: 12,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              borderLeft: isTop3 ? `4px solid ${i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : '#CD7F32'}` : '4px solid #2a2a2a',
            }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#444', width: 24, textAlign: 'center', flexShrink: 0 }}>
                {i + 1}
              </div>

              {p.headshot ? (
                <img src={p.headshot} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  onError={(e) => (e.currentTarget.style.display = 'none')} />
              ) : (
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#2a2a2a', flexShrink: 0 }} />
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f0', marginBottom: 2 }}>{p.shortName}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {p.teamLogo && <img src={p.teamLogo} alt="" style={{ width: 14, height: 14, objectFit: 'contain' }} onError={(e) => (e.currentTarget.style.display = 'none')} />}
                  <span style={{ fontSize: 11, color: '#666' }}>#{p.seed} {p.team}</span>
                </div>
                {activeCat.isTopGame && (
                  <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>
                    {p.topGame.pts}pts · {p.topGame.reb}reb · {p.topGame.ast}ast · {p.topGame.fg} FG · vs {p.topGame.opponent}
                  </div>
                )}
                {!activeCat.isTopGame && (
                  <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>
                    {p.games} game{p.games > 1 ? 's' : ''} · {p.ppg} PPG · {p.rpg} RPG · {p.apg} APG
                  </div>
                )}
              </div>

              {activeCat.isTopGame ? (() => {
                const score = p.topGame.gameScore;
                const color = (() => {
                  if (score <= 1) return '#ef4444';
                  if (score <= 5) {
                    const t = (score - 1) / 4;
                    const r = Math.round(239 + (255 - 239) * t);
                    const g = Math.round(68 + (107 - 68) * t);
                    const b = Math.round(68 + (53 - 68) * t);
                    return `rgb(${r},${g},${b})`;
                  }
                  const t = (score - 5) / 5;
                  const r = Math.round(255 - (255 - 34) * t);
                  const g = Math.round(107 + (197 - 107) * t);
                  const b = Math.round(53 + (94 - 53) * t);
                  return `rgb(${r},${g},${b})`;
                })();
                const radius = 22;
                const circumference = 2 * Math.PI * radius;
                const progress = (score / 10) * circumference;
                return (
                  <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
                    <svg width="56" height="56" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="28" cy="28" r={radius} fill="none" stroke="#2a2a2a" strokeWidth="3" />
                      <circle cx="28" cy="28" r={radius} fill="none" stroke={color} strokeWidth="3"
                        strokeDasharray={`${progress} ${circumference}`} strokeLinecap="round" />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
                      <span style={{ fontSize: 8, color: '#555', letterSpacing: '0.05em' }}>SCORE</span>
                    </div>
                  </div>
                );
              })() : (
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: isTop3 ? '#f0f0f0' : '#888' }}>
                    {p[activeCat.statKey]}
                  </div>
                  <div style={{ fontSize: 10, color: '#555', fontWeight: 600 }}>{activeCat.statLabel}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '6px 14px', fontSize: 12, fontWeight: 600,
              background: 'transparent', border: '1px solid #2a2a2a',
              borderRadius: 8, color: page === 1 ? '#333' : '#888',
              cursor: page === 1 ? 'default' : 'pointer'
            }}>← Prev</button>

          <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => setPage(n)} style={{
                width: 32, height: 32, fontSize: 12, fontWeight: 700,
                background: page === n ? '#ff6b35' : 'transparent',
                border: `1px solid ${page === n ? '#ff6b35' : '#2a2a2a'}`,
                borderRadius: 8, color: page === n ? '#fff' : '#666',
                cursor: 'pointer'
              }}>{n}</button>
            ))}
          </div>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding: '6px 14px', fontSize: 12, fontWeight: 600,
              background: 'transparent', border: '1px solid #2a2a2a',
              borderRadius: 8, color: page === totalPages ? '#333' : '#888',
              cursor: page === totalPages ? 'default' : 'pointer'
            }}>Next →</button>
        </div>
      )}
    </div>
  );
}


export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [playersLoading, setPlayersLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'games' | 'players' | 'bracket' | 'upsets' | 'leaders'>('games');
  const [gameFilter, setGameFilter] = useState<'all' | 'live' | 'final' | 'upcoming'>('all');
  const [nilPlayer, setNilPlayer] = useState<Player | null>(null);
  const [gameSearch, setGameSearch] = useState('');
  const [playerSearch, setPlayerSearch] = useState('');
  const [activeDateFilter, setActiveDateFilter] = useState<string>(
    new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'America/New_York' })
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { secondsAgo, markUpdated } = useLastUpdated();

  async function fetchAll(isManual = false) {
    if (isManual) setIsRefreshing(true);
    try {
      const [gamesRes, playersRes] = await Promise.all([
        fetch('/api/games'),
        fetch('/api/players')
      ]);
      const gamesData = await gamesRes.json();
      const playersData = await playersRes.json();
      setGames(parsedGames(gamesData));
      setPlayers(playersData.players || []);
      markUpdated();
    } catch (e) {
      console.log('Refresh failed, will retry');
    }
    setGamesLoading(false);
    setPlayersLoading(false);
    if (isManual) setIsRefreshing(false);
  }

  useEffect(() => {
    fetchAll();
    const interval = setInterval(() => fetchAll(), 60000);
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
      // Live first, then upcoming, then finals
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;
      if (!a.isFinal && b.isFinal) return -1;
      if (a.isFinal && !b.isFinal) return 1;
      // Among live games, sort by closest to end
      if (a.isLive && b.isLive) {
        const parseTime = (s: string) => {
          const match = s.match(/(\d+):(\d+)/);
          if (!match) return 999;
          return parseInt(match[1]) * 60 + parseInt(match[2]);
        };
        const aHalf = a.status.includes('2nd') ? 0 : 1;
        const bHalf = b.status.includes('2nd') ? 0 : 1;
        if (aHalf !== bHalf) return aHalf - bHalf;
        return parseTime(a.status) - parseTime(b.status);
      }
      return 0;
    });

  const filteredPlayers = players.filter(p =>
    playerSearch === '' ? true :
    p.name.toLowerCase().includes(playerSearch.toLowerCase()) ||
    p.team.toLowerCase().includes(playerSearch.toLowerCase())
  );

  const liveCount = games.filter(g => g.isLive).length;

  return (
    <main style={{ background: '#0f0f0f', minHeight: '100vh', padding: '1.5rem 1.25rem', maxWidth: 680, margin: '0 auto', paddingTop: '3.5rem' }}>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-33.333%); } }
        * { box-sizing: border-box; }
      `}</style>
      <ScoreTicker games={games} />

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
        <p style={{ fontSize: 12, color: '#777' }}>Live games · AI narratives · Cinderella tracker · NIL spotlight</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {liveCount > 0 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#22c55e18', padding: '4px 10px', borderRadius: 20, border: '1px solid #22c55e33' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse 1.5s infinite' }} />
              <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 700 }}>{liveCount} game{liveCount > 1 ? 's' : ''} live now</span>
            </div>
          )}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#555', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 11, color: '#666', fontWeight: 600 }}>
              {secondsAgo < 5 ? 'Just updated' : `Updated ${secondsAgo}s ago`}
            </span>
            <button
              onClick={() => fetchAll(true)}
              disabled={isRefreshing}
              style={{
                background: 'transparent',
                border: '1px solid #2a2a2a',
                borderRadius: 12,
                padding: '2px 8px',
                fontSize: 10,
                fontWeight: 700,
                color: isRefreshing ? '#333' : '#555',
                cursor: isRefreshing ? 'default' : 'pointer',
                letterSpacing: '0.04em',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!isRefreshing) { e.currentTarget.style.borderColor = '#ff6b35'; e.currentTarget.style.color = '#ff6b35'; }}}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = isRefreshing ? '#333' : '#555'; }}
            >
              {isRefreshing ? '↻ ...' : '↻ Refresh'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: '1.25rem', background: '#1a1a1a', borderRadius: 12, padding: 4, border: '1px solid #2a2a2a' }}>
        {(['games', 'players', 'bracket', 'upsets', 'leaders'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            flex: 1, padding: '10px 8px', fontSize: 13, fontWeight: 700,
            background: activeTab === tab ? '#ff6b35' : 'transparent',
            border: 'none', borderRadius: 9,
            color: activeTab === tab ? '#fff' : '#888',
            cursor: 'pointer', transition: 'all 0.15s',
            letterSpacing: '0.02em'
          }}>
            {tab === 'games' ? '🏀 Live' : tab === 'players' ? '⭐ Cinderella' : tab === 'bracket' ? '🗓 Bracket' : tab === 'upsets' ? '⚡ Upsets' : '🏆 Leaders'}
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
          {(() => {
            // Build all groups first
            const allGroups: { label: string; dateKey: string; games: typeof filteredGames }[] = [];
            filteredGames.forEach(game => {
              const dateKey = new Date(game.date).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', timeZone: 'America/New_York'
              });
              const existing = allGroups.find(g => g.dateKey === dateKey);
              if (existing) existing.games.push(game);
              else allGroups.push({ label: dateKey, dateKey, games: [game] });
            });

            // Sort groups by date ascending
            allGroups.sort((a, b) => {
              const aDate = filteredGames.find(g =>
                new Date(g.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'America/New_York' }) === a.dateKey
              )?.date || '';
              const bDate = filteredGames.find(g =>
                new Date(g.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'America/New_York' }) === b.dateKey
              )?.date || '';
              return new Date(aDate).getTime() - new Date(bDate).getTime();
            });

            // Sort within each group: live first, then upcoming by time, then finals
            allGroups.forEach(group => {
              group.games.sort((a, b) => {
                if (a.isLive && !b.isLive) return -1;
                if (!a.isLive && b.isLive) return 1;
                if (!a.isFinal && b.isFinal) return -1;
                if (a.isFinal && !b.isFinal) return 1;
                if (a.isLive && b.isLive) {
                  const parseTime = (s: string) => {
                    const match = s.match(/(\d+):(\d+)/);
                    if (!match) return 999;
                    return parseInt(match[1]) * 60 + parseInt(match[2]);
                  };
                  const aHalf = a.status.includes('2nd') ? 0 : 1;
                  const bHalf = b.status.includes('2nd') ? 0 : 1;
                  if (aHalf !== bHalf) return aHalf - bHalf;
                  return parseTime(a.status) - parseTime(b.status);
                }
                return new Date(a.date).getTime() - new Date(b.date).getTime();
              });
            });

            // Date filter pills
            const visibleGroups = activeDateFilter === 'all'
              ? allGroups
              : allGroups.filter(g => g.dateKey === activeDateFilter);

            return (
              <>
                {/* ESPN-style date selector */}
                {allGroups.length > 1 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'stretch',
                    background: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    borderRadius: 12,
                    overflow: 'hidden',
                    marginBottom: 16,
                    height: 76,
                  }}>
                    {allGroups.map((group, i) => {
                      const d = new Date(
                        filteredGames.find(g =>
                          new Date(g.date).toLocaleDateString('en-US', {
                            month: 'long', day: 'numeric', timeZone: 'America/New_York'
                          }) === group.dateKey
                        )?.date || ''
                      );
                      const dayName = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/New_York' }).toUpperCase();
                      const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' }).toUpperCase();
                      const isActive = activeDateFilter === group.dateKey;
                      const liveInGroup = group.games.filter(g => g.isLive).length;
                      return (
                        <button
                          key={group.dateKey}
                          onClick={() => setActiveDateFilter(group.dateKey)}
                          style={{
                            flex: '1 1 0',
                            width: 0,
                            minWidth: 0,
                            padding: '12px 8px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 2,
                            background: isActive ? '#ff6b35' : 'transparent',
                            border: 'none',
                            borderRight: i < allGroups.length - 1 ? '1px solid #2a2a2a' : 'none',
                            cursor: 'pointer',
                            transition: 'background 0.15s',
                            position: 'relative',
                          }}>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: isActive ? '#fff' : '#666',
                            letterSpacing: '0.06em',
                            lineHeight: '1',
                            display: 'block',
                          }}>
                            {dayName}
                          </span>
                          <span style={{
                            fontSize: 13,
                            fontWeight: 800,
                            color: isActive ? '#fff' : '#f0f0f0',
                            letterSpacing: '0.02em',
                            lineHeight: '1',
                            display: 'block',
                          }}>
                            {monthDay}
                          </span>
                          {liveInGroup > 0 && (
                            <div style={{
                              position: 'absolute', top: 6, right: 8,
                              width: 6, height: 6, borderRadius: '50%',
                              background: isActive ? '#fff' : '#22c55e',
                              animation: 'pulse 1.5s infinite',
                            }} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Game groups — no header when filtered to single date */}
                {visibleGroups.map((group, gi) => (
                  <div key={group.dateKey}>
                    {visibleGroups.length > 1 && (
                      <div style={{
                        fontSize: 12, fontWeight: 800, color: '#f0f0f0',
                        letterSpacing: '0.06em', marginBottom: 12,
                        marginTop: gi === 0 ? 0 : 20,
                        paddingBottom: 8, paddingTop: 8, paddingLeft: 12,
                        borderBottom: '1px solid #2a2a2a',
                        borderLeft: '3px solid #ff6b35',
                        background: '#1a1a1a',
                        borderRadius: 6,
                        textTransform: 'uppercase',
                      }}>
                        📅 {group.label}
                        <span style={{ fontSize: 10, color: '#555', fontWeight: 600, marginLeft: 8 }}>
                          {group.games.length} game{group.games.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                    {group.games.map(game => <GameCard key={game.id} game={game} />)}
                  </div>
                ))}
              </>
            );
          })()}
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
      {activeTab === 'bracket' && <BracketTab />}
      {activeTab === 'upsets' && <UpsetHistoryTab />}
      {activeTab === 'leaders' && <LeadersTab />}
      {nilPlayer && <NILModal player={nilPlayer} onClose={() => setNilPlayer(null)} />}
    </main>
  );
}