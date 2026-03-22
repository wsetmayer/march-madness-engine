import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function getTeamStats(teamId: string) {
  try {
    const [statsRes, recordRes] = await Promise.all([
      fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/${teamId}/statistics`, { cache: 'no-store' }),
      fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/${teamId}?enable=stats`, { cache: 'no-store' }),
    ]);
    const data = await statsRes.json();
    const recordData = await recordRes.json();
    const cats = data.results?.stats?.categories || [];
    const get = (cat: string, name: string) => {
      const c = cats.find((c: any) => c.name === cat);
      return c?.stats?.find((s: any) => s.name === name)?.value ?? null;
    };
    const recordStats = recordData.team?.record?.items?.[0]?.stats || [];
    const getRecord = (name: string) => recordStats.find((s: any) => s.name === name)?.value ?? 0;

    const fgm = get('offensive', 'avgFieldGoalsMade') || 0;
    const fga = get('offensive', 'avgFieldGoalsAttempted') || 1;
    const ftm = get('offensive', 'avgFreeThrowsMade') || 0;
    const fta = get('offensive', 'avgFreeThrowsAttempted') || 0;
    const tpm = get('offensive', 'avgThreePointFieldGoalsMade') || 0;
    const pts = get('offensive', 'avgPoints') || 0;

    // True Shooting % = PTS / (2 * (FGA + 0.44 * FTA))
    const tsPct = fta > 0 ? (pts / (2 * (fga + 0.44 * fta)) * 100) : (fga > 0 ? (fgm / fga * 100) : 0);

    return {
      ppg: Math.round((pts as number) * 10) / 10,
      oppPpg: Math.round((getRecord('avgPointsAgainst') as number) * 10) / 10,
      fgPct: Math.round((get('offensive', 'fieldGoalPct') as number || 0) * 10) / 10,
      threePct: Math.round((get('offensive', 'threePointFieldGoalPct') as number || 0) * 10) / 10,
      tsPct: Math.round(tsPct * 10) / 10,
      reb: Math.round((get('general', 'avgRebounds') as number || 0) * 10) / 10,
      ast: Math.round((get('offensive', 'avgAssists') as number || 0) * 10) / 10,
      to: Math.round((get('offensive', 'avgTurnovers') as number || 0) * 10) / 10,
      astTo: Math.round((get('general', 'assistTurnoverRatio') as number || 0) * 100) / 100,
      blk: Math.round((get('defensive', 'avgBlocks') as number || 0) * 10) / 10,
      stl: Math.round((get('defensive', 'avgSteals') as number || 0) * 10) / 10,
      scoringEff: Math.round((get('offensive', 'scoringEfficiency') as number || 0) * 1000) / 1000,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const bracketRes = await fetch(`${baseUrl}/api/bracket`, { next: { revalidate: 60 } });
    const bracketData = await bracketRes.json();
    const games = bracketData?.games || [];

    // Find eliminated teams
    const eliminated = new Set<string>();
    games.filter((g: any) => g.isFinal && g.home.name !== 'TBD').forEach((g: any) => {
      const homeWon = parseInt(g.home.score) > parseInt(g.away.score);
      const loser = homeWon ? g.away : g.home;
      eliminated.add(loser.name);
    });

    // Collect all unique alive teams with IDs
    const teamMap = new Map<string, any>();
    games.forEach((g: any) => {
      [g.home, g.away].forEach((t: any) => {
        if (t.name !== 'TBD' && !teamMap.has(t.name)) {
          teamMap.set(t.name, t);
        }
      });
    });

    const aliveTeams = [...teamMap.values()];

    // Count tournament games played per team from bracket data
    const gamesPlayedMap = new Map<string, number>();
    games.filter((g: any) => g.isFinal).forEach((g: any) => {
      [g.home.name, g.away.name].forEach((name: string) => {
        gamesPlayedMap.set(name, (gamesPlayedMap.get(name) || 0) + 1);
      });
    });

    // Fetch stats for all alive teams in parallel
    const teamsWithStats = await Promise.all(
      aliveTeams.map(async (team: any) => {
        const stats = await getTeamStats(team.id);
        if (!stats) return null;
        return {
          id: team.id,
          name: team.name,
          shortName: team.shortName || team.name,
          seed: parseInt(team.seed || '99'),
          logo: team.logo,
          color: team.color,
          gamesPlayed: gamesPlayedMap.get(team.name) || 0,
          ...stats,
        };
      })
    );

    const validTeams = teamsWithStats
      .filter(Boolean)
      .sort((a: any, b: any) => b.tsPct - a.tsPct);

    return NextResponse.json({ teams: validTeams });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { team } = await request.json();

    const prompt = `You are a college basketball analyst. Write a 3-sentence scouting report for ${team.seed ? `#${team.seed} ` : ''}${team.name} based on these season stats:

- Scoring: ${team.ppg} PPG
- Shooting: ${team.fgPct}% FG, ${team.threePct}% from 3, ${team.tsPct}% True Shooting
- Rebounding: ${team.reb} per game
- Assists: ${team.ast} | Turnovers: ${team.to} | Ast/TO ratio: ${team.astTo}
- Blocks: ${team.blk} | Steals: ${team.stl}

Be specific about their strengths and weaknesses. Mention what style they play and what makes them dangerous or vulnerable in March Madness. No fluff.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    const report = response.content[0].type === 'text' ? response.content[0].text : '';
    return NextResponse.json({ report });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}