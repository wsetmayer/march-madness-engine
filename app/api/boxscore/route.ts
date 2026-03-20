import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('id');

  if (!eventId) return NextResponse.json({ error: 'No event ID' }, { status: 400 });

  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary?event=${eventId}`,
      { next: { revalidate: 30 } }
    );
    const data = await res.json();

    const boxscore = data?.boxscore?.players || [];
    const teams = boxscore.map((teamBox: any) => {
      const labels = teamBox.statistics?.[0]?.labels || [];
      const athletes = teamBox.statistics?.[0]?.athletes || [];

      const players = athletes
        .filter((a: any) => a.stats?.length > 0 && a.stats[0] !== '0:00' && a.stats[0] !== '0')
        .map((a: any) => {
          const getStat = (label: string) => {
            const idx = labels.indexOf(label);
            return idx >= 0 ? a.stats[idx] || '0' : '0';
          };
          return {
            name: a.athlete?.shortName || a.athlete?.displayName || '',
            headshot: a.athlete?.headshot?.href || '',
            position: a.athlete?.position?.abbreviation || '',
            starter: a.starter || false,
            min: getStat('MIN'),
            pts: getStat('PTS'),
            reb: getStat('REB'),
            ast: getStat('AST'),
            stl: getStat('STL'),
            blk: getStat('BLK'),
            fg: getStat('FG'),
            threes: getStat('3PT'),
            ft: getStat('FT'),
            to: getStat('TO'),
          };
        })
        .sort((a: any, b: any) => parseInt(b.pts) - parseInt(a.pts));

      return {
        team: teamBox.team?.displayName || '',
        logo: teamBox.team?.logo || '',
        color: teamBox.team?.color || '333333',
        players,
      };
    });

    return NextResponse.json({ teams });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}