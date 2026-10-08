import { Star } from "lucide-react";
import { memo, useMemo } from "react";
import { day, formatCount } from "@/lib/format";
import { snippets } from "@/lib/search";
import type { Repo } from "@/lib/types";
import { Marked } from "./marked";

interface Props {
  id: string;
  repo: Repo;
  terms: string[];
  active: boolean;
  topics: string[];
  onTopic(topic: string): void;
  onLanguage(language: string): void;
  onList(list: string): void;
}

export const RepoRow = memo(function RepoRow({
  id,
  repo,
  terms,
  active,
  topics,
  onTopic,
  onLanguage,
  onList,
}: Props) {
  const lines = useMemo(() => snippets(repo, terms), [repo, terms]);

  return (
    <li
      id={id}
      aria-current={active || undefined}
      className={`space-y-1.5 border-b border-line px-3 py-3 last:border-b-0 sm:px-4 ${
        active ? "bg-accent-soft" : "hover:bg-hover"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <a
          href={repo.url}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 break-words font-medium text-accent hover:underline"
        >
          <span className="text-dim">
            <Marked text={`${repo.owner}/`} terms={terms} />
          </span>
          <Marked text={repo.name} terms={terms} />
        </a>
        <span className="flex shrink-0 items-center gap-1 text-[13px] text-dim">
          <Star className="size-3.5" />
          {formatCount(repo.stars)}
        </span>
      </div>

      {repo.description && (
        <p className="break-words text-dim">
          <Marked text={repo.description} terms={terms} />
        </p>
      )}

      {lines.map((line) => (
        <p
          key={line}
          className="break-words border-l-2 border-line pl-2 font-mono text-xs text-dim"
        >
          <Marked text={line} terms={terms} />
        </p>
      ))}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-dim">
        {repo.language && (
          <button
            type="button"
            tabIndex={-1}
            className="hover:text-fg hover:underline"
            onClick={() => onLanguage(repo.language as string)}
          >
            {repo.language}
          </button>
        )}
        <span>Starred {day(repo.starredAt)}</span>
        {repo.lists.map((list) => (
          <button
            key={list}
            type="button"
            tabIndex={-1}
            className="hover:text-fg hover:underline"
            onClick={() => onList(list)}
          >
            ☰ {list}
          </button>
        ))}
        {repo.topics.slice(0, 6).map((topic) => (
          <button
            key={topic}
            type="button"
            tabIndex={-1}
            className={`chip ${topics.includes(topic) ? "border-accent bg-accent-soft text-accent" : ""}`}
            onClick={() => onTopic(topic)}
          >
            {topic}
          </button>
        ))}
      </div>
    </li>
  );
});
