import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { team, leaders, tournamentGames } = await req.json();

    const prompt = `You are an NBA front office analyst writing a tournament scout report.

TEAM: #${team.seed} ${team.name}
SEASON STATS: ${team.ppg} PPG | ${team.oppPpg} Opp PPG | ${team.fgPct}% FG | ${team.threePct}% 3P | ${team.tsPct}% TS | ${team.reb} REB | ${team.ast} AST | ${team.to} TO | ${team.astTo} A/TO | ${team.blk} BLK | ${team.stl} STL
TOURNAMENT GAMES PLAYED: ${team.gamesPlayed}

TOP PLAYERS IN TOURNAMENT:
${leaders.map((p: any) => `- ${p.name}: ${p.ppg} PPG, ${p.rpg} RPG, ${p.apg} APG`).join('\n')}

TOURNAMENT GAME RESULTS:
${tournamentGames.map((g: any) => `- ${g.result} vs ${g.opponent} (${g.score})`).join('\n') || 'No completed games yet'}

Write a detailed one-page scout report memo in the style of an NBA front office analyst. Include:

**IDENTITY & SCHEME**
How this team plays, their system, pace, style.

**STRENGTHS**
2-3 specific, data-backed strengths.

**WEAKNESSES**
2-3 specific vulnerabilities to exploit.

**PLAYERS TO KEY ON**
The 2 most important players and why.

**HOW TO BEAT THEM**
Specific tactical blueprint — what a team must do to eliminate them.

**TOURNAMENT OUTLOOK**
How far can they realistically go and why.

Be specific, direct, and analytical. No fluff. Use the stats.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const report = response.content.find(b => b.type === 'text')?.text || '';
    return NextResponse.json({ report });
  } catch (e) {
    return NextResponse.json({ report: 'Unable to generate scout report.' });
  }
}