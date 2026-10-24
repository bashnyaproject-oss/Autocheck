// Payments. Without ЮKassa keys every payment succeeds at once ("demo").
// With YOOKASSA_SHOP_ID and YOOKASSA_SECRET the real API is used:
//  - one-off payments with redirect confirmation (pass, inspection);
//  - a 1 ₽ card check with save_payment_method for the seller (refunded);
//  - charges from the saved card (commission or not-sold fee) without the seller present.
// Docs: https://yookassa.ru/developers/api
const crypto = require('crypto');

const live = () => !!(process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET);
const RETURN_URL = () => process.env.PUBLIC_URL ? process.env.PUBLIC_URL + '/app/profile' : 'https://osmotreno.ru/app/profile';

async function yk(path, body, idem) {
  const auth = Buffer.from(`${process.env.YOOKASSA_SHOP_ID}:${process.env.YOOKASSA_SECRET}`).toString('base64');
  const r = await fetch('https://api.yookassa.ru/v3' + path, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + auth, 'Idempotence-Key': idem, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) throw new Error('ЮKassa: ' + (j.description || r.status));
  return j;
}

/**
 * Creates a payment. Returns { status: 'succeeded' } in demo mode,
 * or { status: 'pending', confirmation_url, provider_id } with ЮKassa.
 */
async function createPayment({ id, amount, description, savePaymentMethod = false, receiptEmail }) {
  if (!live()) return { status: 'succeeded', provider_id: 'demo_' + id, method_id: savePaymentMethod ? 'demo_card_' + id : null };
  const p = await yk('/payments', {
    amount: { value: amount.toFixed(2), currency: 'RUB' },
    capture: true,
    confirmation: { type: 'redirect', return_url: RETURN_URL() },
    description,
    save_payment_method: savePaymentMethod,
    metadata: { payment_id: id },
    ...(receiptEmail ? { receipt: { customer: { email: receiptEmail }, items: [{ description, quantity: '1.00', amount: { value: amount.toFixed(2), currency: 'RUB' }, vat_code: 1 }] } } : {}),
  }, id);
  return { status: p.status, provider_id: p.id, confirmation_url: p.confirmation && p.confirmation.confirmation_url };
}

/** Charges a saved card (seller post-pay). */
async function chargeSaved({ id, amount, description, methodId }) {
  if (!live()) return { status: 'succeeded', provider_id: 'demo_' + id };
  const p = await yk('/payments', { amount: { value: amount.toFixed(2), currency: 'RUB' }, capture: true, payment_method_id: methodId, description, metadata: { payment_id: id } }, id);
  return { status: p.status, provider_id: p.id };
}

/** Webhook body → { paymentId, status, methodId } after re-checking the payment at ЮKassa. */
async function readWebhook(body) {
  const obj = body && body.object;
  if (!obj || !obj.id) return null;
  if (!live()) return { paymentId: obj.metadata && obj.metadata.payment_id, status: obj.status, methodId: obj.payment_method && obj.payment_method.saved ? obj.payment_method.id : null };
  // Never trust the webhook body: ask ЮKassa for the payment.
  const auth = Buffer.from(`${process.env.YOOKASSA_SHOP_ID}:${process.env.YOOKASSA_SECRET}`).toString('base64');
  const r = await fetch('https://api.yookassa.ru/v3/payments/' + encodeURIComponent(obj.id), { headers: { Authorization: 'Basic ' + auth } });
  const p = await r.json();
  return { paymentId: p.metadata && p.metadata.payment_id, status: p.status, methodId: p.payment_method && p.payment_method.saved ? p.payment_method.id : null, last4: p.payment_method && p.payment_method.card && p.payment_method.card.last4 };
}

const newId = (prefix) => prefix + '_' + crypto.randomBytes(8).toString('hex');

module.exports = { live, createPayment, chargeSaved, readWebhook, newId };
