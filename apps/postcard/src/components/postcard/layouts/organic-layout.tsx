import type { PostcardContent } from "@/types/config";
import { ServiceCluster } from "../shared/service-cluster";

interface OrganicLayoutProps {
  content: PostcardContent;
}

export function OrganicLayout({ content }: OrganicLayoutProps) {
  return (
    <div className="relative h-full w-full p-(--p-padding) text-(--p-ink) bg-(--p-bg) font-(family-name:--p-font-body) overflow-hidden flex flex-col justify-between">
      {/* background shape */}
      <div
        className="absolute -top-20 -right-20 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none mix-blend-multiply"
        style={{ backgroundColor: "var(--p-accent)" }}
      />

      {/* header */}
      <header className="relative z-10 flex flex-col items-start gap-4">
        <h1
          className="text-8xl leading-[0.85] font-(family-name:--p-font-head) tracking-tight"
          style={{ color: "var(--p-ink)" }}
        >
          {content.title}
        </h1>
        <span
          className="text-xs font-medium tracking-[0.25em] uppercase border-b pb-1"
          style={{ borderColor: "var(--p-accent)" }}
        >
          {content.subtitle}
        </span>
      </header>

      {/* middle: service list */}
      <main className="relative z-10 max-w-[70%] self-end text-right mt-auto mb-12">
        <ServiceCluster
          services={content.services}
          separator="/"
          className="text-lg italic opacity-90"
        />
      </main>

      {/* footer */}
      <footer
        className="relative z-10 flex items-end justify-between text-xs opacity-75 border-t pt-4"
        style={{ borderColor: "var(--p-accent)" }}
      >
        <div className="flex flex-col gap-1">
          {content.contact.address.map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </div>

        <div className="flex flex-col items-end gap-1 text-right">
          <span>{content.contact.phone}</span>
          <span>{content.contact.hours.weekdays}</span>
        </div>
      </footer>
    </div>
  );
}
