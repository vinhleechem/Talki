/**
 * RichText – renders inline markdown-like formatting:
 *   **text**  → <strong> bold
 *   *text*    → <em> italic (styled)
 * Supports multi-line (newlines → <br />).
 */

import React from "react";

interface Props {
  text: string;
  className?: string;
}

type Segment =
  | { kind: "bold"; content: string }
  | { kind: "italic"; content: string }
  | { kind: "plain"; content: string };

function parseSegments(line: string): Segment[] {
  const segments: Segment[] = [];
  // Match **bold** first, then *italic* (order matters)
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(line)) !== null) {
    if (match.index > last) {
      segments.push({ kind: "plain", content: line.slice(last, match.index) });
    }
    if (match[1] !== undefined) {
      segments.push({ kind: "bold", content: match[1] });
    } else if (match[2] !== undefined) {
      segments.push({ kind: "italic", content: match[2] });
    }
    last = re.lastIndex;
  }

  if (last < line.length) {
    segments.push({ kind: "plain", content: line.slice(last) });
  }

  return segments;
}

const RichText: React.FC<Props> = ({ text, className }) => {
  if (!text) return null;

  const lines = text.split("\n");

  return (
    <span className={className}>
      {lines.map((line, li) => (
        <React.Fragment key={li}>
          {parseSegments(line).map((seg, si) => {
            const k = `${li}-${si}`;
            if (seg.kind === "bold") {
              return (
                <strong key={k} className="font-black text-foreground">
                  {seg.content}
                </strong>
              );
            }
            if (seg.kind === "italic") {
              return (
                <em key={k} className="italic font-semibold text-primary">
                  {seg.content}
                </em>
              );
            }
            return <React.Fragment key={k}>{seg.content}</React.Fragment>;
          })}
          {li < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </span>
  );
};

export default RichText;
