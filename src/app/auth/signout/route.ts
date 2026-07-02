import { signOutAction } from "@/lib/auth/actions";

export async function GET() {
  await signOutAction();
}

export async function POST() {
  await signOutAction();
}
