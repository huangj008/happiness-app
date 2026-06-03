import sql from "@/app/api/utils/sql";

export async function GET() {
  try {
    // Impact score = avg mood for that activity minus the scale midpoint (5.5)
    // This way both positive activities show positive scores, not relative to each other
    const SCALE_MIDPOINT = 5.5;

    const stats = await sql`
      SELECT 
        a.id, 
        a.name, 
        a.category,
        AVG(l.mood_rating) as avg_rating,
        COUNT(l.id) as log_count,
        (AVG(l.mood_rating) - ${SCALE_MIDPOINT}) as impact_score
      FROM activities a
      LEFT JOIN logs l ON a.id = l.activity_id
      GROUP BY a.id, a.name, a.category
      ORDER BY impact_score DESC NULLS LAST
    `;

    // Convert string values to numbers, handle nulls for untracked activities
    const formattedStats = stats.map((stat) => ({
      ...stat,
      avg_rating: stat.avg_rating != null ? parseFloat(stat.avg_rating) : null,
      log_count: parseInt(stat.log_count) || 0,
      impact_score:
        stat.impact_score != null ? parseFloat(stat.impact_score) : null,
    }));

    return Response.json({
      stats: formattedStats,
      globalAverage: SCALE_MIDPOINT,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
