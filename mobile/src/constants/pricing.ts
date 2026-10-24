/** Pricing hypotheses for the pilot. Server is the source of truth in production. */
export const PASS_PRICE = 990; // ₽ per 30 days
export const WEEKLY_REPORTS = 30;
export const INSPECTION_PRICE = 2500;
export const NOT_SOLD_FEE = 2990; // seller pays if not sold through the platform in 60 days
export const COMMISSION = (price: number) => Math.min(30000, Math.max(5000, Math.round(price * 0.01)));
