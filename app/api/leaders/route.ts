import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const dates = ['20260318', '20260319', '20260320', '20260321', '20260322'];
    const allEvents: any[] = [];

    await Promise.all(dates.map(async (date) => {
      try {
        const res = await fetch(
          `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=100&dates=${date}`,
          { cache: 'no-store' }
        );
        const data = await res.json();
        if (data?.events) allEvents.push(...data.events);
      } catch { }
    }));

    const completedEvents = allEvents.filter((e: any) =>
      e.competitions?.[0]?.status?.type?.name === 'STATUS_FINAL'
    );

    const playerMap = new Map();

    await Promise.all(completedEvents.map(async (event: any) => {
      const comp = event.competitions[0];
      try {
        const res = await fetch(
          `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary?event=${event.id}`,
          { cache: 'no-store' }
        );
        const summary = await res.json();
        const boxPlayers = summary?.boxscore?.players || [];
        const labels = boxPlayers?.[0]?.statistics?.[0]?.labels || [];

        const getStat = (stats: string[], label: string) => {
          const idx = labels.indexOf(label);
          return idx >= 0 ? parseFloat(stats[idx]) || 0 : 0;
        };

        boxPlayers.forEach((teamBox: any) => {
          const athletes = teamBox.statistics?.[0]?.athletes || [];
          const home = comp.competitors.find((c: any) => c.homeAway === 'home');
          const away = comp.competitors.find((c: any) => c.homeAway === 'away');
          const isHome = home?.team?.id === teamBox.team?.id;
          const teamComp = isHome ? home : away;
          const seed = teamComp?.curatedRank?.current || '?';

          athletes.forEach((a: any) => {
            if (!a.athlete || !a.stats?.length) return;
            const min = getStat(a.stats, 'MIN');
            if (min < 5) return;

            const pts = getStat(a.stats, 'PTS');
            const reb = getStat(a.stats, 'REB');
            const ast = getStat(a.stats, 'AST');
            const stl = getStat(a.stats, 'STL');
            const blk = getStat(a.stats, 'BLK');
            const fg = a.stats[labels.indexOf('FG')] || '0-0';
            const threes = a.stats[labels.indexOf('3PT')] || '0-0';
            const ft = a.stats[labels.indexOf('FT')] || '0-0';
            const to = getStat(a.stats, 'TO');

            const pid = a.athlete.id;
            const existing = playerMap.get(pid);

            if (!existing) {
              playerMap.set(pid, {
                id: pid,
                name: a.athlete.displayName,
                shortName: a.athlete.shortName || a.athlete.displayName,
                headshot: a.athlete.headshot?.href || '',
                team: teamBox.team?.displayName || '',
                teamLogo: teamBox.team?.logo || '',
                seed,
                games: 1,
                pts, reb, ast, stl, blk, to,
                topGame: { pts, reb, ast, stl, blk, fg, threes, ft, opponent: (isHome ? away : home)?.team?.shortDisplayName || '', date: event.date },
              });
            } else {
              existing.games += 1;
              existing.pts += pts;
              existing.reb += reb;
              existing.ast += ast;
              existing.stl += stl;
              existing.blk += blk;
              existing.to += to;
              if (pts > existing.topGame.pts) {
                existing.topGame = { pts, reb, ast, stl, blk, fg, threes, ft, opponent: (isHome ? away : home)?.team?.shortDisplayName || '', date: event.date };
              }
            }
          });
        });
      } catch { }
    }));

    const players = Array.from(playerMap.values()).map(p => ({
      ...p,
      ppg: p.games > 0 ? Math.round((p.pts / p.games) * 10) / 10 : 0,
      rpg: p.games > 0 ? Math.round((p.reb / p.games) * 10) / 10 : 0,
      apg: p.games > 0 ? Math.round((p.ast / p.games) * 10) / 10 : 0,
      spg: p.games > 0 ? Math.round((p.stl / p.games) * 10) / 10 : 0,
      bpg: p.games > 0 ? Math.round((p.blk / p.games) * 10) / 10 : 0,
    }));

    const withGameScore = players.map(p => {
      const g = p.topGame;
      const fgMade = parseInt(g.fg?.split('-')[0]) || 0;
      const fgAtt = parseInt(g.fg?.split('-')[1]) || 1;
      const fgPct = fgMade / fgAtt;
      const threeMade = parseInt(g.threes?.split('-')[0]) || 0;
      const ftMade = parseInt(g.ft?.split('-')[0]) || 0;
      const ftAtt = parseInt(g.ft?.split('-')[1]) || 1;
      const ftPct = ftMade / ftAtt;

      const raw =
        (g.pts * 1.0) +
        (fgPct * g.pts * 0.5) +
        (g.reb * 1.2) +
        (g.ast * 1.5) +
        (g.stl * 2.0) +
        (g.blk * 2.0) +
        (threeMade * 0.5) +
        (ftPct * ftMade * 0.3) -
        ((fgAtt - fgMade) * 0.5);

      // Normalize to 1-10 scale (raw ~0-80 range)
      const gameScore = Math.max(1, Math.min(10, Math.round((raw / 75) * 90) / 10));

      return { ...p, topGame: { ...g, gameScore } };
    });

    return NextResponse.json({
      scoring: [...withGameScore].sort((a, b) => b.ppg - a.ppg),
      rebounds: [...withGameScore].sort((a, b) => b.rpg - a.rpg),
      assists: [...withGameScore].sort((a, b) => b.apg - a.apg),
      steals: [...withGameScore].sort((a, b) => b.spg - a.spg),
      blocks: [...withGameScore].sort((a, b) => b.bpg - a.bpg),
      topGames: [...withGameScore].sort((a, b) => b.topGame.gameScore - a.topGame.gameScore),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}