import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export async function POST(request: Request) {
  try {
    const { game } = await request.json();

    const prompt = `You are a sports analyst covering March Madness 2026. Generate a compelling 2-3 sentence narrative about this tournament game. Be dramatic, insightful, and capture what makes this matchup interesting.

Game: ${game.home} (${game.homeSeed ? '#' + game.homeSeed + ' seed' : ''}) vs ${game.away} (${game.awaySeed ? '#' + game.awaySeed + ' seed' : ''})
Status: ${game.status}
Score: ${game.homeScore} - ${game.awayScore}
Venue: ${game.venue}

Focus on: tournament implications, seed matchup drama, any upset potential, and what fans should watch for. Keep it punchy and exciting.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    const narrative = message.content[0].type === 'text' ? message.content[0].text : '';
    return NextResponse.json({ narrative });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate narrative', details: String(error) }, { status: 500 });
  }
}