import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('id');

  if (!eventId) return NextResponse.json({ error: 'No event ID' }, { status: 400 });

  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary?event=${eventId}`,
      { next: { revalidate: 30 } }
    );
    const data = await res.json();

    const boxscore = data?.boxscore?.players || [];
    const teamStatsRaw = data?.boxscore?.teams || [];

    const teams = boxscore.map((teamBox: any, ti: number) => {
      const labels = teamBox.statistics?.[0]?.labels || [];
      const athletes = teamBox.statistics?.[0]?.athletes || [];

      const getStat = (stats: any[], label: string) => {
        const idx = labels.indexOf(label);
        return idx >= 0 ? stats[idx] || '0' : '0';
      };

      const players = athletes
        .filter((a: any) => a.stats?.length > 0 && a.stats[0] !== '0:00')
        .map((a: any) => ({
          name: a.athlete?.shortName || a.athlete?.displayName || '',
          headshot: a.athlete?.headshot?.href || '',
          position: a.athlete?.position?.abbreviation || '',
          starter: a.starter || false,
          min: getStat(a.stats, 'MIN'),
          pts: getStat(a.stats, 'PTS'),
          reb: getStat(a.stats, 'REB'),
          ast: getStat(a.stats, 'AST'),
          stl: getStat(a.stats, 'STL'),
          blk: getStat(a.stats, 'BLK'),
          fg: getStat(a.stats, 'FG'),
          threes: getStat(a.stats, '3PT'),
          ft: getStat(a.stats, 'FT'),
          to: getStat(a.stats, 'TO'),
        }))
        .sort((a: any, b: any) => parseInt(b.pts) - parseInt(a.pts));

      // Team totals from boxscore
      const teamStatData = teamStatsRaw[ti];
      const statsList = teamStatData?.statistics || [];

      const getTeamStat = (name: string) => {
        const s = statsList.find((x: any) => x.name === name || x.abbreviation === name);
        return s?.displayValue || '-';
      };

      return {
        team: teamBox.team?.displayName || '',
        logo: teamBox.team?.logo || '',
        color: teamBox.team?.color || '333333',
        players,
        totals: {
          fg: getTeamStat('fieldGoals'),
          fgPct: getTeamStat('fieldGoalPct'),
          threes: getTeamStat('threePointFieldGoals'),
          threePct: getTeamStat('threePointFieldGoalPct'),
          ft: getTeamStat('freeThrows'),
          ftPct: getTeamStat('freeThrowPct'),
          reb: getTeamStat('totalRebounds'),
          oreb: getTeamStat('offensiveRebounds'),
          dreb: getTeamStat('defensiveRebounds'),
          ast: getTeamStat('assists'),
          to: getTeamStat('turnovers'),
          stl: getTeamStat('steals'),
          blk: getTeamStat('blocks'),
          pf: getTeamStat('fouls'),
          pts: getTeamStat('points'),
        }
      };
    });

    return NextResponse.json({ teams });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}