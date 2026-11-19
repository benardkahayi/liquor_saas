// Who business owners contact to pay for and switch on a paid plan.
// Change this number (international format, digits only) to your business
// line if you have one.
export const UPGRADE_WHATSAPP = "255759431401";

export function upgradeWhatsAppLink(businessName: string, planLabel: string): string {
  const text = `Hello, I would like to move ${businessName} to the ${planLabel} plan on AB BusinessHub.`;
  return `https://wa.me/${UPGRADE_WHATSAPP}?text=${encodeURIComponent(text)}`;
}
