"use client";

import type { Source } from "@/types/screening";

interface SourceListProps {
  sources: Source[];
}

export function SourceList({ sources }: SourceListProps) {
  if (!sources.length) {
    return <p className="text-sm text-default-400">No sources found</p>;
  }

  return (
    <ul className="space-y-2">
      {sources.map((source, i) => (
        <li key={i} className="flex items-start gap-2">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
            />
          </svg>
          <div className="min-w-0">
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline break-all"
            >
              {source.label}
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}
