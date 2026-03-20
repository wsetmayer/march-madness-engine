import { NextResponse } from 'next/server';

function getTournamentDates(): string[] {
  const today = new Date();
  const dates: string[] = [];
  for (let offset = -1; offset <= 3; offset++) {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    dates.push(d.toISOString().slice(0, 10).replace(/-/g, ''));
  }
  return dates;
}

export async function GET() {
  try {
    const dates = getTournamentDates();
    const allEvents: any[] = [];

    await Promise.all(dates.map(async (date) => {
      try {
        const res = await fetch(
          `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=100&dates=${date}`,
          { next: { revalidate: 30 } }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data?.events) allEvents.push(...data.events);
      } catch { }
    }));

    // Enrich live games with win probability
    await Promise.all(allEvents.map(async (event: any) => {
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

    return NextResponse.json({ events: allEvents });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch games', details: String(error) }, { status: 500 });
  }
}