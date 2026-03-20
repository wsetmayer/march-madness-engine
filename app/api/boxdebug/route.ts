import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('id');

  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary?event=${eventId}`
  );
  const data = await res.json();
  const boxscore = data?.boxscore?.players?.[0];
  
  return NextResponse.json({
    labels: boxscore?.statistics?.[0]?.labels || [],
    firstPlayer: boxscore?.statistics?.[0]?.athletes?.[0]?.stats || []
  });
}