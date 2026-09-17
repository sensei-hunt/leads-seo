import { getDb } from "../../_db.js";
import { answerCallback, editMessage, buildApprovedMessage, buildDeniedMessage } from "../../_telegram.js";

export async function onRequestPost(context) {
  try {
    var body = await context.request.json();

    if (!body.callback_query) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    var callbackId = body.callback_query.id;
    var data = body.callback_query.data;
    var message = body.callback_query.message;
    if (!data || !message) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    var parts = data.split(":");
    var action = parts[0];
    var taskId = parts[1];
    if (!taskId || (action !== "approve" && action !== "deny")) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    var chatId = message.chat.id;
    var status = action === "approve" ? "approved" : "denied";

    var sql = getDb(context.env);
    var rows = await sql`
      UPDATE pending_logins
      SET status = ${status},
          resolved_at = ${Date.now()},
          resolved_by = 'telegram'
      WHERE id = ${taskId} AND status = 'pending'
      RETURNING *
    `;

    if (rows.length === 0) {
      await answerCallback(context.env, chatId, callbackId, "Already handled or not found");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    var task = rows[0];
    await answerCallback(context.env, chatId, callbackId,
      status.charAt(0).toUpperCase() + status.slice(1));

    var updatedText = status === "approved"
      ? buildApprovedMessage(task)
      : buildDeniedMessage(task);
    await editMessage(context.env, chatId, message.message_id, updatedText);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return new Response(JSON.stringify({ error: "Webhook error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
