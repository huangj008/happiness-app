export async function POST(request) {
  try {
    const { password } = await request.json();

    if (!password) {
      return Response.json({ error: "Password is required" }, { status: 400 });
    }

    // Check both variable names in case the secret was saved under either
    const candidates = [
      process.env.APP_PASSWORD,
      process.env.APP_PASSWORD_1,
    ].filter(Boolean);

    if (candidates.length === 0) {
      console.error("No APP_PASSWORD environment variable is set");
      return Response.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const trimmedInput = password.trim().toLowerCase();
    const match = candidates.some(
      (pw) => trimmedInput === pw.trim().toLowerCase(),
    );

    if (match) {
      return Response.json({ success: true });
    }

    return Response.json({ error: "Incorrect password" }, { status: 401 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
