import { NextResponse } from 'next/server';

export async function GET() {
  const gamesRes = await fetch(
    'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=100'
  );
  const games = await gamesRes.json();
  
  const firstEvent = games.events?.[0];
  if (!firstEvent) return NextResponse.json({ error: 'no events' });

  const summaryRes = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary?event=${firstEvent.id}`
  );
  const summary = await summaryRes.json();

  return NextResponse.json({
    eventId: firstEvent.id,
    eventName: firstEvent.name,
    summaryKeys: Object.keys(summary),
    leaders: summary.leaders || null,
    boxscore: summary.boxscore ? 'exists' : null,
    hasPlayers: summary.boxscore?.players ? 'yes' : 'no'
  });
}