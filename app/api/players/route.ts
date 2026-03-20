import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=100',
      { next: { revalidate: 60 } }
    );

    const data = await res.json();
    if (!data?.events) return NextResponse.json({ players: [] });

    const playerMap = new Map();

    const promises = data.events.slice(0, 12).map(async (event: any) => {
      const comp = event.competitions[0];
      const eventId = event.id;

      try {
        const summaryRes = await fetch(
          `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary?event=${eventId}`,
          { next: { revalidate: 60 } }
        );
        const summary = await summaryRes.json();
        const leaders = summary?.leaders || [];

        leaders.forEach((teamLeaders: any) => {
          const teamId = teamLeaders.team?.id;
          const teamName = teamLeaders.team?.displayName || '';
          const teamLogo = teamLeaders.team?.logo || '';

          const home = comp.competitors.find((c: any) => c.homeAway === 'home');
          const away = comp.competitors.find((c: any) => c.homeAway === 'away');
          const isHome = home?.team?.id === teamId;
          const teamComp = isHome ? home : away;
          const oppComp = isHome ? away : home;

          const teamSeed = parseInt(teamComp?.curatedRank?.current || '8');
          const oppSeed = parseInt(oppComp?.curatedRank?.current || '8');

          teamLeaders.leaders?.forEach((statCategory: any) => {
            statCategory.leaders?.forEach((leader: any) => {
              if (!leader.athlete) return;
              const pid = leader.athlete.id;
              const statValue = parseFloat(leader.value) || 0;

              const cinderellaScore = Math.max(1, Math.min(10, Math.round(
                ((teamSeed / 16) * 5) + (statValue / 35) * 5
              )));

              if (!playerMap.has(pid)) {
                playerMap.set(pid, {
                  id: pid,
                  name: leader.athlete.displayName,
                  team: teamName,
                  teamLogo,
                  teamSeed,
                  oppSeed,
                  oppName: oppComp?.team?.displayName || '',
                  headshot: leader.athlete.headshot?.href || '',
                  gameName: event.name,
                  gameStatus: comp.status?.type?.shortDetail || '',
                  isLive: comp.status?.type?.name === 'STATUS_IN_PROGRESS',
                  isFinal: comp.status?.type?.name === 'STATUS_FINAL',
                  stats: {},
                  cinderellaScore
                });
              }

              const player = playerMap.get(pid);
              player.stats[statCategory.name] = {
                value: leader.displayValue,
                label: statCategory.displayName
              };
              if (cinderellaScore > player.cinderellaScore) {
                player.cinderellaScore = cinderellaScore;
              }
            });
          });
        });
      } catch {
        // skip failed events
      }
    });

    await Promise.all(promises);

    const sorted = Array.from(playerMap.values())
      .sort((a, b) => b.cinderellaScore - a.cinderellaScore)
      .slice(0, 20);

    return NextResponse.json({ players: sorted });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}