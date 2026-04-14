import crypto from 'crypto';
import { AppError } from '../errors/AppError.js';

const BASE_URL = 'https://api.monime.io';

const headers = (idempotencyKey) => ({
  Authorization: `Bearer ${process.env.MONIME_API_KEY}`,
  'Monime-Space-Id': process.env.MONIME_SPACE_ID,
  'Content-Type': 'application/json',
  ...(idempotencyKey && { 'Idempotency-Key': idempotencyKey }),
});

export const createCheckoutSession = async ({
  name, priceInMinorUnits, currency = 'SLE',
  successUrl, cancelUrl, reference, metadata,
}) => {
  const idempotencyKey = `checkout-${reference}`;

  const res = await fetch(`${BASE_URL}/v1/checkout-sessions`, {
    method: 'POST',
    headers: headers(idempotencyKey),
    body: JSON.stringify({
      name,
      lineItems: [{ name, price: { value: priceInMinorUnits, currency }, quantity: 1 }],
      successUrl,
      cancelUrl,
      reference,
      metadata,
    }),
  });

  const data = await res.json();
  if (!data.success) throw new AppError(data.error?.message || 'Failed to create checkout session', 400);
  return data.result;
};

export const getCheckoutSession = async (sessionId) => {
  const res = await fetch(`${BASE_URL}/v1/checkout-sessions/${sessionId}`, {
    headers: headers(),
  });
  const data = await res.json();
  if (!data.success) throw new AppError(data.error?.message || 'Session not found', 404);
  return data.result;
};

export const verifyWebhookSignature = (rawBody, req) => {
  const secret = process.env.MONIME_WEBHOOK_SECRET;
  if (!secret) throw new AppError('Webhook secret not configured', 500);

  // Monime sends signature in one of these headers
  const signature =
    req.headers['x-monime-signature'] ||
    req.headers['x-webhook-signature'] ||
    req.headers['monime-signature'] ||
    '';

  if (!signature) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature.replace(/^sha256=/, ''), 'hex'),
      Buffer.from(expected, 'hex'),
    );
  } catch {
    return false;
  }
};
