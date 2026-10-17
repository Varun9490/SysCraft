/**
 * Brand accent colors for the 16 guided labs' companies.
 * Used by lab cards, previews, and workspace headers. Colors are tuned
 * for legibility on the zinc-950 dark surface.
 */

export interface CompanyBrand {
  labId: string;
  company: string;
  color: string;
  soft: string;
}

export const COMPANY_BRANDS: CompanyBrand[] = [
  { labId: "bitly-url-shortener", company: "Bitly", color: "#6CC24A", soft: "rgba(108,194,74,0.14)" },
  { labId: "pastebin-service", company: "Pastebin", color: "#4C9AFF", soft: "rgba(76,154,255,0.14)" },
  { labId: "youtube-upload-playback", company: "YouTube", color: "#FF4242", soft: "rgba(255,66,66,0.14)" },
  { labId: "whatsapp-chat", company: "WhatsApp", color: "#25D366", soft: "rgba(37,211,102,0.14)" },
  { labId: "twitter-timeline", company: "X", color: "#E7E9EA", soft: "rgba(231,233,234,0.12)" },
  { labId: "instagram-feed", company: "Meta", color: "#E4405F", soft: "rgba(228,64,95,0.14)" },
  { labId: "bookmyshow-ticketing", company: "BookMyShow", color: "#F5C518", soft: "rgba(245,197,24,0.13)" },
  { labId: "razorpay-payments", company: "Razorpay", color: "#3395FF", soft: "rgba(51,149,255,0.14)" },
  { labId: "uber-matching", company: "Uber", color: "#C6C6C6", soft: "rgba(198,198,198,0.12)" },
  { labId: "netflix-streaming", company: "Netflix", color: "#E50914", soft: "rgba(229,9,20,0.14)" },
  { labId: "search-autocomplete", company: "Google", color: "#4285F4", soft: "rgba(66,133,244,0.14)" },
  { labId: "dynamodb-from-scratch", company: "AWS", color: "#FF9900", soft: "rgba(255,153,0,0.14)" },
  { labId: "notification-platform", company: "Uber", color: "#C6C6C6", soft: "rgba(198,198,198,0.12)" },
  { labId: "dropbox-file-sync", company: "Dropbox", color: "#0061FF", soft: "rgba(0,97,255,0.16)" },
  { labId: "distributed-rate-limiter", company: "Stripe", color: "#8E7CFF", soft: "rgba(142,124,255,0.16)" },
  { labId: "agentic-rag-support", company: "Intercom", color: "#1F8DED", soft: "rgba(31,141,237,0.14)" },
];

const BRAND_BY_LAB = new Map(COMPANY_BRANDS.map((b) => [b.labId, b]));

const FALLBACK_BRAND: CompanyBrand = {
  labId: "",
  company: "",
  color: "#CDA86A",
  soft: "rgba(205,168,106,0.14)",
};

export function getCompanyBrand(labId: string): CompanyBrand {
  return BRAND_BY_LAB.get(labId) ?? FALLBACK_BRAND;
}
