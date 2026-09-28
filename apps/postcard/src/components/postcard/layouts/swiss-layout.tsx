import type { PostcardContent } from "@/types/config";
import { GridLines } from "../shared/grid-lines";

interface SwissLayoutProps {
  content: PostcardContent;
}

export function SwissLayout({ content }: SwissLayoutProps) {
  return (
    <div className="relative h-full w-full bg-(--p-bg) text-(--p-ink) font-(family-name:--p-font-body) overflow-hidden flex flex-col">
      {/* background grid */}
      <GridLines opacity={0.15} />

      {/* title */}
      <header className="relative z-10 flex-1 flex flex-col justify-between p-(--p-padding) border-b-2 border-current">
        <div className="flex justify-between items-start">
          <span className="text-4xl font-bold opacity-20">01</span>
          <span className="text-xs font-mono uppercase tracking-widest border border-current px-2 py-1 rounded-full">
            {content.subtitle}
          </span>
        </div>

        <h1 className="text-9xl font-(family-name:--p-font-head) font-bold tracking-tighter leading-[0.8] -ml-1">
          {content.title}
        </h1>
      </header>

      <main className="relative z-10 flex h-[45%]">
        {/* left: list of services */}
        <div className="flex-1 p-(--p-padding) border-r border-current flex flex-col justify-center">
          <h3 className="text-xs font-bold uppercase mb-4 opacity-50">
            Treatment menu
          </h3>
          <ul className="space-y-1">
            {content.services.slice(0, 5).map((service, i) => (
              <li
                key={i}
                className="text-sm font-medium flex items-center justify-between"
              >
                <span>{service}</span>
                <span className="text-[10px] opacity-50">+</span>
              </li>
            ))}
          </ul>
        </div>

        {/* contact */}
        <div className="w-[40%] flex flex-col">
          <div className="flex-1 p-(--p-padding) border-b border-current flex flex-col justify-center bg-(--p-ink) text-(--p-bg)">
            <div className="text-xs leading-relaxed font-mono">
              {content.contact.address.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>

          <div className="flex-1 p-(--p-padding) flex flex-col justify-center">
            <div className="text-xs font-bold uppercase mb-1 opacity-50">
              Opening hours
            </div>
            <div className="text-sm font-medium">
              {content.contact.hours.weekdays}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
