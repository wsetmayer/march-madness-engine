import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const dates = ['20260320', '20260319', '20260318'];
    const allEvents: any[] = [];

    await Promise.all(dates.map(async (date) => {
      try {
        const res = await fetch(
          `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=100&dates=${date}`,
          { next: { revalidate: 60 } }
        );
        const data = await res.json();
        if (data?.events) allEvents.push(...data.events);
      } catch { }
    }));

    if (!allEvents.length) return NextResponse.json({ players: [] });

    // Only keep completed games where an upset occurred
    const upsetGames = allEvents.filter((event: any) => {
      const comp = event.competitions[0];
      const isFinal = comp.status?.type?.name === 'STATUS_FINAL';
      if (!isFinal) return false;

      const home = comp.competitors.find((c: any) => c.homeAway === 'home');
      const away = comp.competitors.find((c: any) => c.homeAway === 'away');

      const homeSeed = parseInt(home?.curatedRank?.current || '0');
      const awaySeed = parseInt(away?.curatedRank?.current || '0');
      const homeScore = parseInt(home?.score || '0');
      const awayScore = parseInt(away?.score || '0');

      if (!homeSeed || !awaySeed) return false;

      const homeWon = homeScore > awayScore;
      const winnerSeed = homeWon ? homeSeed : awaySeed;
      const loserSeed = homeWon ? awaySeed : homeSeed;

      // Upset = winner has higher seed number than loser
      return winnerSeed > loserSeed;
    });

    if (!upsetGames.length) return NextResponse.json({ players: [] });

    const playerMap = new Map();

    await Promise.all(upsetGames.map(async (event: any) => {
      const comp = event.competitions[0];
      const eventId = event.id;

      const home = comp.competitors.find((c: any) => c.homeAway === 'home');
      const away = comp.competitors.find((c: any) => c.homeAway === 'away');
      const homeScore = parseInt(home?.score || '0');
      const awayScore = parseInt(away?.score || '0');
      const homeWon = homeScore > awayScore;
      const winnerComp = homeWon ? home : away;
      const loserComp = homeWon ? away : home;
      const winnerSeed = parseInt(winnerComp?.curatedRank?.current || '8');
      const loserSeed = parseInt(loserComp?.curatedRank?.current || '1');

      try {
        const summaryRes = await fetch(
          `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary?event=${eventId}`,
          { next: { revalidate: 60 } }
        );
        const summary = await summaryRes.json();

        // Get full box score players, not just leaders
        const boxscorePlayers = summary?.boxscore?.players || [];

        boxscorePlayers.forEach((teamBox: any) => {
          const teamId = teamBox.team?.id;
          const isWinningTeam = winnerComp?.team?.id === teamId;
          if (!isWinningTeam) return;

          const teamName = winnerComp?.team?.displayName || '';
          const teamLogo = winnerComp?.team?.logo || '';

          const athletes = teamBox.statistics?.[0]?.athletes || [];

          athletes.forEach((athlete: any) => {
            if (!athlete.athlete) return;
            const pid = athlete.athlete.id;
            const stats = athlete.stats || [];

            // Use stat labels from the API instead of hardcoded indices
            const statLabels = teamBox.statistics?.[0]?.labels || [];
            const getStat = (label: string) => {
              const idx = statLabels.indexOf(label);
              return idx >= 0 ? parseFloat(stats[idx]) || 0 : 0;
            };

            const pts = getStat('PTS');
            const reb = getStat('REB');
            const ast = getStat('AST');
            const stl = getStat('STL');
            const blk = getStat('BLK');
            const min = getStat('MIN');
            if (min < 5) return; // skip DNPs and garbage time

            const allStatsValue = pts + reb + ast + stl + blk;
            const seedDiff = Math.max(0, winnerSeed - loserSeed);
            const upsetFactor = Math.min(3, seedDiff * 0.4);
            const performanceScore = Math.min(5, (allStatsValue / 40) * 5);
            const underdogBonus = winnerSeed >= 12 ? 2 : winnerSeed >= 10 ? 1.5 : winnerSeed >= 7 ? 1 : 0.5;
            const cinderellaScore = Math.max(1, Math.min(10, Math.round(
              performanceScore + upsetFactor + underdogBonus
            )));

            playerMap.set(pid, {
              id: pid,
              name: athlete.athlete.displayName,
              team: teamName,
              teamLogo,
              teamSeed: winnerSeed,
              oppSeed: loserSeed,
              oppName: loserComp?.team?.displayName || '',
              headshot: athlete.athlete.headshot?.href || '',
              gameName: event.name,
              gameStatus: comp.status?.type?.shortDetail || 'Final',
              isLive: false,
              isFinal: true,
              isWinner: true,
              stats: {
                points: { value: pts.toString(), label: 'Points' },
                rebounds: { value: reb.toString(), label: 'Rebounds' },
                assists: { value: ast.toString(), label: 'Assists' },
              },
              cinderellaScore
            });
          });
        });
      } catch { }
    }));

    const sorted = Array.from(playerMap.values())
      .sort((a, b) => b.cinderellaScore - a.cinderellaScore);

    return NextResponse.json({ players: sorted });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}