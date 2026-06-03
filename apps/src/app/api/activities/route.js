import sql from "@/app/api/utils/sql";

export async function GET() {
  try {
    const activities = await sql`SELECT * FROM activities ORDER BY name ASC`;
    return Response.json(activities, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Failed to fetch activities" },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const { name, category } = await request.json();
    const [activity] = await sql`
      INSERT INTO activities (name, category)
      VALUES (${name}, ${category})
      ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category
      RETURNING *
    `;
    return Response.json(activity);
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Failed to create activity" },
      { status: 500 },
    );
  }
}

export async function PUT(request) {
  try {
    const { id, name, category } = await request.json();
    if (!id) {
      return Response.json(
        { error: "Activity id is required" },
        { status: 400 },
      );
    }

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (category !== undefined) {
      setClauses.push(`category = $${paramIndex++}`);
      values.push(category);
    }

    if (setClauses.length === 0) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(id);
    const query = `UPDATE activities SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING *`;
    const result = await sql(query, values);

    if (result.length === 0) {
      return Response.json({ error: "Activity not found" }, { status: 404 });
    }

    return Response.json(result[0]);
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Failed to update activity" },
      { status: 500 },
    );
  }
}

export async function DELETE(request) {
  try {
    const { id, force } = await request.json();
    if (!id) {
      return Response.json(
        { error: "Activity id is required" },
        { status: 400 },
      );
    }

    // Check if any logs reference this activity
    const logCheck =
      await sql`SELECT COUNT(*) as cnt FROM logs WHERE activity_id = ${id}`;
    const count = parseInt(logCheck[0]?.cnt || 0);

    if (count > 0 && !force) {
      return Response.json(
        {
          error: `This activity has ${count} log${count > 1 ? "s" : ""} attached. Delete anyway?`,
          log_count: count,
          can_force: true,
        },
        { status: 409 },
      );
    }

    // If force or no logs, delete logs first then the activity
    if (count > 0) {
      await sql`DELETE FROM logs WHERE activity_id = ${id}`;
    }

    const result =
      await sql`DELETE FROM activities WHERE id = ${id} RETURNING id`;
    if (result.length === 0) {
      return Response.json({ error: "Activity not found" }, { status: 404 });
    }

    return Response.json({
      success: true,
      id: result[0].id,
      logs_deleted: count,
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Failed to delete activity" },
      { status: 500 },
    );
  }
}
