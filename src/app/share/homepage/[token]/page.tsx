import { notFound } from "next/navigation";
import {
  getHomepageComposerShareByToken,
  renderHomepageShareHtml,
} from "@/lib/homepage-composer/share-queries";
import { buildHomepageShareDocumentHtml } from "@/lib/homepage-composer/share-document";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

interface HomepageComposerSharePageProps {
  params: Promise<{ token: string }>;
}

export default async function HomepageComposerSharePage({
  params,
}: HomepageComposerSharePageProps) {
  const { token: rawToken } = await params;
  const token = decodeURIComponent(rawToken);
  const share = await getHomepageComposerShareByToken(token);

  if (!share) {
    notFound();
  }

  const bodyHtml = renderHomepageShareHtml(share);
  const pageTitle = `${share.title} — Homepage preview`;
  const documentHtml = buildHomepageShareDocumentHtml({
    title: pageTitle,
    bodyHtml,
  });

  return (
    <iframe
      title={pageTitle}
      srcDoc={documentHtml}
      className="min-h-screen w-full border-0"
      sandbox="allow-scripts allow-same-origin allow-modals"
    />
  );
}
