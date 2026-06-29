import { ok, handleError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || null;
    if (!publicKey) {
      return ok({ publicKey: null, configured: false });
    }
    return ok({ publicKey, configured: true });
  } catch (e) {
    return handleError(e, "Failed to get VAPID public key");
  }
}
