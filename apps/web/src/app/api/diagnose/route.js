import sql from "@/app/api/utils/sql";

export async function POST(request) {
  try {
    const { text } = await request.json();

    // Fetch recent logs (last 14 days)
    const recentLogs = await sql`
      SELECT l.mood_rating, l.note, l.logged_at, a.name as activity_name
      FROM logs l
      LEFT JOIN activities a ON l.activity_id = a.id
      WHERE l.logged_at >= NOW() - INTERVAL '14 days'
      ORDER BY l.logged_at DESC
      LIMIT 30
    `;

    // Per-activity mood averages (all time)
    const activityStats = await sql`
      SELECT
        a.name,
        ROUND(AVG(l.mood_rating)::numeric, 1) as avg_mood,
        COUNT(l.id) as log_count
      FROM activities a
      JOIN logs l ON a.id = l.activity_id
      GROUP BY a.id, a.name
      ORDER BY avg_mood DESC
    `;

    const overallAvg =
      recentLogs.length > 0
        ? (
            recentLogs.reduce((sum, l) => sum + l.mood_rating, 0) /
            recentLogs.length
          ).toFixed(1)
        : null;

    // Build readable context block for the AI
    let contextBlock = "";
    if (recentLogs.length > 0) {
      contextBlock +=
        "\n\nUSER DATA CONTEXT (use this to personalise your response):\n";
      contextBlock += `- Average mood (last 14 days): ${overallAvg}/10 across ${recentLogs.length} entries\n`;

      if (activityStats.length > 0) {
        const best = activityStats[0];
        const worst = activityStats[activityStats.length - 1];
        contextBlock += `- Activity that lifts mood most: "${best.name}" (avg ${best.avg_mood}/10, ${best.log_count} sessions)\n`;
        if (activityStats.length > 1) {
          contextBlock += `- Activity with lowest mood: "${worst.name}" (avg ${worst.avg_mood}/10, ${worst.log_count} sessions)\n`;
        }
        contextBlock +=
          "- All tracked activities: " +
          activityStats.map((a) => `${a.name} (${a.avg_mood}/10)`).join(", ") +
          "\n";
      }

      const last3 = recentLogs.slice(0, 3);
      contextBlock +=
        "- Most recent entries: " +
        last3
          .map(
            (l) =>
              `${l.activity_name || "mood check"} -> ${l.mood_rating}/10${l.note ? ` ("${l.note}")` : ""}`,
          )
          .join("; ") +
        "\n";
    } else {
      contextBlock =
        "\n\nUSER DATA CONTEXT: No activity logs yet — give general advice based on their message only.\n";
    }

    const prompt =
      `As a "Happiness OS" assistant, analyze the following user sentiment: "${text}".` +
      contextBlock +
      `
Using both what the user wrote AND their personal activity/mood data above, classify their primary need into ONE of these categories:
- Rest
- Social connection
- Mental stimulation
- Going outside / movement
- Emotional processing

Provide 1-2 short actionable recommendations (max 20 words each). Where relevant, reference their specific tracked activities — for example, suggest an activity that has historically lifted their mood.

Format your response as JSON:
{
  "category": "Category Name",
  "analysis": "Empathetic analysis referencing their data where possible (2-3 sentences)",
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}`;

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_CREATE_APP_URL}/integrations/google-gemini-2-5-flash/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
        }),
      },
    );

    if (!response.ok) {
      throw new Error("Gemini API failed");
    }

    const data = await response.json();
    const resultText = data.choices[0].message.content;

    // Strip markdown code fences if present
    const jsonRegex1 = /^```json\s*/i;
    const jsonRegex2 = /^```\s*/i;
    const jsonRegex3 = /\s*```$/i;
    const cleanedJson = resultText
      .replace(jsonRegex1, "")
      .replace(jsonRegex2, "")
      .replace(jsonRegex3, "")
      .trim();

    const result = JSON.parse(cleanedJson);

    // Save diagnosis to DB
    await sql`
      INSERT INTO ai_diagnoses (input_text, category, recommendation)
      VALUES (${text}, ${result.category}, ${result.recommendations.join(", ")})
    `;

    return Response.json(result);
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Failed to diagnose needs" },
      { status: 500 },
    );
  }
}
