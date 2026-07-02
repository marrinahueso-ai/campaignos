import { Check } from "lucide-react";
import Link from "next/link";
import type { GoodNewsItem, TodayGoodNews } from "@/types/today";

interface GoodNewsSectionProps {
  goodNews: TodayGoodNews;
}

export function GoodNewsSection({ goodNews }: GoodNewsSectionProps) {
  return (
    <section className="space-y-4">
      {goodNews.items.length > 0 ? (
        <>
          <p className="text-sm leading-relaxed text-cos-muted">
            Nice work lately — here&apos;s what moved forward.
          </p>
          <ul className="space-y-4">
            {goodNews.items.map((item) => (
              <GoodNewsItemRow key={item.id} item={item} />
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm leading-relaxed text-cos-muted">
          {goodNews.fallbackMessage}
        </p>
      )}
    </section>
  );
}

interface GoodNewsItemRowProps {
  item: GoodNewsItem;
}

export function GoodNewsItemRow({ item }: GoodNewsItemRowProps) {
  const content = (
    <>
      <Check
        className="mt-0.5 h-4 w-4 shrink-0 text-cos-success"
        strokeWidth={2.5}
        aria-hidden
      />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm text-cos-text">{item.message}</p>
        <p className="text-xs text-cos-muted">{item.timestampLabel}</p>
      </div>
    </>
  );

  if (item.href) {
    return (
      <li>
        <Link
          href={item.href}
          className="flex gap-3 rounded-lg transition-opacity duration-200 hover:opacity-80"
        >
          {content}
        </Link>
      </li>
    );
  }

  return <li className="flex gap-3">{content}</li>;
}
