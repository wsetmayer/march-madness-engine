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

function TournamentChat({ games, players }: { games: Game[]; players: Player[] }) {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<{ role: 'user' | 'assistant'; text: string }[]>([
    { role: 'assistant', text: "What's up. I've got full live tournament context — scores, upsets, leaders, Cinderella stories. Ask me anything." }
  ]);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [leadersData, setLeadersData] = React.useState<any>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const [bracketData, setBracketData] = React.useState<any>(null);

  React.useEffect(() => {
    fetch('/api/leaders').then(r => r.json()).then(d => setLeadersData(d)).catch(() => {});
    fetch('/api/bracket').then(r => r.json()).then(d => setBracketData(d)).catch(() => {});
  }, []);

  React.useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  function buildContext() {
    const liveGames = games.filter(g => g.isLive);
    const finalGames = games.filter(g => g.isFinal);
    const upcomingGames = games.filter(g => !g.isLive && !g.isFinal);

    // Date helpers — must be defined first
    const todayStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'America/New_York' });
    const yesterdayStr = new Date(Date.now() - 86400000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'America/New_York' });

    const getDateLabel = (dateStr: string): string => {
      const d = new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'America/New_York' });
      if (d === todayStr) return `TODAY (${todayStr})`;
      if (d === yesterdayStr) return `YESTERDAY (${yesterdayStr})`;
      return d;
    };

    const getGameDate = (dateStr: string): string => dateStr ? getDateLabel(dateStr) : '';

    // Use bracket data for complete game history (covers Mar 18-19 which games API misses)
    const allFinals = bracketData?.games?.filter((g: any) =>
      g.isFinal && g.home.name !== 'TBD' && g.away.name !== 'TBD'
    ) || finalGames;

    // Group ALL finals by date label
    const finalsByDate: Record<string, any[]> = {};
    allFinals.forEach((g: any) => {
      const label = getDateLabel(g.date);
      if (!finalsByDate[label]) finalsByDate[label] = [];
      finalsByDate[label].push(g);
    });

    const gamesText = [
      liveGames.length > 0
        ? `LIVE RIGHT NOW:\n${liveGames.map(g =>
            `- #${g.away.seed} ${g.away.name} ${g.away.score} vs #${g.home.seed} ${g.home.name} ${g.home.score} (${g.status})`
          ).join('\n')}`
        : `No games live right now. Today is ${todayStr}.`,

      ...Object.entries(finalsByDate).map(([label, gs]) =>
        `COMPLETED GAMES — ${label}:\n${gs.map(g => {
          const homeWon = parseInt(g.home.score) > parseInt(g.away.score);
          const winner = homeWon ? g.home : g.away;
          const loser = homeWon ? g.away : g.home;
          const isUpset = parseInt(winner.seed || '0') > parseInt(loser.seed || '0') + 2;
          return `- #${winner.seed} ${winner.name} def #${loser.seed} ${loser.name} ${winner.score}-${loser.score}${isUpset ? ' ⚡UPSET' : ''}`;
        }).join('\n')}`
      ),

      upcomingGames.filter(g => getDateLabel(g.date).includes(todayStr)).length > 0
        ? `UPCOMING TODAY (${todayStr}):\n${upcomingGames
            .filter(g => getDateLabel(g.date).includes(todayStr))
            .slice(0, 10)
            .map(g => `- #${g.away.seed} ${g.away.name} vs #${g.home.seed} ${g.home.name} (${g.time})`)
            .join('\n')}`
        : '',
    ].filter(Boolean).join('\n\n');

    const allUpsets = allFinals.filter((g: any) => {
      const homeSeed = parseInt(g.home.seed || '8');
      const awaySeed = parseInt(g.away.seed || '8');
      const homeWon = parseInt(g.home.score) > parseInt(g.away.score);
      return (homeWon && homeSeed > awaySeed + 2) || (!homeWon && awaySeed > homeSeed + 2);
    }).map((g: any) => {
      const homeWon = parseInt(g.home.score) > parseInt(g.away.score);
      const winner = homeWon ? g.home : g.away;
      const loser = homeWon ? g.away : g.home;
      const diff = Math.abs(parseInt(winner.seed || '0') - parseInt(loser.seed || '0'));
      return `- ${getDateLabel(g.date)}: #${winner.seed} ${winner.name} def #${loser.seed} ${loser.name} ${winner.score}-${loser.score} (${diff}-seed upset)`;
    }).join('\n') || 'No upsets yet';

    const cinderellas = players.slice(0, 8).map(p =>
      `- ${p.name} (${p.team} #${p.teamSeed}) — Cinderella Score ${p.cinderellaScore}/10. Upset #${p.oppSeed} ${p.oppName}. Stats: ${Object.values(p.stats).map((s: any) => `${s.value} ${s.label}`).join(', ')}`
    ).join('\n') || 'No cinderella data yet';

    const scoring = leadersData?.scoring?.slice(0, 20).map((p: any) => {
      const dateLabel = getGameDate(p.topGame?.date);
      return `- ${p.name} (${p.team} #${p.seed} seed): ${p.ppg} PPG, ${p.rpg} RPG, ${p.apg} APG${dateLabel ? ` [game: ${dateLabel}]` : ''}`;
    }).join('\n') || 'No scoring data yet';

    const topGames = leadersData?.topGames?.slice(0, 10).map((p: any) => {
      const dateLabel = getGameDate(p.topGame?.date);
      return `- ${p.name} (${p.team}): ${p.topGame?.pts}pts ${p.topGame?.reb}reb ${p.topGame?.ast}ast vs ${p.topGame?.opponent}${dateLabel ? ` [${dateLabel}]` : ''} — Game Score ${p.topGame?.gameScore}/10`;
    }).join('\n') || 'No top games data yet';

   const allPlayers = leadersData?.scoring?.map((p: any) => {
      const dateLabel = getGameDate(p.topGame?.date);
      return `- ${p.name} (${p.team}) vs ${p.topGame?.opponent}: ${p.topGame?.pts}pts ${p.topGame?.reb}reb ${p.topGame?.ast}ast ${p.topGame?.fg} FG${dateLabel ? ` [${dateLabel}]` : ''}`;
    }).join('\n') || '';

    const leaders = `TOP SCORING LEADERS:\n${scoring}\n\nTOP INDIVIDUAL PERFORMANCES:\n${topGames}\n\nALL TOURNAMENT PLAYERS (use for specific player/game lookups):\n${allPlayers}`;

    // All final scores from every tournament game
    const allScores = allFinals
      .map((g: any) => {
        const homeWon = parseInt(g.home.score) > parseInt(g.away.score);
        const winner = homeWon ? g.home : g.away;
        const loser = homeWon ? g.away : g.home;
        const dateLabel = getDateLabel(g.date);
        return `- #${winner.seed} ${winner.name} def #${loser.seed} ${loser.name} ${winner.score}-${loser.score} [${dateLabel}]`;
      }).join('\n') || 'No completed games yet';

    return { games: gamesText, upsets: allUpsets, leaders, cinderellas, scores: allScores };
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const context = buildContext();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, context }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', text: data.reply || 'Unable to respond.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Something went wrong. Try again.' }]);
    }
    setLoading(false);
  }

  const suggestions = [
    "Who's the best story of the tournament?",
    "Which game should I watch right now?",
    "Who's the biggest upset threat today?",
    "Give me your Final Four prediction",
  ];

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 200,
          width: 56, height: 56, borderRadius: '50%',
          background: open ? '#2a2a2a' : 'linear-gradient(135deg, #ff6b35, #ff4500)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: open ? 'none' : '0 4px 32px rgba(255,107,53,0.65)',
          fontSize: 22, transition: 'all 0.2s',
          animation: open ? 'none' : 'bounce 2s ease-in-out 3s 3',
        }}>
        {open ? '✕' : '🤖'}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 92, right: 24, zIndex: 199,
          width: 360, height: 520,
          background: '#141414', border: '1px solid #2a2a2a',
          borderRadius: 20, display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px', borderBottom: '1px solid #2a2a2a',
            background: '#1a1a1a',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #ff6b35, #ff4500)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, flexShrink: 0,
            }}>🤖</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#f0f0f0' }}>Tournament Analyst</div>
              <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 600 }}>● Live context loaded</div>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '12px 14px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                animation: 'fadeIn 0.25s ease forwards',
              }}>
                <div style={{
                  maxWidth: '85%', padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: msg.role === 'user' ? '#ff6b35' : '#2a2a2a',
                  fontSize: 13, color: '#f0f0f0', lineHeight: 1.6,
                }}
                  dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#f0f0f0;font-weight:700">$1</strong>') }}
                />
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '10px 14px', borderRadius: '18px 18px 18px 4px',
                  background: '#2a2a2a', fontSize: 13, color: '#555',
                  fontStyle: 'italic',
                }}>
                  Analyzing tournament data...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions — only show on first message */}
          {messages.length === 1 && (
            <div style={{ padding: '0 14px 10px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => { setInput(s); }}
                  style={{
                    fontSize: 10, padding: '4px 10px',
                    background: 'transparent', border: '1px solid #333',
                    borderRadius: 12, color: '#888', cursor: 'pointer',
                    textAlign: 'left', lineHeight: 1.4,
                  }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{
            padding: '10px 12px', borderTop: '1px solid #2a2a2a',
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Ask anything about the tournament..."
              style={{
                flex: 1, background: '#2a2a2a', border: '1px solid #333',
                borderRadius: 20, padding: '8px 14px',
                fontSize: 12, color: '#f0f0f0', outline: 'none',
              }}
            />
            <button onClick={sendMessage} disabled={loading || !input.trim()}
              style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                background: input.trim() && !loading ? '#ff6b35' : '#2a2a2a',
                border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default',
                fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}>
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function DNAReport({ gameId }: { gameId: string }) {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  async function generate() {
    if (data) { setExpanded(!expanded); return; }
    setLoading(true);
    setExpanded(true);
    try {
      const res = await fetch(`/api/dna?id=${gameId}`);
      const json = await res.json();
      setData(json);
    } catch { }
    setLoading(false);
  }

  const report = data?.report || '';

  return (
    <>
      <button onClick={generate} style={{
        flex: 1, padding: '9px', fontSize: 12, fontWeight: 600,
        background: expanded ? '#2a2a2a' : 'transparent',
        border: '1px solid #2a2a2a', borderRadius: 8,
        color: expanded ? '#f0f0f0' : '#666', cursor: 'pointer',
        letterSpacing: '0.03em',
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff6b35'; e.currentTarget.style.color = '#ff6b35'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = expanded ? '#f0f0f0' : '#666'; }}>
        {loading ? '🧬 Analyzing...' : expanded ? '▲ Hide DNA report' : '🧬 DNA report'}
      </button>

      {expanded && (
        <div style={{
          marginTop: 10, padding: '14px 16px',
          background: '#111', borderRadius: 10,
          borderLeft: '3px solid #ff6b35',
        }}>
          {loading ? (
            <div style={{ fontSize: 13, color: '#555', fontStyle: 'italic' }}>
              Analyzing matchup DNA...
            </div>
          ) : (
            <>
              {data?.awayTeam && data?.homeTeam && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  {[data.awayTeam, data.homeTeam].map((t: any, i: number) => (
                    <div key={i} style={{
                      flex: 1, background: '#1a1a1a', borderRadius: 8,
                      padding: '8px 10px', border: '1px solid #2a2a2a',
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#f0f0f0', marginBottom: 6 }}>
                        {t.seed ? `#${t.seed} ` : ''}{t.name?.split(' ').slice(-1)[0]}
                      </div>
                      {[
                        { label: 'PPG', value: t.ppg },
                        { label: 'OPP', value: t.oppPpg },
                        { label: 'FG%', value: t.fgPct ? `${t.fgPct}%` : null },
                        { label: '3P%', value: t.threePct ? `${t.threePct}%` : null },
                        { label: 'REB', value: t.reb },
                        { label: 'TO', value: t.to },
                      ].filter(s => s.value).map((s, j) => (
                        <div key={j} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontSize: 10, color: '#555' }}>{s.label}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#aaa' }}>{s.value}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                {report.split('\n').map((line: string, i: number) => {
                  const isHeader = /^[🔑⚡🎯🏆]/.test(line);
                  const parsed = line.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#f0f0f0;font-weight:700">$1</strong>');
                  if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
                  return (
                    <div key={i}
                      style={{
                        marginBottom: isHeader ? 2 : 4,
                        color: isHeader ? '#f0f0f0' : '#bbb',
                        fontWeight: isHeader ? 700 : 400,
                        fontSize: isHeader ? 12 : 13,
                      }}
                      dangerouslySetInnerHTML={{ __html: parsed }}
                    />
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </>
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

  const today = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', timeZone: 'America/New_York'
  });
  const tickerGames = [...games]
    .filter(g => {
      if (g.home.name === 'TBD' || g.away.name === 'TBD') return false;
      // Always show live games regardless of date
      if (g.isLive) return true;
      // Only show finals and upcoming from today
      const gameDate = new Date(g.date).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', timeZone: 'America/New_York'
      });
      return gameDate === today;
    })
    .sort((a, b) => {
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;
      if (!a.isFinal && b.isFinal) return -1;
      if (a.isFinal && !b.isFinal) return 1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
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
      background: '#111111',
      borderBottom: '1px solid #333',
      overflow: 'hidden',
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 50,
      height: 40,
      maskImage: 'linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)',
      WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)',
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

  const accentColor = isUpset ? '#ff6b35' : game.isLive ? '#22c55e' : '#2a2a2a';

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
        <div style={{ fontSize: 10, color: '#888', marginBottom: 10, letterSpacing: '0.12em', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#333' }} />
          FINAL
        </div>
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
              <div style={{ fontSize: 30, fontWeight: 900, color: '#f0f0f0', letterSpacing: 1, marginBottom: 6 }}>
                {game.away.score} <span style={{ color: '#444', fontSize: 16 }}>–</span> {game.home.score}
              </div>
              {game.isLive && game.homeWinProb !== null && game.homeWinProb !== undefined && (
                <div>
                  <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
                    <div style={{ width: `${game.awayWinProb}%`, background: `#${game.away.color || '378ADD'}`, transition: 'width 1s' }} />
                    <div style={{ width: `${game.homeWinProb}%`, background: `#${game.home.color || 'D85A30'}`, transition: 'width 1s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#666', fontWeight: 700 }}>
                    <span>{game.awayWinProb}%</span>
                    <span>{game.homeWinProb}%</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 11, color: '#444', fontWeight: 800, letterSpacing: '0.15em', border: '1px solid #2a2a2a', borderRadius: 6, padding: '4px 10px' }}>VS</div>
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

      {game.venue && <div style={{ fontSize: 11, color: '#555', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>📍 <span>{game.venue}</span></div>}

      <div style={{ display: 'flex', gap: 8 }}>
        {!game.isLive && !game.isFinal ? (
          <DNAReport gameId={game.id} />
        ) : (
          <button onClick={toggleBoxScore} style={{
            flex: 1, padding: '10px', fontSize: 12, fontWeight: 700,
            background: boxScoreExpanded ? '#2a2a2a' : '#1f1f1f',
            border: '1px solid #333', borderRadius: 8,
            color: boxScoreExpanded ? '#f0f0f0' : '#888', cursor: 'pointer',
            letterSpacing: '0.03em'
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#555'; e.currentTarget.style.color = '#f0f0f0'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = boxScoreExpanded ? '#f0f0f0' : '#666'; }}>
            {boxScoreLoading ? 'Loading...' : boxScoreExpanded ? '▲ Hide box score' : '📊 Box score'}
          </button>
        )}
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
                fontSize: 11, fontWeight: 700,
                background: i === 0 ? '#ff6b3518' : i === 1 ? '#22c55e18' : '#3b82f618',
                color: i === 0 ? '#ff9500' : i === 1 ? '#22c55e' : '#60a5fa',
                padding: '3px 10px', borderRadius: 20,
                border: `1px solid ${i === 0 ? '#ff950033' : i === 1 ? '#22c55e33' : '#3b82f633'}`,
              }}>
                {stat.value} {stat.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <button onClick={() => onNIL(player)} style={{
        flexShrink: 0, padding: '8px 16px', fontSize: 11, fontWeight: 800,
        background: '#ff6b3518', border: `1px solid #ff6b3544`,
        borderRadius: 20, color: '#ff6b35', cursor: 'pointer', whiteSpace: 'nowrap',
        letterSpacing: '0.06em', transition: 'all 0.15s',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = '#ff6b35'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,107,53,0.4)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#ff6b3511'; e.currentTarget.style.color = '#ff6b35'; e.currentTarget.style.boxShadow = 'none'; }}>
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

function CircleStat({ label, value, rank, total, color }: { label: string; value: string | number; rank: number; total: number; color: string }) {
  const pct = total > 1 ? 1 - (rank - 1) / (total - 1) : 1;
  const radius = 28;
  const circ = 2 * Math.PI * radius;
  const filled = pct * circ;
  const statColor = pct >= 0.75 ? '#22c55e' : pct >= 0.5 ? '#f0f0f0' : pct >= 0.25 ? '#ff9500' : '#ff3b30';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: 64, height: 64 }}>
        <svg width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="32" cy="32" r={radius} fill="none" stroke="#2a2a2a" strokeWidth="4" />
          <circle cx="32" cy="32" r={radius} fill="none" stroke={statColor} strokeWidth="4"
            strokeDasharray={`${filled} ${circ}`} strokeLinecap="round" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: statColor }}>{value}</span>
        </div>
      </div>
      <div style={{ fontSize: 9, color: '#555', fontWeight: 700, letterSpacing: '0.06em', textAlign: 'center' }}>{label}</div>
      <div style={{ fontSize: 9, color: '#444' }}>#{rank}</div>
    </div>
  );
}

function TeamDetailModal({ team, allTeams, leaders, onClose }: {
  team: any; allTeams: any[]; leaders: any; onClose: () => void;
}) {
  const [scoutReport, setScoutReport] = React.useState('');
  const [scoutLoading, setScoutLoading] = React.useState(false);
  const [bracketGames, setBracketGames] = React.useState<any[]>([]);

  React.useEffect(() => {
    fetch('/api/bracket').then(r => r.json()).then(d => {
      const games = d.games?.filter((g: any) => g.isFinal && (
        g.home.name === team.name || g.away.name === team.name
      )) || [];
      setBracketGames(games);
    }).catch(() => {});
  }, [team.name]);

  // Team leaders from the leaders API
  const teamLeaders = {
    pts: leaders?.scoring?.filter((p: any) => p.team === team.name).slice(0, 1)[0],
    reb: leaders?.rebounds?.filter((p: any) => p.team === team.name).slice(0, 1)[0],
    ast: leaders?.assists?.filter((p: any) => p.team === team.name).slice(0, 1)[0],
  };

  // Rankings among all teams
  function getRank(key: string, higherIsBetter = true) {
    const sorted = [...allTeams].sort((a, b) => higherIsBetter ? b[key] - a[key] : a[key] - b[key]);
    return sorted.findIndex(t => t.name === team.name) + 1;
  }

  const stats = [
    { label: 'PPG', value: team.ppg, rank: getRank('ppg') },
    { label: 'FG%', value: `${team.fgPct}%`, rank: getRank('fgPct') },
    { label: '3P%', value: `${team.threePct}%`, rank: getRank('threePct') },
    { label: 'REB', value: team.reb, rank: getRank('reb') },
    { label: 'AST', value: team.ast, rank: getRank('ast') },
    { label: 'OPP', value: team.oppPpg, rank: getRank('oppPpg', false) },
  ];

  async function generateScout() {
    if (scoutReport) return;
    setScoutLoading(true);
    const teamLeadersList = leaders?.scoring?.filter((p: any) => p.team === team.name).slice(0, 3) || [];
    const tournamentGames = bracketGames.map((g: any) => {
      const isHome = g.home.name === team.name;
      const teamScore = isHome ? g.home.score : g.away.score;
      const oppScore = isHome ? g.away.score : g.home.score;
      const oppName = isHome ? g.away.shortName : g.home.shortName;
      const won = parseInt(teamScore) > parseInt(oppScore);
      return { result: won ? 'W' : 'L', opponent: oppName, score: `${teamScore}-${oppScore}`, round: g.round };
    });
    try {
      const res = await fetch('/api/teamscout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team, leaders: teamLeadersList, tournamentGames }),
      });
      const data = await res.json();
      setScoutReport(data.report || '');
    } catch { setScoutReport('Unable to generate report.'); }
    setScoutLoading(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150, padding: '1rem' }}>
      <div style={{ background: '#161616', border: '1px solid #2a2a2a', borderRadius: 20, maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        {/* Top gradient accent */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, #${team.color || 'ff6b35'}, transparent)`, borderRadius: '20px 20px 0 0' }} />

        {/* Header */}
        <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid #222' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {team.logo && <img src={team.logo} alt="" style={{ width: 44, height: 44, objectFit: 'contain' }} onError={e => (e.currentTarget.style.display = 'none')} />}
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#f0f0f0' }}>#{team.seed} {team.shortName}</div>
                <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{team.gamesPlayed}G played in tournament · Season team stats below</div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: '#2a2a2a', border: 'none', color: '#888', fontSize: 16, cursor: 'pointer', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
        </div>

        {/* Team leaders */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #1f1f1f' }}>
          <div style={{ fontSize: 10, color: '#ff6b35', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 10 }}>TOURNAMENT LEADERS</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { label: 'POINTS', player: teamLeaders.pts, stat: 'ppg', statLabel: 'PPG' },
              { label: 'REBOUNDS', player: teamLeaders.reb, stat: 'rpg', statLabel: 'RPG' },
              { label: 'ASSISTS', player: teamLeaders.ast, stat: 'apg', statLabel: 'APG' },
            ].map(({ label, player, stat, statLabel }) => (
              <div key={label} style={{ background: '#1a1a1a', borderRadius: 10, padding: '10px 8px', textAlign: 'center', border: '1px solid #2a2a2a' }}>
                <div style={{ fontSize: 9, color: '#555', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 8 }}>{label}</div>
                {player ? (
                  <>
                    {player.headshot && (
                      <img src={player.headshot} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', marginBottom: 6, display: 'block', margin: '0 auto 6px' }}
                        onError={e => (e.currentTarget.style.display = 'none')} />
                    )}
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#f0f0f0', lineHeight: 1.2, marginBottom: 4 }}>{player.shortName || player.name.split(' ').slice(-1)[0]}</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#ff6b35' }}>{(player as any)[stat]}</div>
                    <div style={{ fontSize: 9, color: '#555' }}>{statLabel}</div>
                  </>
                ) : (
                  <div style={{ fontSize: 11, color: '#444', paddingTop: 8 }}>No data</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Ranked stats circles */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #1f1f1f' }}>
          <div style={{ fontSize: 10, color: '#ff6b35', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 10 }}>SEASON RANKINGS <span style={{ color: '#444', fontWeight: 500 }}>vs all tournament teams</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
            {stats.map(s => (
              <CircleStat key={s.label} label={s.label} value={s.value} rank={s.rank} total={allTeams.length} color="#ff6b35" />
            ))}
          </div>
        </div>

        {/* Scout report */}
        <div style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: 10, color: '#ff6b35', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 10 }}>SCOUT REPORT</div>
          {!scoutReport && !scoutLoading && (
            <button onClick={generateScout} style={{
              width: '100%', padding: '12px', fontSize: 13, fontWeight: 700,
              background: 'linear-gradient(135deg, #ff6b35, #ff4500)',
              border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(255,107,53,0.3)',
            }}>
              Generate Scout Report
            </button>
          )}
          {scoutLoading && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#555', fontStyle: 'italic', fontSize: 13 }}>
              Generating front office memo...
            </div>
          )}
          {scoutReport && (
            <div style={{ fontSize: 13, lineHeight: 1.8, color: '#bbb' }}>
              {scoutReport.split('\n').map((line, i) => {
                const isBold = /^\*\*/.test(line);
                const parsed = line.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#f0f0f0;font-weight:800">$1</strong>');
                if (!line.trim()) return <div key={i} style={{ height: 8 }} />;
                return (
                  <div key={i}
                    style={{ marginBottom: isBold ? 4 : 3, fontSize: isBold ? 12 : 13 }}
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

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: '#555', minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading bracket...</div>;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: '1rem', marginTop: '0.5rem' }}>
        {[
          { value: finalCount, label: 'COMPLETED', color: '#22c55e' },
          { value: liveCount, label: 'LIVE NOW', color: '#ff3b30' },
          { value: upsetCount, label: 'UPSETS', color: '#ff6b35' },
          { value: roundAllGames.length, label: 'TOTAL', color: '#888' },
        ].map((s, i) => (
          <div key={i} style={{
            background: '#1a1a1a', borderRadius: 12,
            padding: '12px 16px', flex: 1, textAlign: 'center',
            border: `1px solid ${s.color}33`,
            boxShadow: `0 0 12px ${s.color}11`,
          }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 9, color: '#555', letterSpacing: '0.08em', marginTop: 4, fontWeight: 700 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {rounds.map(r => (
          <button key={r} onClick={() => setActiveRound(r)} style={{
            padding: '7px 16px', fontSize: 12, fontWeight: 700,
            borderRadius: 20, border: '1px solid',
            borderColor: activeRound === r ? '#ff6b35' : '#333',
            background: activeRound === r ? '#ff6b35' : '#1a1a1a',
            color: activeRound === r ? '#fff' : '#777', cursor: 'pointer'
          }}
            onMouseEnter={e => { if (activeRound !== r) e.currentTarget.style.borderColor = '#555'; }}
            onMouseLeave={e => { if (activeRound !== r) e.currentTarget.style.borderColor = '#2a2a2a'; }}
          >{roundShort[r]}</button>
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
                  <span style={{ fontSize: 9, color: '#ff6b35', fontWeight: 700, letterSpacing: '0.04em' }}>📊 stats</span>
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

function EfficiencyTab() {
  const [teams, setTeams] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sortBy, setSortBy] = React.useState<string>('seed');
  const [selectedTeam, setSelectedTeam] = React.useState<any>(null);
  const [scoutReport, setScoutReport] = React.useState('');
  const [scoutLoading, setScoutLoading] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [showEliminated, setShowEliminated] = React.useState(false);
  const [eliminatedTeams, setEliminatedTeams] = React.useState<Set<string>>(new Set());
  const [modalTeam, setModalTeam] = React.useState<any>(null);
  const [leadersData, setLeadersData] = React.useState<any>(null);

  React.useEffect(() => {
    fetch('/api/leaders').then(r => r.json()).then(d => setLeadersData(d)).catch(() => {});
  }, []);

  React.useEffect(() => {
    fetch('/api/bracket').then(r => r.json()).then(d => {
      const elim = new Set<string>();
      d.games?.filter((g: any) => g.isFinal && g.home.name !== 'TBD').forEach((g: any) => {
        const homeWon = parseInt(g.home.score) > parseInt(g.away.score);
        const loser = homeWon ? g.away : g.home;
        elim.add(loser.name);
      });
      setEliminatedTeams(elim);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/efficiency')
      .then(r => r.json())
      .then(d => setTeams(d.teams || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function generateScoutReport(team: any) {
    if (selectedTeam?.name === team.name) { setSelectedTeam(null); setScoutReport(''); return; }
    setSelectedTeam(team);
    setScoutReport('');
    setScoutLoading(true);
    try {
      const res = await fetch('/api/efficiency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team }),
      });
      const data = await res.json();
      setScoutReport(data.report || '');
    } catch { }
    setScoutLoading(false);
  }

  const columns = [
    { key: 'seed', label: 'SEED', width: 44 },
    { key: 'tsPct', label: 'TS%', width: 54 },
    { key: 'ppg', label: 'PPG', width: 54 },
    { key: 'fgPct', label: 'FG%', width: 54 },
    { key: 'threePct', label: '3P%', width: 54 },
    { key: 'reb', label: 'REB', width: 54 },
    { key: 'astTo', label: 'A/TO', width: 54 },
  ];

  const sorted = [...teams]
    .filter(t => search === '' || t.name.toLowerCase().includes(search.toLowerCase()) || t.shortName?.toLowerCase().includes(search.toLowerCase()))
    .filter(t => showEliminated || !eliminatedTeams.has(t.name))
    .sort((a, b) => {
      if (sortBy === 'seed') return a.seed - b.seed;
      return (b[sortBy] as number) - (a[sortBy] as number);
    });

  function statColor(key: string, value: number, allValues: number[]): string {
    if (!allValues.length) return '#aaa';
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const pct = max === min ? 0.5 : (value - min) / (max - min);
    if (key === 'seed') return '#aaa';
    if (pct >= 0.75) return '#22c55e';
    if (pct >= 0.5) return '#f0f0f0';
    if (pct >= 0.25) return '#ff9500';
    return '#ff3b30';
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '3rem', color: '#555' }}>
      <div style={{ fontSize: 24, marginBottom: 12 }}>📊</div>
      Loading efficiency data...
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: '1rem', padding: '12px 16px', background: '#1a1a1a', borderRadius: 10, border: '1px solid #2a2a2a' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: 11, color: '#ff6b35', fontWeight: 800, letterSpacing: '0.06em' }}>📊 EFFICIENCY DASHBOARD</div>
          <div style={{ fontSize: 10, color: '#555', fontWeight: 700, background: '#2a2a2a', padding: '2px 8px', borderRadius: 10, letterSpacing: '0.04em' }}>
            FULL SEASON AVERAGES
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6 }}>
          All teams sorted by advanced metrics. Tap a column to sort. Tap a team for a Claude scouting report.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search teams..."
          style={{
            flex: 1, fontSize: 14, padding: '11px 16px',
            border: '1px solid #2a2a2a', borderRadius: 10,
            background: '#1a1a1a', color: '#f0f0f0',
            outline: 'none',
          }}
        />
        <div
          onClick={() => setShowEliminated(h => !h)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            fontSize: 12, fontWeight: 600, color: '#aaa',
            cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          }}>
          <div style={{
            width: 18, height: 18, borderRadius: 4,
            border: `2px solid ${showEliminated ? '#ff6b35' : '#444'}`,
            background: showEliminated ? '#ff6b35' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s', flexShrink: 0,
          }}>
            {showEliminated && <span style={{ fontSize: 11, color: '#fff', fontWeight: 800 }}>✓</span>}
          </div>
          Show eliminated
        </div>
      </div>

      <div style={{ fontSize: 10, color: '#666', marginBottom: 8, textAlign: 'right', letterSpacing: '0.04em', fontWeight: 600 }}>
        📅 Full 2025–26 season averages
      </div>

      {/* Sortable column headers */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #2a2a2a' }}>
              <th style={{ padding: '8px 10px', textAlign: 'left', color: '#555', fontWeight: 700, fontSize: 10, letterSpacing: '0.06em', minWidth: 120 }}>TEAM</th>
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => setSortBy(col.key)}
                  style={{
                    padding: '8px 6px', textAlign: 'center',
                    color: sortBy === col.key ? '#ff6b35' : '#555',
                    fontWeight: 700, fontSize: 10, letterSpacing: '0.06em',
                    cursor: 'pointer', width: col.width, whiteSpace: 'nowrap',
                    borderBottom: sortBy === col.key ? '2px solid #ff6b35' : '2px solid transparent',
                    transition: 'color 0.15s',
                  }}>
                  {col.label} {sortBy === col.key ? '↓' : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((team: any) => {
              const isSelected = selectedTeam?.name === team.name;
              return (
                <React.Fragment key={team.name}>
                  <tr
                    onClick={() => setModalTeam(team)}
                    style={{
                      borderBottom: '1px solid #1f1f1f',
                      cursor: 'pointer',
                      background: isSelected ? '#1f2a1f' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#222'; }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '12px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {team.logo && (
                        <img src={team.logo} alt="" style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0 }}
                          onError={(e) => (e.currentTarget.style.display = 'none')} />
                      )}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                        <span style={{ fontSize: 12, fontWeight: isSelected ? 700 : 500, color: isSelected ? '#f0f0f0' : '#ccc', whiteSpace: 'nowrap' }}>
                          {team.shortName}
                        </span>
                        {team.gamesPlayed > 0 && (
                          <span style={{ fontSize: 10, color: '#444', fontWeight: 600 }}>
                            ({team.gamesPlayed}G)
                          </span>
                        )}
                      </div>
                    </td>
                    {columns.map(col => {
                      const allVals = sorted.map((t: any) => t[col.key]).filter((v: any) => typeof v === 'number');
                      const color = statColor(col.key, team[col.key], allVals);
                      return (
                        <td key={col.key} style={{ padding: '10px 6px', textAlign: 'center', color, fontWeight: col.key === sortBy ? 700 : 400 }}>
                          {col.key === 'tsPct' || col.key === 'fgPct' || col.key === 'threePct'
                            ? `${team[col.key]}%`
                            : team[col.key]}
                        </td>
                      );
                    })}
                  </tr>
                  
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {modalTeam && (
        <TeamDetailModal
          team={modalTeam}
          allTeams={teams}
          leaders={leadersData}
          onClose={() => setModalTeam(null)}
        />
      )}
    </div>
  );
}

function BracketBustersTab() {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeSubTab, setActiveSubTab] = React.useState<'busters' | 'upsets'>('busters');

  useEffect(() => {
    fetch('/api/busters').then(r => r.json()).then(d => setData(d)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '3rem', color: '#555', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 24, marginBottom: 12 }}>🔮</div>
      Calculating bracket chaos...
    </div>
  );

  const teams = data?.teams || [];

  if (teams.length === 0) return (
    <div style={{ textAlign: 'center', padding: '3rem', color: '#555', fontSize: 13, minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      No bracket busters yet. Check back as upsets happen.
    </div>
  );

  return (
    <div>
      {/* Sub-tab pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem' }}>
        {([
          { key: 'busters', label: '🔮 Bracket Busters' },
          { key: 'upsets', label: '⚡ Upset History' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setActiveSubTab(t.key)} style={{
            padding: '7px 16px', fontSize: 12, fontWeight: 700,
            borderRadius: 20, border: '1px solid',
            borderColor: activeSubTab === t.key ? '#ff6b35' : '#333',
            background: activeSubTab === t.key ? '#ff6b35' : '#1a1a1a',
            color: activeSubTab === t.key ? '#fff' : '#888',
            cursor: 'pointer',
          }}>{t.label}</button>
        ))}
      </div>

      {activeSubTab === 'upsets' && <UpsetHistoryTab />}

      {activeSubTab === 'busters' && <>
      <div style={{ marginBottom: '1rem', padding: '12px 16px', background: '#1a1a1a', borderRadius: 10, border: '1px solid #2a2a2a' }}>
        <div style={{ fontSize: 11, color: '#ff6b35', fontWeight: 800, marginBottom: 4, letterSpacing: '0.06em' }}>🔮 BRACKET BUSTER SCORE</div>
        <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6 }}>
          Teams ranked by how many brackets they've already destroyed. Score = estimated % of brackets that had their victims advancing further.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {teams.map((team: any, i: number) => {
          const score = Math.round(team.totalBracketsBusted);
          const isTop = i < 3;
          const barColor = i === 0 ? '#ff3b30' : i === 1 ? '#ff6b35' : i === 2 ? '#ff9500' : '#666';

          return (
            <div key={team.name} style={{
              background: '#1a1a1a',
              border: `1px solid ${isTop ? barColor + '44' : '#2a2a2a'}`,
              borderRadius: 14,
              padding: '1rem 1.25rem',
              borderLeft: `4px solid ${barColor}`,
              position: 'relative',
            }}>
              {/* Rank badge */}
              <div style={{
                position: 'absolute', top: 12, right: 12,
                background: isTop ? barColor : '#2a2a2a',
                color: '#fff', fontSize: 11, fontWeight: 800,
                padding: '3px 10px', borderRadius: 20,
              }}>
                #{i + 1} BUSTER
              </div>

              {/* Team header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                {team.logo && (
                  <img src={team.logo} alt="" style={{ width: 36, height: 36, objectFit: 'contain' }}
                    onError={(e) => (e.currentTarget.style.display = 'none')} />
                )}
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#f0f0f0' }}>
                    #{team.seed} {team.shortName}
                  </div>
                  <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
                    {team.wins.length} upset win{team.wins.length > 1 ? 's' : ''} · Highest seed beaten: #{team.highestSeedBeaten}
                  </div>
                </div>
              </div>

              {/* Bracket buster score bar */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: '#555', fontWeight: 700, letterSpacing: '0.06em' }}>BRACKETS BUSTED</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: barColor }}>{score}%</span>
                </div>
                <div style={{ height: 6, background: '#2a2a2a', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${Math.min(score, 100)}%`,
                    background: `linear-gradient(90deg, ${barColor}, ${barColor}88)`,
                    borderRadius: 3, transition: 'width 1s ease',
                  }} />
                </div>
              </div>

              {/* Wins */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: team.narrative ? 10 : 0 }}>
                {team.wins.map((w: any, j: number) => (
                  <span key={j} style={{
                    fontSize: 11, padding: '3px 10px',
                    background: '#222', borderRadius: 20,
                    border: '1px solid #333', color: '#aaa',
                    fontWeight: 600,
                  }}>
                    def. #{w.loserSeed} {w.loser.split(' ').slice(-1)[0]} {w.score}
                  </span>
                ))}
              </div>

              {/* Claude narrative */}
              {team.narrative && (
                <div style={{
                  marginTop: 10, fontSize: 12, color: '#ccc',
                  lineHeight: 1.8, borderTop: '1px solid #2a2a2a', paddingTop: 10,
                }}>
                  {team.narrative}
                </div>
              )}
            </div>
          );
        })}
      </div>
      </>}
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

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: '#555', minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading leaders...</div>;
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
            padding: '7px 14px', fontSize: 12, fontWeight: 700,
            borderRadius: 20, border: '1px solid',
            borderColor: activeCategory === c.key ? '#ff6b35' : '#333',
            background: activeCategory === c.key ? '#ff6b35' : '#1a1a1a',
            color: activeCategory === c.key ? '#fff' : '#777', cursor: 'pointer'
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
          marginBottom: 12, outline: 'none', transition: 'border-color 0.2s',
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
              borderLeft: isTop3 ? `4px solid ${i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : '#CD7F32'}` : '4px solid transparent',
              boxShadow: i === 0 ? '0 0 20px rgba(255,215,0,0.08)' : 'none',
            }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#555', width: 28, textAlign: 'center', flexShrink: 0 }}>
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
  
  const [activeTab, setActiveTab] = useState<'games' | 'players' | 'bracket' | 'upsets' | 'leaders' | 'efficiency'>('games');
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
    <main style={{ background: 'radial-gradient(ellipse at top, #1a0f0a 0%, #0f0f0f 60%)', minHeight: '100vh', padding: '1.5rem 1.25rem', maxWidth: 680, margin: '0 auto', paddingTop: '3.5rem' }}>
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-33.333%); } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
      `}</style>
      <ScoreTicker games={games} />

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
          <h1 style={{
          fontSize: 28, fontWeight: 900, letterSpacing: '-1px',
          background: 'linear-gradient(135deg, #ffffff 0%, #ff6b35 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
            MadnessHQ
          </h1>
          <span style={{
            fontSize: 11, color: '#fff', fontWeight: 800,
            background: 'linear-gradient(135deg, #ff6b35, #ff3b30)',
            padding: '3px 8px', borderRadius: 6,
            letterSpacing: '0.1em', boxShadow: '0 2px 8px rgba(255,107,53,0.4)',
            animation: 'pulse 2s infinite',
          }}>● LIVE</span>
        </div>
        <p style={{ fontSize: 12, color: '#555' }}>Live scores · Bracket · Cinderella · NIL · AI analyst</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {liveCount > 0 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#22c55e18', padding: '4px 10px', borderRadius: 20, border: '1px solid #22c55e44', boxShadow: '0 0 12px rgba(34,197,94,0.15)' }}>
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

      <div style={{
        display: 'flex', gap: 2, marginBottom: '1.25rem',
        background: '#141414', borderRadius: 14, padding: 5,
        border: '1px solid #222', boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        width: '100%', boxSizing: 'border-box',
      }}>
        {([
          { key: 'games', label: 'Scores' },
          { key: 'bracket', label: 'Bracket' },
          { key: 'leaders', label: 'Players' },
          { key: 'efficiency', label: 'Teams' },
          { key: 'upsets', label: 'Busters' },
          { key: 'players', label: 'Cinderella' },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{
            flex: '1 1 0',
            minWidth: 0,
            padding: '9px 2px',
            fontSize: 12,
            fontWeight: activeTab === key ? 700 : 600,
            background: activeTab === key
              ? 'linear-gradient(135deg, #ff6b35, #ff4500)'
              : 'transparent',
            border: 'none',
            borderRadius: 10,
            color: activeTab === key ? '#fff' : '#555',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: activeTab === key ? '0 2px 12px rgba(255,107,53,0.35)' : 'none',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
            onMouseEnter={e => { if (activeTab !== key) e.currentTarget.style.color = '#aaa'; }}
            onMouseLeave={e => { if (activeTab !== key) e.currentTarget.style.color = '#555'; }}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'games' && (
        <div style={{ minHeight: '70vh' }}>
          <input
            value={gameSearch}
            onChange={e => setGameSearch(e.target.value)}
            placeholder="Search teams..."
            style={{
              width: '100%', fontSize: 14, padding: '11px 16px',
              border: '1px solid #2a2a2a', borderRadius: 10,
              background: '#1a1a1a', color: '#f0f0f0',
              marginBottom: 12, outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.currentTarget.style.borderColor = '#ff6b35'}
            onBlur={e => e.currentTarget.style.borderColor = '#333'}
          />
          <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {(['all', 'live', 'final', 'upcoming'] as const).map(f => (
              <button key={f} onClick={() => {
                setGameFilter(f);
                if (f === 'live') {
                  setActiveDateFilter(new Date().toLocaleDateString('en-US', {
                    month: 'long', day: 'numeric', timeZone: 'America/New_York'
                  }));
                }
              }} style={{
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
          {!gamesLoading && games.length > 0 && games.filter(g => g.isLive).length === 0 && gameFilter === 'live' && (() => {
            const nextGame = [...games].filter(g => !g.isFinal && !g.isLive).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
            const minsUntil = nextGame ? Math.max(0, Math.round((new Date(nextGame.date).getTime() - Date.now()) / 60000)) : null;
            return (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', minHeight: '40vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🏀</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#f0f0f0', marginBottom: 8 }}>No games live right now</div>
                {nextGame && minsUntil !== null && (
                  <>
                    <div style={{ fontSize: 13, color: '#555', marginBottom: 20 }}>
                      Next tip-off in <span style={{ color: '#ff6b35', fontWeight: 700 }}>{minsUntil >= 60 ? `${Math.floor(minsUntil / 60)}h ${minsUntil % 60}m` : `${minsUntil}m`}</span>
                    </div>
                    <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 14, padding: '1rem 1.5rem', maxWidth: 320, width: '100%' }}>
                      <div style={{ fontSize: 10, color: '#ff6b35', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 10 }}>UP NEXT</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ textAlign: 'center', flex: 1 }}>
                          {nextGame.away.logo && <img src={nextGame.away.logo} alt="" style={{ width: 32, height: 32, objectFit: 'contain', marginBottom: 4 }} />}
                          <div style={{ fontSize: 10, color: '#666' }}>#{nextGame.away.seed}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#f0f0f0' }}>{nextGame.away.name.split(' ').slice(-1)[0]}</div>
                        </div>
                        <div style={{ fontSize: 13, color: '#444', fontWeight: 800 }}>VS</div>
                        <div style={{ textAlign: 'center', flex: 1 }}>
                          {nextGame.home.logo && <img src={nextGame.home.logo} alt="" style={{ width: 32, height: 32, objectFit: 'contain', marginBottom: 4 }} />}
                          <div style={{ fontSize: 10, color: '#666' }}>#{nextGame.home.seed}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#f0f0f0' }}>{nextGame.home.name.split(' ').slice(-1)[0]}</div>
                        </div>
                      </div>
                      <div style={{ marginTop: 10, fontSize: 11, color: '#555', textAlign: 'center' }}>{nextGame.time} · {nextGame.venue?.split(' ').slice(0, 3).join(' ')}</div>
                    </div>
                  </>
                )}
                <button onClick={() => setGameFilter('all')} style={{ marginTop: 20, padding: '8px 20px', fontSize: 12, fontWeight: 700, background: 'transparent', border: '1px solid #333', borderRadius: 20, color: '#888', cursor: 'pointer' }}>
                  View all games →
                </button>
              </div>
            );
          })()}
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
                {/* ESPN-style date selector with arrows */}
                {allGroups.length > 1 && (() => {
                  const activeIdx = allGroups.findIndex(g => g.dateKey === activeDateFilter);
                  const windowStart = Math.max(0, Math.min(activeIdx - 1, allGroups.length - 3));
                  const visibleDates = allGroups.slice(windowStart, windowStart + 3);
                  const canGoLeft = windowStart > 0;
                  const canGoRight = windowStart + 3 < allGroups.length;

                  return (
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
                      {/* Left arrow */}
                      <button
                        onClick={() => {
                          const prevIdx = allGroups.findIndex(g => g.dateKey === activeDateFilter) - 1;
                          if (prevIdx >= 0) setActiveDateFilter(allGroups[prevIdx].dateKey);
                        }}
                        disabled={activeIdx === 0}
                        style={{
                          width: 36, flexShrink: 0,
                          background: 'transparent',
                          border: 'none',
                          borderRight: '1px solid #2a2a2a',
                          cursor: activeIdx === 0 ? 'default' : 'pointer',
                          color: activeIdx === 0 ? '#333' : '#888',
                          fontSize: 16,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => { if (activeIdx > 0) e.currentTarget.style.color = '#f0f0f0'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = activeIdx === 0 ? '#333' : '#888'; }}
                      >
                        ‹
                      </button>

                      {/* 3 visible date tabs */}
                      {visibleDates.map((group, i) => {
                        const d = new Date(
                          filteredGames.find(g =>
                            new Date(g.date).toLocaleDateString('en-US', {
                              month: 'long', day: 'numeric', timeZone: 'America/New_York'
                            }) === group.dateKey
                          )?.date || group.dateKey
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
                              borderRight: i < visibleDates.length - 1 ? '1px solid #2a2a2a' : 'none',
                              cursor: 'pointer',
                              transition: 'background 0.15s',
                              position: 'relative',
                            }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700,
                              color: isActive ? '#fff' : '#666',
                              letterSpacing: '0.06em', lineHeight: '1', display: 'block',
                            }}>
                              {dayName}
                            </span>
                            <span style={{
                              fontSize: 13, fontWeight: 800,
                              color: isActive ? '#fff' : '#f0f0f0',
                              letterSpacing: '0.02em', lineHeight: '1', display: 'block',
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

                      {/* Right arrow */}
                      <button
                        onClick={() => {
                          const nextIdx = allGroups.findIndex(g => g.dateKey === activeDateFilter) + 1;
                          if (nextIdx < allGroups.length) setActiveDateFilter(allGroups[nextIdx].dateKey);
                        }}
                        disabled={activeIdx === allGroups.length - 1}
                        style={{
                          width: 36, flexShrink: 0,
                          background: 'transparent',
                          border: 'none',
                          borderLeft: '1px solid #2a2a2a',
                          cursor: activeIdx === allGroups.length - 1 ? 'default' : 'pointer',
                          color: activeIdx === allGroups.length - 1 ? '#333' : '#888',
                          fontSize: 16,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => { if (activeIdx < allGroups.length - 1) e.currentTarget.style.color = '#f0f0f0'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = activeIdx === allGroups.length - 1 ? '#333' : '#888'; }}
                      >
                        ›
                      </button>
                    </div>
                  );
                })()}

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
        </div>
      )}

      {activeTab === 'players' && (
        <div style={{ minHeight: '70vh' }}>
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
          <div style={{ marginBottom: '1rem', padding: '12px 16px', background: '#1a1a1a', borderRadius: 10, border: '1px solid #ff6b3530', borderLeft: '3px solid #ff6b35' }}>
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
        </div>
      )}

      <div style={{
        textAlign: 'center', marginTop: '2rem', paddingTop: '1rem',
        borderTop: '1px solid #1f1f1f',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 10, color: '#333', fontWeight: 600, letterSpacing: '0.06em' }}>
          MADNESSHQ
        </span>
        <span style={{ color: '#2a2a2a' }}>·</span>
        <span style={{ fontSize: 10, color: '#2a2a2a' }}>ESPN + Claude AI</span>
        <span style={{ color: '#2a2a2a' }}>·</span>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', animation: 'pulse 1.5s infinite' }} />
        <span style={{ fontSize: 10, color: '#2a2a2a' }}>Live</span>
      </div>
      <div style={{ minHeight: '70vh', width: '100%' }}>
        {activeTab === 'bracket' && <BracketTab />}
        {activeTab === 'upsets' && <BracketBustersTab />}
        {activeTab === 'efficiency' && <EfficiencyTab />}
        {activeTab === 'leaders' && <LeadersTab />}
      </div>
      {nilPlayer && <NILModal player={nilPlayer} onClose={() => setNilPlayer(null)} />}
      <TournamentChat games={games} players={players} />
    </main>
  );
}