import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get("date");
    const search = url.searchParams.get("search");
    const month = url.searchParams.get("month"); // YYYY-MM

    const noStore = { headers: { "Cache-Control": "no-store" } };

    if (date) {
      const entries = await sql`
        SELECT * FROM journal_entries WHERE entry_date = ${date} LIMIT 1
      `;
      return Response.json(entries[0] || null, noStore);
    }

    if (month) {
      const entries = await sql`
        SELECT * FROM journal_entries
        WHERE TO_CHAR(entry_date, 'YYYY-MM') = ${month}
        ORDER BY entry_date DESC
      `;
      return Response.json(entries, noStore);
    }

    if (search) {
      const term = "%" + search + "%";
      const entries = await sql(
        `SELECT * FROM journal_entries
         WHERE LOWER(content) LIKE LOWER($1)
            OR EXISTS (
              SELECT 1 FROM unnest(tags) t WHERE LOWER(t) LIKE LOWER($1)
            )
         ORDER BY entry_date DESC LIMIT 50`,
        [term],
      );
      return Response.json(entries, noStore);
    }

    const entries = await sql`
      SELECT * FROM journal_entries ORDER BY entry_date DESC LIMIT 100
    `;
    return Response.json(entries, noStore);
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Failed to fetch journal entries" },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const { entry_date, content, day_rating, tags } = await request.json();

    if (!entry_date || !content?.trim()) {
      return Response.json(
        { error: "Date and content are required" },
        { status: 400 },
      );
    }

    const tagsArray = Array.isArray(tags) ? tags : [];

    const [entry] = await sql`
      INSERT INTO journal_entries (entry_date, content, day_rating, tags, updated_at)
      VALUES (${entry_date}, ${content}, ${day_rating}, ${tagsArray}, NOW())
      ON CONFLICT (entry_date)
      DO UPDATE SET
        content = EXCLUDED.content,
        day_rating = EXCLUDED.day_rating,
        tags = EXCLUDED.tags,
        updated_at = NOW()
      RETURNING *
    `;

    return Response.json(entry);
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Failed to save journal entry" },
      { status: 500 },
    );
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json();
    if (!id) return Response.json({ error: "id required" }, { status: 400 });
    const result =
      await sql`DELETE FROM journal_entries WHERE id = ${id} RETURNING id`;
    if (result.length === 0)
      return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ success: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to delete" }, { status: 500 });
  }
}
