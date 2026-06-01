import User from '../models/user.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_TOKEN_RE = /^ExponentPushToken\[[^\]]+\]$|^ExpoPushToken\[[^\]]+\]$/;

export const isExpoPushToken = (token) =>
  typeof token === 'string' && EXPO_TOKEN_RE.test(token);

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

/**
 * Send Expo push notifications to the given tokens. Best-effort, never throws.
 * Returns a flat array of receipt tickets ({ status, message?, details? }, …).
 *
 * Tokens with a DeviceNotRegistered receipt are removed from the matching user
 * documents so we don't keep retrying stale tokens.
 */
export const sendExpoPushes = async (tokens, payload) => {
  const valid = [...new Set((tokens || []).filter(isExpoPushToken))];
  if (valid.length === 0) return [];

  const messages = valid.map((to) => ({
    to,
    sound: payload.sound ?? 'default',
    title: payload.title,
    body: payload.body,
    data: payload.data || {},
    channelId: payload.channelId,
    badge: payload.badge,
    priority: payload.priority ?? 'high',
  }));

  const tickets = [];

  for (const batch of chunk(messages, 100)) {
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });
      const json = await res.json().catch(() => null);
      const data = Array.isArray(json?.data) ? json.data : [];

      const stale = [];
      data.forEach((ticket, i) => {
        tickets.push(ticket);
        if (
          ticket?.status === 'error' &&
          ticket?.details?.error === 'DeviceNotRegistered'
        ) {
          stale.push(batch[i].to);
        }
      });

      if (stale.length > 0) {
        try {
          await User.updateMany(
            { expoPushTokens: { $in: stale } },
            { $pull: { expoPushTokens: { $in: stale } } }
          );
        } catch {
          /* ignore cleanup failure */
        }
      }
    } catch (err) {
      // Network or Expo outage. Log and move on.
      console.warn('[expoPush] batch send failed:', err?.message ?? err);
    }
  }

  return tickets;
};

export const sendExpoPushToUser = async (userId, payload) => {
  try {
    const user = await User.findById(userId).select('expoPushTokens').lean();
    if (!user?.expoPushTokens?.length) return [];
    return sendExpoPushes(user.expoPushTokens, payload);
  } catch (err) {
    console.warn('[expoPush] sendExpoPushToUser failed:', err?.message ?? err);
    return [];
  }
};
