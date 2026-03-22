import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const dates = ['20260318', '20260319', '20260320', '20260321', '20260322'];
    const allEvents: any[] = [];

    await Promise.all(dates.map(async (date) => {
      try {
        const res = await fetch(
          `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=100&dates=${date}`,
          { next: { revalidate: 60 } }
        );
        const data = await res.json();
        if (data?.events) allEvents.push(...data.events);
      } catch { }
    }));

    const games = allEvents.map((event: any) => {
      const comp = event.competitions[0];
      const home = comp.competitors.find((c: any) => c.homeAway === 'home');
      const away = comp.competitors.find((c: any) => c.homeAway === 'away');
      const isFinal = comp.status?.type?.name === 'STATUS_FINAL';
      const isLive = comp.status?.type?.name === 'STATUS_IN_PROGRESS' ||
                     comp.status?.type?.name === 'STATUS_HALFTIME';
      const homeScore = parseInt(home?.score || '0');
      const awayScore = parseInt(away?.score || '0');
      const homeWon = isFinal && homeScore > awayScore;
      const awayWon = isFinal && awayScore > homeScore;

      const venueName = comp.venue?.fullName || '';
      const city = comp.venue?.address?.city || '';

      const venueRegionMap: Record<string, string> = {
        'Bon Secours Wellness Arena': 'East',
        'KeyBank Center': 'East',
        'Xfinity Mobile Arena': 'East',
        'Viejas Arena': 'West',
        'Moda Center': 'West',
        'Enterprise Center': 'Midwest',
        'Paycom Center': 'South',
        'Benchmark International Arena': 'South',
        'UD Arena': 'First Four',
      };

      let region = venueRegionMap[venueName] || 'Other';

      return {
        id: event.id,
        name: event.name,
        date: event.date,
        isFinal,
        isLive,
        status: comp.status?.type?.shortDetail || '',
        region,
        home: {
          name: home?.team?.displayName || 'TBD',
          shortName: home?.team?.shortDisplayName || home?.team?.displayName || 'TBD',
          logo: home?.team?.logo || '',
          color: home?.team?.color || '333333',
          seed: home?.curatedRank?.current || null,
          score: home?.score || '0',
          won: homeWon,
          id: home?.team?.id || null,
        },
        away: {
          name: away?.team?.displayName || 'TBD',
          shortName: away?.team?.shortDisplayName || away?.team?.displayName || 'TBD',
          logo: away?.team?.logo || '',
          color: away?.team?.color || '333333',
          seed: away?.curatedRank?.current || null,
          score: away?.score || '0',
          won: awayWon,
          id: away?.team?.id || null,
        },
        venue: comp.venue?.fullName || '',
        city,
        round: (() => {
          const headline = comp.notes?.[0]?.headline?.toLowerCase() || '';
          if (headline.includes('first four') || venueName === 'UD Arena') return 'Round of 68';
          if (headline.includes('1st round') || headline.includes('first round')) return 'Round of 64';
          if (headline.includes('2nd round') || headline.includes('second round')) return 'Round of 32';
          if (headline.includes('sweet 16') || headline.includes('sweet sixteen') || headline.includes('regional semifinal')) return 'Sweet 16';
          if (headline.includes('elite eight') || headline.includes('elite 8') || headline.includes('regional final')) return 'Elite 8';
          if (headline.includes('final four') || headline.includes('national semifinal')) return 'Final Four';
          if (headline.includes('championship') || headline.includes('national championship')) return 'Championship';
          return 'Round of 64';
        })(),
      };
    });

    return NextResponse.json({ games });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}