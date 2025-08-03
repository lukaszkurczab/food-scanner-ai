export type SubscriptionState =
  | "premium_active"
  | "premium_expired"
  | "free_active"
  | "free_expired";

export type Subscription = {
  state: SubscriptionState;
  renewDate?: string;
  endDate?: string;
  plan?: string;
  lastPayment?: string;
  lastPaymentAmount?: string;
  startDate?: string;
};
