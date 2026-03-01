import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Admin user IDs who can toggle the dashboard (comma-separated in env)
function getAdminIds(): string[] {
  return (process.env.ADMIN_USER_IDS ?? "").split(",").filter(Boolean);
}

export async function GET() {
  return NextResponse.json({
    enabled: process.env.ADMIN_ENABLED !== "false",
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const adminIds = getAdminIds();
  if (adminIds.length > 0 && !adminIds.includes(session.user.discordId)) {
    return NextResponse.json({ error: "Not an admin" }, { status: 403 });
  }

  const body = await request.json();
  const enabled = body.enabled !== false;

  // For v1, we just return the state. To actually toggle, you update
  // the ADMIN_ENABLED env var in Vercel. In v2, this could use Vercel KV.
  return NextResponse.json({
    enabled,
    message: enabled
      ? "Dashboard is enabled"
      : "Dashboard is disabled. Update ADMIN_ENABLED env var in Vercel to toggle.",
  });
}
