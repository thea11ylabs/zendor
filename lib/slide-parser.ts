// Slide markdown parser for canonical .slides.md format

export interface DeckMeta {
  title?: string;
  author?: string;
  theme?: string;
  date?: string;
  [key: string]: unknown;
}

export interface SlideMeta {
  title?: string;
  subtitle?: string;
  layout?: string;
  time?: number;
  importance?: string;
  [key: string]: unknown;
}

// Block directive types
export type BlockType =
  | "callout"
  | "note"
  | "columns"
  | "groan-zone"
  | "flowchart"
  | "mindmap"
  | "timeline"
  | "comparison"
  | "quote"
  | "code"
  | "image-grid"
  | "stats"
  | "process"
  | "pyramid"
  | "cycle"
  | "matrix"
  | "funnel"
  | "venn"
  | "org-chart"
  | "kanban"
  | "swot"
  | "custom";

export interface BlockDirective {
  type: BlockType;
  attrs: Record<string, string>;
  content: string;
  children?: BlockDirective[];
}

export interface ColumnBlock {
  name: string; // "left", "right", "center"
  content: string;
}

export interface ParsedBlock {
  kind: "text" | "heading" | "list" | "directive" | "code" | "image";
  level?: number; // for headings
  ordered?: boolean; // for lists
  items?: string[]; // for lists
  content?: string;
  directive?: BlockDirective;
  language?: string; // for code
  src?: string; // for images
  alt?: string; // for images
}

export interface ParsedSlide {
  meta: SlideMeta;
  content: string;
  title?: string;
  subtitle?: string;
  blocks: ParsedBlock[];
}

export interface ParsedDeck {
  meta: DeckMeta;
  slides: ParsedSlide[];
}

// Parse YAML-like front matter
function parseFrontMatter(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = text.trim().split("\n");

  for (const line of lines) {
    const match = line.match(/^(\w+):\s*"?([^"]*)"?\s*$/);
    if (match) {
      const [, key, value] = match;
      // Try to parse numbers
      const numValue = parseFloat(value);
      result[key] = isNaN(numValue) ? value : numValue;
    }
  }

  return result;
}

// Extract title from slide content (first # heading)
function extractTitle(content: string): string | undefined {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : undefined;
}

// Extract subtitle from @subtitle directive or ## heading
function extractSubtitle(content: string): string | undefined {
  // Check for @subtitle directive
  const directiveMatch = content.match(/^@subtitle\s+(.+)$/m);
  if (directiveMatch) return directiveMatch[1].trim();

  // Check for ## heading right after # heading
  const headingMatch = content.match(/^#\s+.+\n##\s+(.+)$/m);
  if (headingMatch) return headingMatch[1].trim();

  return undefined;
}

// Parse block directive attributes
function parseDirectiveAttrs(line: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const regex = /(\w[-\w]*)="([^"]*)"/g;
  let match;
  while ((match = regex.exec(line)) !== null) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

// Parse content into blocks
function parseBlocks(content: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // Block directive :::type
    if (line.trim().startsWith(":::")) {
      const openMatch = line.trim().match(/^:::(\w[-\w]*)(.*)?$/);
      if (openMatch) {
        const blockType = openMatch[1] as BlockType;
        let attrs = parseDirectiveAttrs(openMatch[2] || "");
        let blockContent = "";
        i++;

        // Collect attributes on following lines and content until :::
        while (i < lines.length) {
          const innerLine = lines[i];
          if (innerLine.trim() === ":::") {
            i++;
            break;
          }
          // Check for more attributes at start of block
          if (innerLine.trim().match(/^\w[-\w]*="/)) {
            attrs = { ...attrs, ...parseDirectiveAttrs(innerLine) };
          } else {
            blockContent += innerLine + "\n";
          }
          i++;
        }

        blocks.push({
          kind: "directive",
          directive: {
            type: blockType,
            attrs,
            content: blockContent.trim(),
          },
        });
        continue;
      }
    }

    // Code block ```
    if (line.trim().startsWith("```")) {
      const langMatch = line.trim().match(/^```(\w+)?/);
      const language = langMatch?.[1] || "";
      let codeContent = "";
      i++;

      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeContent += lines[i] + "\n";
        i++;
      }
      i++; // skip closing ```

      blocks.push({
        kind: "code",
        language,
        content: codeContent.trimEnd(),
      });
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        kind: "heading",
        level: headingMatch[1].length,
        content: headingMatch[2],
      });
      i++;
      continue;
    }

    // Image
    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      blocks.push({
        kind: "image",
        alt: imageMatch[1],
        src: imageMatch[2],
      });
      i++;
      continue;
    }

    // List (collect consecutive list items)
    if (line.match(/^[-*]\s+/) || line.match(/^\d+\.\s+/)) {
      const ordered = !!line.match(/^\d+\.\s+/);
      const items: string[] = [];

      while (i < lines.length) {
        const listLine = lines[i];
        const bulletMatch = listLine.match(/^[-*]\s+(.+)/);
        const numMatch = listLine.match(/^\d+\.\s+(.+)/);

        if (bulletMatch && !ordered) {
          items.push(bulletMatch[1]);
          i++;
        } else if (numMatch && ordered) {
          items.push(numMatch[1]);
          i++;
        } else if (listLine.trim() === "") {
          i++;
          break;
        } else {
          break;
        }
      }

      blocks.push({
        kind: "list",
        ordered,
        items,
      });
      continue;
    }

    // Inline directive @name
    if (line.startsWith("@")) {
      // Skip subtitle, already handled
      i++;
      continue;
    }

    // Regular text paragraph
    let paragraph = line;
    i++;
    while (i < lines.length && lines[i].trim() && !lines[i].match(/^[#\-*\d@:`]/) && !lines[i].startsWith(":::")) {
      paragraph += " " + lines[i].trim();
      i++;
    }

    blocks.push({
      kind: "text",
      content: paragraph,
    });
  }

  return blocks;
}

// Parse canonical slide markdown
export function parseSlideMarkdown(markdown: string): ParsedDeck {
  const sections = markdown.split(/\n---\n/);

  let deckMeta: DeckMeta = {};
  const slides: ParsedSlide[] = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i].trim();
    if (!section) continue;

    // Check if section starts with front matter
    if (section.startsWith("---")) {
      // This is front matter block
      const endIndex = section.indexOf("---", 3);
      if (endIndex > 0) {
        const frontMatter = section.slice(3, endIndex).trim();
        const meta = parseFrontMatter(frontMatter);
        const content = section.slice(endIndex + 3).trim();

        if (i === 0 && slides.length === 0) {
          // Deck front matter
          deckMeta = meta as DeckMeta;
          if (content) {
            slides.push({
              meta: {},
              content,
              title: extractTitle(content),
              subtitle: extractSubtitle(content),
              blocks: parseBlocks(content),
            });
          }
        } else {
          // Slide with front matter
          slides.push({
            meta: meta as SlideMeta,
            content,
            title: (meta.title as string) || extractTitle(content),
            subtitle: (meta.subtitle as string) || extractSubtitle(content),
            blocks: parseBlocks(content),
          });
        }
      }
    } else if (i === 0) {
      // First section without front matter - check for deck meta
      const lines = section.split("\n");
      let hasMeta = false;
      let metaEnd = 0;

      for (let j = 0; j < lines.length; j++) {
        if (lines[j].match(/^\w+:\s*/)) {
          hasMeta = true;
          metaEnd = j + 1;
        } else if (hasMeta && lines[j].trim() === "") {
          break;
        } else if (hasMeta) {
          break;
        }
      }

      if (hasMeta) {
        deckMeta = parseFrontMatter(lines.slice(0, metaEnd).join("\n")) as DeckMeta;
        const content = lines.slice(metaEnd).join("\n").trim();
        if (content) {
          slides.push({
            meta: {},
            content,
            title: extractTitle(content),
            subtitle: extractSubtitle(content),
            blocks: parseBlocks(content),
          });
        }
      } else {
        slides.push({
          meta: {},
          content: section,
          title: extractTitle(section),
          subtitle: extractSubtitle(section),
          blocks: parseBlocks(section),
        });
      }
    } else {
      // Regular slide content
      slides.push({
        meta: {},
        content: section,
        title: extractTitle(section),
        subtitle: extractSubtitle(section),
        blocks: parseBlocks(section),
      });
    }
  }

  return { meta: deckMeta, slides };
}

// Default slide markdown template
export const DEFAULT_SLIDE_MARKDOWN = `---
title: "Slide Deck Demo"
author: "Your Name"
theme: "default"
---

# Welcome
@subtitle Introduction to Slides

This presentation demonstrates the slide markdown format.

---

# Key Points

- Simple markdown syntax
- Block directives for diagrams
- Live preview as you type

---

# Two Column Layout

:::columns
@left

### Benefits
- Easy to write
- Version control friendly
- Portable format

@right

### Features
- Flowcharts
- Mindmaps
- Timelines
:::

---

# Callout Example

:::callout type="info"
This is an important note that stands out from the rest of the content.
:::

Regular content continues here.

---

# Process Flow

:::flowchart
Start -> Research -> Design -> Build -> Test -> Deploy
:::

---

# Timeline

:::timeline
2024 Q1: Planning phase
2024 Q2: Development begins
2024 Q3: Beta release
2024 Q4: Production launch
:::

---

# Comparison

:::comparison
  left-title="Before"
  right-title="After"
@left
- Manual process
- Error prone
- Slow

@right
- Automated
- Reliable
- Fast
:::

---

# Mind Map

:::mindmap
  root="Main Idea"
Ideas
  - Concept A
    - Detail 1
    - Detail 2
  - Concept B
  - Concept C
:::

---

# Stats

:::stats
  layout="grid"
100+ -> Users
50% -> Growth
24/7 -> Support
:::

---

# Code Example

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

---

# Thank You

Questions?

:::note
Speaker note: Remember to ask for feedback
:::
`;
