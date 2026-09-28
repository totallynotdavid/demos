import type { PostcardContent } from "@/types/config";

interface EtherealLayoutProps {
  content: PostcardContent;
}

export function EtherealLayout({ content }: EtherealLayoutProps) {
  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center p-(--p-padding) text-(--p-ink) bg-(--p-bg) font-(family-name:--p-font-body) overflow-hidden">
      {/* soft orb gradient in the back */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full blur-3xl opacity-30 pointer-events-none"
        style={{
          background: `radial-gradient(circle, var(--p-accent) 0%, transparent 70%)`,
        }}
      />

      {/* top: contact info */}
      <div className="absolute top-(--p-padding) w-full flex justify-between px-(--p-padding) text-[10px] tracking-widest uppercase opacity-60">
        <span>{content.contact.phone}</span>
        <span>{content.contact.hours.weekdays.split(":")[1]}</span>
      </div>

      {/* center: title */}
      <div className="relative z-10 text-center space-y-6">
        <span className="block text-xs font-serif italic tracking-widest opacity-80">
          Est. 2024
        </span>
        <h1 className="text-6xl font-(family-name:--p-font-head) font-light tracking-wide">
          {content.title}
        </h1>
        <div className="w-px h-12 bg-(--p-ink) mx-auto opacity-20"></div>
        <p className="text-xs uppercase tracking-[0.3em] opacity-80">
          {content.subtitle}
        </p>
      </div>

      {/* bottom: list of services */}
      <div className="absolute bottom-(--p-padding) w-full text-center">
        <div className="flex flex-wrap justify-center gap-4 text-[10px] uppercase tracking-wider opacity-60 max-w-xs mx-auto leading-relaxed">
          {content.services.map((s, i) => (
            <span key={i} className="whitespace-nowrap">
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
