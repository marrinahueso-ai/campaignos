import { NextResponse } from "next/server";
import { getFlyerComposerBrandKit } from "@/lib/flyer-composer/brand-kit";

export const dynamic = "force-dynamic";

export async function GET() {
  const brandKit = await getFlyerComposerBrandKit();
  if (!brandKit) {
    return NextResponse.json(
      { error: "Sign in with an active organization to load brand kit." },
      { status: 401 },
    );
  }

  return NextResponse.json(brandKit);
}
