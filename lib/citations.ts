// BibTeX citation types and utilities

export type CitationType =
  | "article"
  | "book"
  | "inproceedings"
  | "conference"
  | "incollection"
  | "phdthesis"
  | "mastersthesis"
  | "techreport"
  | "manual"
  | "misc"
  | "online"
  | "unpublished";

export type CitationStyle = "ieee" | "apa" | "mla";

export interface Citation {
  id: string;
  key: string; // e.g., "smith2023"
  type: CitationType;
  title: string;
  author: string;
  year: string;
  journal?: string;
  volume?: string;
  number?: string;
  pages?: string;
  publisher?: string;
  booktitle?: string;
  address?: string;
  edition?: string;
  editor?: string;
  institution?: string;
  school?: string;
  howpublished?: string;
  month?: string;
  url?: string;
  doi?: string;
  note?: string;
}

const CITATIONS_KEY = "zendor-citations";

export function getCitations(): Citation[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(CITATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveCitations(citations: Citation[]): void {
  localStorage.setItem(CITATIONS_KEY, JSON.stringify(citations));
}

export function addCitation(citation: Omit<Citation, "id">): Citation {
  const citations = getCitations();
  const newCitation: Citation = {
    ...citation,
    id: crypto.randomUUID(),
  };
  citations.push(newCitation);
  saveCitations(citations);
  return newCitation;
}

export function updateCitation(id: string, updates: Partial<Citation>): void {
  const citations = getCitations();
  const index = citations.findIndex((c) => c.id === id);
  if (index !== -1) {
    citations[index] = { ...citations[index], ...updates };
    saveCitations(citations);
  }
}

export function deleteCitation(id: string): void {
  const citations = getCitations().filter((c) => c.id !== id);
  saveCitations(citations);
}

export function generateCiteKey(author: string, year: string): string {
  const lastName = author.split(",")[0].split(" ").pop()?.toLowerCase() || "unknown";
  return `${lastName}${year}`;
}

// Format author names for IEEE style: "J. Smith" or "J. Smith and M. Jones"
function formatAuthorsIEEE(authorString: string): string {
  // Handle "and" separated authors or comma separated
  const authors = authorString.split(/\s+and\s+|\s*,\s*(?=[A-Z])/i);

  return authors.map((author) => {
    const parts = author.trim().split(/\s+/);
    if (parts.length === 0) return author;

    // Handle "Last, First" format
    if (author.includes(",")) {
      const [last, first] = author.split(",").map((s) => s.trim());
      const initials = first
        .split(/\s+/)
        .map((n) => n[0]?.toUpperCase() + ".")
        .join(" ");
      return `${initials} ${last}`;
    }

    // Handle "First Last" format
    const lastName = parts[parts.length - 1];
    const initials = parts
      .slice(0, -1)
      .map((n) => n[0]?.toUpperCase() + ".")
      .join(" ");
    return initials ? `${initials} ${lastName}` : lastName;
  }).join(", ");
}

// Format citation for IEEE style (default)
export function formatCitationIEEE(citation: Citation, index: number): string {
  const authors = formatAuthorsIEEE(citation.author);
  const { title, journal, booktitle, volume, number, pages, year, publisher, url, doi, institution, school } = citation;

  let formatted = `[${index}] ${authors}, `;

  switch (citation.type) {
    case "article":
      formatted += `"${title}," `;
      if (journal) formatted += `*${journal}*, `;
      if (volume) formatted += `vol. ${volume}, `;
      if (number) formatted += `no. ${number}, `;
      if (pages) formatted += `pp. ${pages}, `;
      formatted += `${year}.`;
      break;

    case "book":
      formatted += `*${title}*. `;
      if (publisher) formatted += `${publisher}, `;
      formatted += `${year}.`;
      break;

    case "inproceedings":
    case "conference":
      formatted += `"${title}," `;
      if (booktitle) formatted += `in *${booktitle}*, `;
      formatted += `${year}`;
      if (pages) formatted += `, pp. ${pages}`;
      formatted += ".";
      break;

    case "phdthesis":
      formatted += `"${title}," Ph.D. dissertation, `;
      if (school) formatted += `${school}, `;
      formatted += `${year}.`;
      break;

    case "mastersthesis":
      formatted += `"${title}," M.S. thesis, `;
      if (school) formatted += `${school}, `;
      formatted += `${year}.`;
      break;

    case "techreport":
      formatted += `"${title}," `;
      if (institution) formatted += `${institution}, `;
      formatted += `Tech. Rep., ${year}.`;
      break;

    case "online":
    case "misc":
    default:
      formatted += `"${title}," `;
      formatted += `${year}.`;
      break;
  }

  if (doi) formatted += ` doi: ${doi}.`;
  else if (url) formatted += ` [Online]. Available: ${url}`;

  return formatted;
}

// Format citation for display (configurable style)
export function formatCitation(citation: Citation, index: number = 1, style: CitationStyle = "ieee"): string {
  if (style === "ieee") {
    return formatCitationIEEE(citation, index);
  }
  // Default to IEEE for now
  return formatCitationIEEE(citation, index);
}

// Parse \cite{key} references in markdown
export function parseCiteRefs(content: string): string[] {
  const regex = /\\cite\{([^}]+)\}/g;
  const refs: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    refs.push(...match[1].split(",").map((k) => k.trim()));
  }
  return [...new Set(refs)];
}

// Convert citations to BibTeX format
export function toBibTeX(citations: Citation[]): string {
  return citations.map((c) => {
    let bib = `@${c.type}{${c.key},\n`;
    bib += `  author = {${c.author}},\n`;
    bib += `  title = {${c.title}},\n`;
    bib += `  year = {${c.year}},\n`;
    if (c.journal) bib += `  journal = {${c.journal}},\n`;
    if (c.volume) bib += `  volume = {${c.volume}},\n`;
    if (c.number) bib += `  number = {${c.number}},\n`;
    if (c.pages) bib += `  pages = {${c.pages}},\n`;
    if (c.publisher) bib += `  publisher = {${c.publisher}},\n`;
    if (c.booktitle) bib += `  booktitle = {${c.booktitle}},\n`;
    if (c.address) bib += `  address = {${c.address}},\n`;
    if (c.edition) bib += `  edition = {${c.edition}},\n`;
    if (c.editor) bib += `  editor = {${c.editor}},\n`;
    if (c.institution) bib += `  institution = {${c.institution}},\n`;
    if (c.school) bib += `  school = {${c.school}},\n`;
    if (c.howpublished) bib += `  howpublished = {${c.howpublished}},\n`;
    if (c.month) bib += `  month = {${c.month}},\n`;
    if (c.url) bib += `  url = {${c.url}},\n`;
    if (c.doi) bib += `  doi = {${c.doi}},\n`;
    if (c.note) bib += `  note = {${c.note}},\n`;
    bib += `}`;
    return bib;
  }).join("\n\n");
}

// Parse BibTeX content into Citation objects
export function parseBibTeX(bibtex: string): Omit<Citation, "id">[] {
  const entries: Omit<Citation, "id">[] = [];

  // Match each @type{key, ... } entry
  const entryRegex = /@(\w+)\s*\{\s*([^,]+)\s*,([^@]*)\}/g;
  let match;

  while ((match = entryRegex.exec(bibtex)) !== null) {
    const type = match[1].toLowerCase() as CitationType;
    const key = match[2].trim();
    const fieldsStr = match[3];

    // Parse fields
    const fields: Record<string, string> = {};
    const fieldRegex = /(\w+)\s*=\s*(?:\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}|"([^"]*)"|(\d+))/g;
    let fieldMatch;

    while ((fieldMatch = fieldRegex.exec(fieldsStr)) !== null) {
      const fieldName = fieldMatch[1].toLowerCase();
      const fieldValue = fieldMatch[2] || fieldMatch[3] || fieldMatch[4] || "";
      fields[fieldName] = fieldValue.trim();
    }

    // Only add if we have minimum required fields
    if (fields.title && fields.author) {
      entries.push({
        key,
        type: isValidCitationType(type) ? type : "misc",
        title: fields.title,
        author: fields.author,
        year: fields.year || "n.d.",
        journal: fields.journal,
        volume: fields.volume,
        number: fields.number,
        pages: fields.pages,
        publisher: fields.publisher,
        booktitle: fields.booktitle,
        address: fields.address,
        edition: fields.edition,
        editor: fields.editor,
        institution: fields.institution,
        school: fields.school,
        howpublished: fields.howpublished,
        month: fields.month,
        url: fields.url,
        doi: fields.doi,
        note: fields.note,
      });
    }
  }

  return entries;
}

function isValidCitationType(type: string): type is CitationType {
  return [
    "article", "book", "inproceedings", "conference", "incollection",
    "phdthesis", "mastersthesis", "techreport", "manual", "misc", "online", "unpublished"
  ].includes(type);
}

// Import BibTeX and merge with existing citations (avoiding duplicates by key)
export function importBibTeX(bibtex: string): Citation[] {
  const existing = getCitations();
  const existingKeys = new Set(existing.map((c) => c.key));
  const parsed = parseBibTeX(bibtex);

  const newCitations: Citation[] = [];
  for (const entry of parsed) {
    if (!existingKeys.has(entry.key)) {
      newCitations.push({
        ...entry,
        id: crypto.randomUUID(),
      });
      existingKeys.add(entry.key);
    }
  }

  const allCitations = [...existing, ...newCitations];
  saveCitations(allCitations);
  return allCitations;
}

// Get citation style storage key
const STYLE_KEY = "zendor-citation-style";

export function getCitationStyle(): CitationStyle {
  if (typeof window === "undefined") return "ieee";
  return (localStorage.getItem(STYLE_KEY) as CitationStyle) || "ieee";
}

export function saveCitationStyle(style: CitationStyle): void {
  localStorage.setItem(STYLE_KEY, style);
}
