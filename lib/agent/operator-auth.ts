import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";

export async function isAuthorizedOperator() {
  if (process.env.CRM_AUTH_ENABLED !== "true") return process.env.NODE_ENV !== "production";
  return verifySession((await cookies()).get("monteiro_session")?.value);
}
