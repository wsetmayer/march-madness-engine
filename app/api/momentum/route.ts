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

    const plays: any[] = data?.plays || [];
    const competitors = data?.header?.competitions?.[0]?.competitors || [];

    const homeTeam = competitors.find((c: any) => c.homeAway === 'home');
    const awayTeam = competitors.find((c: any) => c.homeAway === 'away');

    // Only look at scoring plays
    const scoringPlays = plays.filter((p: any) => p.scoringPlay === true);

    if (scoringPlays.length === 0) {
      return NextResponse.json({
        homeName: homeTeam?.team?.shortDisplayName || 'Home',
        awayName: awayTeam?.team?.shortDisplayName || 'Away',
        homeColor: homeTeam?.team?.color || '333333',
        awayColor: awayTeam?.team?.color || '333333',
        homePts: 0,
        awayPts: 0,
        hasData: false,
      });
    }

    // Get the last scoring play to know current score reference point
    const lastPlay = scoringPlays[scoringPlays.length - 1];
    const currentPeriod = lastPlay.period?.number || 2;

    // Parse clock from last play to get current game time in seconds elapsed
    function clockToSecsElapsed(periodNumber: number, clockDisplay: string): number {
      const [mins, secs] = (clockDisplay || '0:00').split(':').map(Number);
      const secsRemaining = (mins * 60) + (secs || 0);
      const periodLength = 20 * 60;
      return ((periodNumber - 1) * periodLength) + (periodLength - secsRemaining);
    }

    const currentSecs = clockToSecsElapsed(
      lastPlay.period?.number || 1,
      lastPlay.clock?.displayValue || '0:00'
    );
    const windowStart = currentSecs - (5 * 60);

    // Find score at start of window
    let baseAwayScore = 0;
    let baseHomeScore = 0;
    let windowPlays: any[] = [];

    scoringPlays.forEach((play: any) => {
      const playSecs = clockToSecsElapsed(
        play.period?.number || 1,
        play.clock?.displayValue || '0:00'
      );
      if (playSecs < windowStart) {
        // Last play before window = baseline score
        baseAwayScore = play.awayScore;
        baseHomeScore = play.homeScore;
      } else {
        windowPlays.push(play);
      }
    });

    const finalAway = lastPlay.awayScore;
    const finalHome = lastPlay.homeScore;
    const awayPts = finalAway - baseAwayScore;
    const homePts = finalHome - baseHomeScore;

    return NextResponse.json({
      homeName: homeTeam?.team?.shortDisplayName || homeTeam?.team?.displayName || 'Home',
      awayName: awayTeam?.team?.shortDisplayName || awayTeam?.team?.displayName || 'Away',
      homeColor: homeTeam?.team?.color || '333333',
      awayColor: awayTeam?.team?.color || '333333',
      homePts,
      awayPts,
      windowMinutes: 5,
      playCount: windowPlays.length,
      hasData: windowPlays.length > 0,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}