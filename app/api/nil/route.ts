import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  try {
    const { player } = await request.json();

    const prompt = `You are a sports marketing and NIL (Name Image Likeness) expert analyzing a college basketball player during March Madness 2026.

Player: ${player.name}
Team: ${player.team} (#${player.teamSeed} seed)
Opponent: ${player.oppName} (#${player.oppSeed} seed)
Stats: ${Object.values(player.stats).map((s: any) => `${s.value} ${s.label}`).join(', ')}
Cinderella Score: ${player.cinderellaScore}/10
Game Status: ${player.gameStatus}

Generate a concise NIL valuation report with these sections:
💰 ESTIMATED NIL VALUE: Give a specific dollar range for deal value
🎯 BRAND FIT: Top 3 brand categories that would work (e.g. sportswear, energy drinks, local business)
📱 MARKETABILITY: Rate their current tournament marketability and why
🚀 UPSIDE: If this team makes a deep run, what does their NIL value become?
📖 THE STORY: 2 sentences on what makes this player's March Madness story compelling to brands

Be specific and realistic. Use actual dollar figures.`;

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