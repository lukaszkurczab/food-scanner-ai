import { Subscription } from "@/src/types/subscription";
import { useEffect, useState } from "react";
import Purchases from "react-native-purchases";

function mapRevenueCatToSubscription(customerInfo: any): Subscription {
  const premium = customerInfo.entitlements.active["premium"];
  if (premium) {
    return {
      state: "premium_active",
      renewDate: premium.expirationDate?.split("T")[0] || undefined,
      plan: premium.productIdentifier?.includes("year") ? "yearly" : "monthly",
      lastPayment: premium.latestPurchaseDate?.split("T")[0] || undefined,
      lastPaymentAmount: "",
      startDate: premium.originalPurchaseDate?.split("T")[0] || undefined,
    };
  } else if (
    customerInfo.entitlements["premium"] &&
    customerInfo.entitlements["premium"].expirationDate
  ) {
    return {
      state: "premium_expired",
      endDate:
        customerInfo.entitlements["premium"].expirationDate.split("T")[0],
      lastPayment:
        customerInfo.entitlements["premium"].latestPurchaseDate?.split(
          "T"
        )[0] || undefined,
      lastPaymentAmount: "",
      startDate:
        customerInfo.entitlements["premium"].originalPurchaseDate?.split(
          "T"
        )[0] || undefined,
    };
  } else {
    return {
      state: "free_active",
    };
  }
}

export function useSubscriptionData() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    async function fetchSubscription() {
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        setSubscription(mapRevenueCatToSubscription(customerInfo));
      } catch (e) {
        setSubscription({ state: "free_active" });
      }
    }
    fetchSubscription();
  }, []);

  return subscription;
}
