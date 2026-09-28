import type { PostcardContent } from "@/types/config";

interface ServiceClusterProps {
  services: PostcardContent["services"];
  separator?: string;
  className?: string;
}

export function ServiceCluster({
  services,
  separator = "—",
  className = "",
}: ServiceClusterProps) {
  return (
    <div className={`leading-relaxed ${className}`}>
      {services.map((service, index) => (
        <span key={service} className="inline-block">
          {service}
          {index < services.length - 1 && (
            <span className="mx-2 opacity-40 font-light">{separator}</span>
          )}
        </span>
      ))}
    </div>
  );
}
