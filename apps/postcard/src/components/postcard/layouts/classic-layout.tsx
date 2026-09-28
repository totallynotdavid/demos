import type { PostcardContent } from "@/types/config";

interface ClassicLayoutProps {
  content: PostcardContent;
}

export function ClassicLayout({ content }: ClassicLayoutProps) {
  return (
    <div className="h-full w-full flex flex-col items-center text-center p-(--p-padding) text-(--p-ink) bg-(--p-bg) font-(family-name:--p-font-body)">
      {/* header */}
      <div className="flex-1 flex flex-col justify-end pb-2 w-full">
        <h1 className="text-6xl mb-2 font-(family-name:--p-font-head) tracking-tight text-(--p-ink)">
          {content.title}
        </h1>
        <p className="text-xs tracking-[0.2em] uppercase opacity-60 font-medium">
          {content.subtitle}
        </p>
      </div>

      {/* services */}
      <div className="flex-1 w-full max-w-sm mx-auto flex flex-col justify-start pt-2">
        <div className="w-12 h-px bg-(--p-accent) opacity-40 mx-auto mb-4" />

        <div className="flex flex-col gap-1 opacity-80 text-xs sm:text-sm leading-relaxed">
          {content.services.map((service, i) => (
            <span key={i} className="block">
              {service}
            </span>
          ))}
        </div>
      </div>

      {/* contact info */}
      <div className="w-full mt-auto pt-4">
        <div className="flex flex-col items-center gap-2 text-[10px] tracking-widest uppercase opacity-50 font-medium">
          {/* address */}
          <div className="flex flex-wrap justify-center gap-x-2">
            {content.contact.address.map((line, i) => (
              <span key={i} className="flex items-center">
                {line}
                {i < content.contact.address.length - 1 && (
                  <span className="ml-2 opacity-50">•</span>
                )}
              </span>
            ))}
          </div>

          {/* contact details */}
          <div className="flex items-center gap-4">
            <span>{content.contact.phone}</span>
            <span className="w-px h-3 bg-current opacity-30"></span>
            <span>{content.contact.hours.weekdays}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
