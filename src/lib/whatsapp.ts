export const buildWhatsAppLink = (phone: string, message: string): string =>
  `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;

export const buildCallLink = (phone: string): string => `tel:+91${phone}`;

export const buildRenewalWhatsApp = (phone: string, name: string, daysLeft: number, isExpired: boolean): string => {
  const message = isExpired
    ? `Hi ${name}! 👋 Your gym membership expired ${Math.abs(daysLeft)} days ago. Please renew to continue your fitness journey! - FitnessWynk`
    : `Hi ${name}! 👋 Your gym membership expires in ${daysLeft} days. Let me know if you want to renew via UPI or Cash. Thanks! - FitnessWynk`;
  return buildWhatsAppLink(phone, message);
};

export const buildEnquiryWhatsApp = (phone: string, name: string): string => {
  const message = `Hello ${name}, thank you for your enquiry at FitnessWynk! How can we help you join? - FitnessWynk`;
  return buildWhatsAppLink(phone, message);
};

export const buildMemberWhatsApp = (phone: string, name: string, expiryFormatted: string): string => {
  const message = `Hello ${name}, your membership at FitnessWynk expires on ${expiryFormatted}. Please pay to renew! - FitnessWynk`;
  return buildWhatsAppLink(phone, message);
};
