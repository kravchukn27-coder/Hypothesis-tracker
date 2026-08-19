export async function sendTelegramAlert(message: string): Promise<void> {
  const botToken = process.env.MONITOR_TELEGRAM_BOT_TOKEN;
  const chatId = process.env.MONITOR_TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ chat_id: chatId, text: message, disable_web_page_preview: "true" }),
    });
  } catch {
    // Alerting must never affect the caller's error handling.
  }
}
