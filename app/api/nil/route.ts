import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  try {
    const { player } = await request.json();

    const prompt = `You are a sports marketing and NIL expert analyzing a college basketball player during March Madness 2026.

Player: ${player.name}
Team: ${player.team} (#${player.teamSeed} seed)
Opponent: ${player.oppName} (#${player.oppSeed} seed)
Tournament Stats: ${Object.values(player.stats).map((s: any) => `${s.value} ${s.label}`).join(', ')}
Cinderella Score: ${player.cinderellaScore}/10
Game: ${player.gameName} — ${player.gameStatus}

First, estimate this player's SOCIAL BUZZ SCORE from 1-10 based on:
- How viral is their story? (underdog narrative, dramatic game, big upset)
- How shareable is their performance? (highlight plays, clutch moments, emotional story)
- How much national attention does their team's seed matchup generate?
- Would a casual fan who doesn't follow college basketball share a highlight of this player?

Then generate their full NIL report:

📱 SOCIAL BUZZ SCORE: X/10
One sentence explaining the viral potential and what moment or story is driving it.

💰 ESTIMATED NIL VALUE
Specific dollar range for tournament-driven deals. Factor in their social buzz.

🎯 BRAND FIT
Top 3 specific brands that would want this player right now and why.

🚀 UPSIDE POTENTIAL
Sweet 16: $X — Elite Eight: $X — Final Four: $X

📖 THE STORY
Two sentences. Make it compelling. Lead with the human angle, not the stats.

Be specific. Real dollar figures only. Think like a brand manager scrolling Twitter right now.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    const analysis = message.content[0].type === 'text' ? message.content[0].text : '';
    return NextResponse.json({ analysis });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}