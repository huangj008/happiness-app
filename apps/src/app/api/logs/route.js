import sql from "@/app/api/utils/sql";

export async function GET() {
  try {
    const logs = await sql`
      SELECT l.*, a.name as activity_name, a.category as activity_category
      FROM logs l
      LEFT JOIN activities a ON l.activity_id = a.id
      ORDER BY l.logged_at DESC
      LIMIT 500
    `;
    return Response.json(logs, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { activity_id, mood_rating, note, logged_at } = await request.json();

    const [log] = logged_at
      ? await sql`
          INSERT INTO logs (activity_id, mood_rating, note, logged_at)
          VALUES (${activity_id}, ${mood_rating}, ${note}, ${logged_at})
          RETURNING *
        `
      : await sql`
          INSERT INTO logs (activity_id, mood_rating, note)
          VALUES (${activity_id}, ${mood_rating}, ${note})
          RETURNING *
        `;

    return Response.json(log);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to create log" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { id, activity_id, mood_rating, note } = await request.json();
    if (!id) {
      return Response.json({ error: "Log id is required" }, { status: 400 });
    }

    const setClauses = [];
    const values = [];
    let idx = 1;

    if (activity_id !== undefined) {
      setClauses.push(`activity_id = $${idx++}`);
      values.push(activity_id);
    }
    if (mood_rating !== undefined) {
      setClauses.push(`mood_rating = $${idx++}`);
      values.push(mood_rating);
    }
    if (note !== undefined) {
      setClauses.push(`note = $${idx++}`);
      values.push(note);
    }

    if (setClauses.length === 0) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(id);
    const query = `UPDATE logs SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING *`;
    const result = await sql(query, values);

    if (result.length === 0) {
      return Response.json({ error: "Log not found" }, { status: 404 });
    }
    return Response.json(result[0]);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to update log" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json();
    if (!id) {
      return Response.json({ error: "Log id is required" }, { status: 400 });
    }
    const result = await sql`DELETE FROM logs WHERE id = ${id} RETURNING id`;
    if (result.length === 0) {
      return Response.json({ error: "Log not found" }, { status: 404 });
    }
    return Response.json({ success: true, id: result[0].id });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to delete log" }, { status: 500 });
  }
}
