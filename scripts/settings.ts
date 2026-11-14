export const DEFAULT_SETTINGS = {
  mode: "assisted" as const,
  allowedReplies: { availability: true, condition: true, logistics: true, pricing: false },
  pickup: true, shipping: false, meetingArea: "",
  escalation: { paymentQuestions: true, offPlatformContact: true, repeatedLowOffers: true },
  notifications: { browser: false, dealRequests: true, verificationTasks: true, approvals: true },
};
