import { FlyerComposerHost } from "@/components/create-with-ai/FlyerComposerHost";

export const metadata = {
  title: "Flyer · Create with AI",
  robots: {
    index: false,
    follow: false,
  },
};

type FlyerComposerPageProps = {
  searchParams: Promise<{ view?: string }>;
};

export default async function FlyerComposerPage({
  searchParams,
}: FlyerComposerPageProps) {
  const params = await searchParams;
  return <FlyerComposerHost view={params.view ?? null} />;
}
