import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Estimated % of brackets that had this seed winning each round
// Based on real historical bracket pick patterns
function estimatedPickPct(seed: number, round: string): number {
  const pickRates: Record<number, Record<string, number>> = {
    1:  { 'Round of 64': 99, 'Round of 32': 91, 'Sweet 16': 72, 'Elite 8': 52, 'Final Four': 35, 'Championship': 22 },
    2:  { 'Round of 64': 96, 'Round of 32': 79, 'Sweet 16': 54, 'Elite 8': 32, 'Final Four': 18, 'Championship': 10 },
    3:  { 'Round of 64': 91, 'Round of 32': 68, 'Sweet 16': 40, 'Elite 8': 20, 'Final Four': 10, 'Championship': 5  },
    4:  { 'Round of 64': 85, 'Round of 32': 58, 'Sweet 16': 28, 'Elite 8': 12, 'Final Four': 5,  'Championship': 2  },
    5:  { 'Round of 64': 76, 'Round of 32': 46, 'Sweet 16': 18, 'Elite 8': 7,  'Final Four': 2,  'Championship': 1  },
    6:  { 'Round of 64': 68, 'Round of 32': 36, 'Sweet 16': 12, 'Elite 8': 4,  'Final Four': 1,  'Championship': 0  },
    7:  { 'Round of 64': 62, 'Round of 32': 28, 'Sweet 16': 8,  'Elite 8': 2,  'Final Four': 0,  'Championship': 0  },
    8:  { 'Round of 64': 52, 'Round of 32': 20, 'Sweet 16': 5,  'Elite 8': 1,  'Final Four': 0,  'Championship': 0  },
    9:  { 'Round of 64': 48, 'Round of 32': 16, 'Sweet 16': 4,  'Elite 8': 1,  'Final Four': 0,  'Championship': 0  },
    10: { 'Round of 64': 38, 'Round of 32': 12, 'Sweet 16': 3,  'Elite 8': 0,  'Final Four': 0,  'Championship': 0  },
    11: { 'Round of 64': 32, 'Round of 32': 8,  'Sweet 16': 2,  'Elite 8': 0,  'Final Four': 0,  'Championship': 0  },
    12: { 'Round of 64': 24, 'Round of 32': 5,  'Sweet 16': 1,  'Elite 8': 0,  'Final Four': 0,  'Championship': 0  },
    13: { 'Round of 64': 15, 'Round of 32': 2,  'Sweet 16': 0,  'Elite 8': 0,  'Final Four': 0,  'Championship': 0  },
    14: { 'Round of 64': 9,  'Round of 32': 1,  'Sweet 16': 0,  'Elite 8': 0,  'Final Four': 0,  'Championship': 0  },
    15: { 'Round of 64': 4,  'Round of 32': 0,  'Sweet 16': 0,  'Elite 8': 0,  'Final Four': 0,  'Championship': 0  },
    16: { 'Round of 64': 1,  'Round of 32': 0,  'Sweet 16': 0,  'Elite 8': 0,  'Final Four': 0,  'Championship': 0  },
  };
  return pickRates[seed]?.[round] ?? 50;
}

export async function GET() {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://march-madness-engine.vercel.app`
      : 'http://localhost:3000';

    const bracketRes = await fetch(`${baseUrl}/api/bracket`, {
      next: { revalidate: 60 }
    });
    const bracketData = await bracketRes.json();
    const games = bracketData?.games || [];

    // Find all upset winners — teams that won despite being the higher seed number
    const upsetWinners: Map<string, any> = new Map();

    games.filter((g: any) => g.isFinal && g.home.name !== 'TBD' && g.away.name !== 'TBD')
      .forEach((g: any) => {
        const homeWon = parseInt(g.home.score) > parseInt(g.away.score);
        const winner = homeWon ? g.home : g.away;
        const loser = homeWon ? g.away : g.home;
        const winnerSeed = parseInt(winner.seed || '99');
        const loserSeed = parseInt(loser.seed || '0');

        // Only track actual upsets (winner had higher seed number)
        if (winnerSeed <= loserSeed) return;

        const existing = upsetWinners.get(winner.name);
        const bracketsBusted = estimatedPickPct(loserSeed, g.round);
        const margin = Math.abs(parseInt(g.home.score) - parseInt(g.away.score));

        if (!existing) {
          upsetWinners.set(winner.name, {
            name: winner.name,
            shortName: winner.shortName || winner.name,
            seed: winnerSeed,
            logo: winner.logo,
            color: winner.color,
            wins: [{ round: g.round, loser: loser.name, loserSeed, score: `${winner.score}-${loser.score}`, bracketsBusted, margin }],
            totalBracketsBusted: bracketsBusted,
            highestSeedBeaten: loserSeed,
          });
        } else {
          existing.wins.push({ round: g.round, loser: loser.name, loserSeed, score: `${winner.score}-${loser.score}`, bracketsBusted, margin });
          existing.totalBracketsBusted = Math.min(99, existing.totalBracketsBusted + bracketsBusted * 0.5);
          existing.highestSeedBeaten = Math.max(existing.highestSeedBeaten, loserSeed);
        }
      });

    const teams = Array.from(upsetWinners.values())
      .sort((a, b) => b.totalBracketsBusted - a.totalBracketsBusted);

    // Generate Claude chaos narratives for top 8
    await Promise.all(teams.slice(0, 8).map(async (team) => {
      try {
        const winsText = team.wins.map((w: any) =>
          `Beat #${w.loserSeed} ${w.loser} ${w.score} in the ${w.round}`
        ).join(', ');

        const response = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 150,
          messages: [{
            role: 'user',
            content: `You're a March Madness analyst. Write exactly 2 punchy sentences about why #${team.seed} ${team.name} is a bracket-busting chaos team. They have: ${winsText}. Focus on what makes them dangerous going forward. Be specific and direct. No fluff.`
          }]
        });
        team.narrative = response.content[0].type === 'text' ? response.content[0].text : '';
      } catch {
        team.narrative = '';
      }
    }));

    return NextResponse.json({ teams });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}