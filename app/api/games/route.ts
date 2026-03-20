import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=100',
      { next: { revalidate: 30 } }
    );

    if (!response.ok) {
      return NextResponse.json({ error: `ESPN API error: ${response.status}` }, { status: 500 });
    }

    const data = await response.json();

    // Enrich live games with win probability
    if (data?.events) {
      await Promise.all(data.events.map(async (event: any) => {
        const status = event.competitions?.[0]?.status?.type?.name;
        if (status !== 'STATUS_IN_PROGRESS' && status !== 'STATUS_HALFTIME') return;

        try {
          const summaryRes = await fetch(
            `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary?event=${event.id}`,
            { next: { revalidate: 30 } }
          );
          const summary = await summaryRes.json();
          const winProb = summary?.winprobability;
          if (winProb?.length > 0) {
            const latest = winProb[winProb.length - 1];
            event.competitions[0].homeWinProbability = latest.homeWinPercentage;
            event.competitions[0].awayWinProbability = 1 - latest.homeWinPercentage;
          }
        } catch { }
      }));
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch games', details: String(error) }, { status: 500 });
  }
}