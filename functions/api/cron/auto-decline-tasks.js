import { getDb } from "../../_db.js";

export async function onRequest(context) {
  try {
    var authHeader = context.request.headers.get("authorization");
    var cronSecret = context.env.CRON_SECRET;

    if (cronSecret && authHeader !== "Bearer " + cronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    var sql = getDb(context.env);
    var cutoff = Date.now() - 90000;

    var tasksToDecline = await sql`
      SELECT id, created_at, pending_since, user_id FROM pending_logins
      WHERE status = 'pending'
        AND COALESCE(pending_since, created_at) < ${cutoff}
    `;

    if (tasksToDecline.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: "No tasks to decline",
        declinedCount: 0,
      }), { headers: { "Content-Type": "application/json" } });
    }

    await sql`
      UPDATE pending_logins
      SET status = 'denied',
          resolved_at = ${Date.now()},
          resolved_by = 'auto-decline'
      WHERE status = 'pending'
        AND COALESCE(pending_since, created_at) < ${cutoff}
    `;

    return new Response(JSON.stringify({
      success: true,
      message: "Declined " + tasksToDecline.length + " expired task(s)",
      declinedCount: tasksToDecline.length,
    }), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Auto-decline error:", error);
    return new Response(JSON.stringify({ error: "Failed to auto-decline" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
