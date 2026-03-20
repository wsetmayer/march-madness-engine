import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=100',
      { next: { revalidate: 60 } }
    );

    if (!response.ok) {
      return NextResponse.json({ error: `ESPN API error: ${response.status}` }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch games', details: String(error) }, { status: 500 });
  }
}