import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('id');
  if (!eventId) return NextResponse.json({ error: 'No event ID' }, { status: 400 });

  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary?event=${eventId}`,
      { next: { revalidate: 300 } }
    );
    const data = await res.json();
    const teams = data?.boxscore?.teams;
    if (!teams?.length) return NextResponse.json({ error: 'No team data' }, { status: 404 });

    const getStats = (t: any) => {
      const s = t.statistics?.reduce((acc: any, stat: any) => {
        acc[stat.name] = stat.displayValue;
        return acc;
      }, {});
      return {
        name: t.team?.displayName,
        seed: null,
        ppg: s?.avgPoints,
        oppPpg: s?.avgPointsAgainst,
        fgPct: s?.fieldGoalPct,
        threePct: s?.threePointFieldGoalPct,
        reb: s?.avgRebounds,
        ast: s?.avgAssists,
        to: s?.avgTotalTurnovers,
        stl: s?.avgSteals,
        blk: s?.avgBlocks,
        streak: s?.streak,
      };
    };

    const competitors = data?.header?.competitions?.[0]?.competitors || [];
    const away = competitors.find((c: any) => c.homeAway === 'away');
    const home = competitors.find((c: any) => c.homeAway === 'home');

    const awayTeam = getStats(teams.find((t: any) => t.team?.id === away?.team?.id) || teams[0]);
    const homeTeam = getStats(teams.find((t: any) => t.team?.id === home?.team?.id) || teams[1]);
    awayTeam.seed = away?.curatedRank?.current;
    homeTeam.seed = home?.curatedRank?.current;

    const prompt = `You are a college basketball analyst giving a pre-game DNA report for a March Madness matchup. Be direct, specific, and punchy — like a great halftime analyst, not a journalist.

MATCHUP:
${awayTeam.seed ? `#${awayTeam.seed} ` : ''}${awayTeam.name} vs ${homeTeam.seed ? `#${homeTeam.seed} ` : ''}${homeTeam.name}

${awayTeam.name} SEASON STATS:
- Scoring: ${awayTeam.ppg} PPG / ${awayTeam.oppPpg} opp PPG
- Shooting: ${awayTeam.fgPct}% FG, ${awayTeam.threePct}% from 3
- Rebounding: ${awayTeam.reb} per game
- Assists: ${awayTeam.ast} | Turnovers: ${awayTeam.to}
- Streak: ${awayTeam.streak}

${homeTeam.name} SEASON STATS:
- Scoring: ${homeTeam.ppg} PPG / ${homeTeam.oppPpg} opp PPG
- Shooting: ${homeTeam.fgPct}% FG, ${homeTeam.threePct}% from 3
- Rebounding: ${homeTeam.reb} per game
- Assists: ${homeTeam.ast} | Turnovers: ${homeTeam.to}
- Streak: ${homeTeam.streak}

Generate a DNA REPORT with exactly these 4 sections. Keep each to 1-2 sentences. Be specific with the numbers:

🔑 KEY BATTLE
[The single most important matchup factor that will decide this game]

⚡ ADVANTAGE
[Which team has the clearest statistical edge and why]

🎯 X-FACTOR
[The stat or tendency that could swing this game unexpectedly]

🏆 PREDICTION
[One bold, specific prediction for how this game plays out]`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });

    const report = response.content[0].type === 'text' ? response.content[0].text : '';
    return NextResponse.json({ report, awayTeam, homeTeam });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}