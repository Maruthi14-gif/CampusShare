import QRCode from "qrcode"

/** Renders the item's public URL as a QR data URL, for the printable tag. */
export async function itemQrDataUrl(code: string, baseUrl: string) {
  return QRCode.toDataURL(`${baseUrl}/t/${code}`, {
    margin: 1,
    width: 512,
    errorCorrectionLevel: "M", // survives a scuffed sticker
    color: { dark: "#0f172a", light: "#ffffff" },
  })
}

/** Works locally and on Vercel without any config. */
export function baseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return "http://localhost:3000"
}
