Here is a plan.md you can paste straight into your system prompt or repo.

⸻

Slide Language And Editor Plan

1. Goal

Design a slide system that:
• Uses a canonical slide markdown dialect as the single source of truth.
• Supports a hybrid mode where authors can write React-style components and JavaScript syntax extension.
• Allows semantic diagram blocks such as groan-zone with configurable colors and sizes.
• Can downgrade from the hybrid format and from presentation files such as pptx and odp into the canonical slide markdown.
• Renders to a React user interface with Tailwind styling, while remaining readable as plain text.

This document describes the language, data model, transforms, and editor behaviour that a large language model should implement.

⸻

2. File types and modes

There are three related input formats: 1. Canonical slide markdown
• File extension: .slides.md.
• Contains only:
• Standard markdown.
• Slide separators (---).
• Front matter for deck and slides.
• Inline directives such as @subtitle.
• Block directives such as :::groan-zone ... :::. 2. Hybrid slide format
• File extension: .slides.mdx (markdown plus React components).
• Everything from canonical slide markdown plus:
• Embedded React components.
• JavaScript syntax extension in angle brackets. 3. Presentation imports
• pptx based on Office Open Extensible Markup Language.
• odp based on Open Document Format.
• These are never edited directly, only converted into canonical slide markdown.

The system must:
• Parse all three.
• Convert hybrid and presentation formats into canonical slide markdown.
• Render canonical slide markdown to a React user interface.

⸻

3. Canonical slide markdown language

3.1 Deck front matter

At the top of a file:

---

title: "Groan Zone Deck"
author: "Munachi"
theme: "lab-dark"

---

This is standard front matter:
• Parsed as a mapping from string to value.
• Optional keys:
• title
• author
• theme
• date
• layoutDefaults (free form mapping)

3.2 Slide separators

A slide begins after each line that contains exactly three dashes:

---

## title: "Deck title"

# First slide

Content

---

# Second slide

Rules:
• Deck front matter is before the first separator.
• Every separator starts a new slide.
• It is valid for a slide to have no body, but this should be rare.

3.3 Slide local front matter

Immediately after a separator, a slide may define local front matter:

---

title: "Groan zone"
subtitle: "Why teams get stuck"
layout: "diagram"
time: 120

---

# Groan zone

@subtitle Why teams get stuck

Rules:
• Only allowed directly after a separator.
• Parsed in the same way as deck front matter.
• Recommended keys:
• title
• subtitle
• layout
• time (expected duration in seconds)
• importance (for example key, optional)

3.4 Title and subtitle semantics

Inside a slide:
• The first level one heading (#) is the slide title.
• A subtitle may be expressed in either of two ways:

# Groan zone

@subtitle Why teams get stuck

or

# Groan zone

## Why teams get stuck

The renderer should:
• Prefer @subtitle if present.
• Fall back to the slide front matter subtitle if there is no inline subtitle.
• Fall back to a second level heading directly under the title if present.

A dumb markdown renderer will simply show the headings and the @subtitle line as text, which is acceptable.

3.5 Inline directives

Inline directives begin with @ at the start of a line.

Initial set:
• @subtitle text…
• @meta key="value" key2="value2"

Parsing rules:
• A directive name is a word after the @.
• After that, either:
• A free text payload (for subtitle).
• Key value pairs in the form key="value".

Example:

@meta time="90" importance="key" track="product"

The parser must expose inline directives as separate nodes in the syntax tree.

3.6 Block directives

Block directives represent semantic blocks such as diagrams, callouts, notes, multi column layouts, and so on.

General form:

:::block-type key="value" other="value"

# optional inner markdown

:::

Rules:
• Opening line begins with three colons, followed immediately by the block type name.
• Zero or more attributes follow in the form key="value".
• Inner content can be any valid markdown, including other block directives.
• Closing line is three colons alone.

Examples:

Callout:

:::callout type="warning"
Be careful with network partitions in swarms.
:::

Speaker note:

:::note
Ask who has ever yelled at an automated phone system.
:::

Two columns:

:::columns
@left

#### Why speech agents

- Interruptible
- Domain aware

@right

#### Why robots

- Local control
- On device

:::

Diagram block (Groan zone):

:::groan-zone
size="large"
palette="teal-warm"
groan-color="rose-500"
:::

Indentation after the opening line is ignored by the parser, so attributes can be placed on following lines for legibility.

3.7 Column markers within a columns block

Inside :::columns ... :::, column markers are inline directives at the start of a line:

@left
content…

@right
content…

Rules:
• @left begins the first column section.
• @right begins the second column section.
• Additional names such as @center or @extra can be introduced later.
• If no marker is present, the entire block is treated as a single column.

The syntax tree should give columns a list of column children.

⸻

4. Semantic components and attributes

4.1 General attribute rules

All block types share the same attribute syntax:
• Key is a lower case string with dashes allowed.
• Equal sign.
• Value is a quoted string.
• The value can be a literal, a theme token, or a tailwind class fragment.

The parser should not interpret meanings, only store keys and values as strings. The renderer and transformation passes can understand semantics.

Attributes can appear on the opening line or on subsequent lines before the first non empty content line.

Example with multiple lines:

:::groan-zone
size="large"
palette="teal-warm"
groan-color="#f97316"
class="mt-8"
:::

4.2 Colors and palettes

Diagram and callout blocks may use:
• palette for a named color scheme.
• Semantic overrides such as:
• divergent-color
• convergent-color
• groan-color
• Generic easing attributes:
• text-color
• background-color
• border-color

Values may be:
• Theme keys, for example teal-warm.
• Tailwind palette fragments, for example rose-500.
• Hexadecimal colors, for example #f97316.

The renderer should:
• First look for a semantic override.
• Fall back to the palette.
• Fall back to theme defaults.

4.3 Class escape hatch

Every block directive may take a class attribute. The value is passed directly to the underlying React component as className, expected to be Tailwind classes.

Example:

:::callout type="info" class="mt-4 border border-dashed"
Content…
:::

⸻

5. Data model

The large language model should generate code that represents slide content as an intermediate tree structure.

One possible TypeScript style description (names can vary, but structure should be similar):

type DeckMeta = Record<string, unknown>;

type SlideMeta = Record<string, unknown>;

interface Deck {
meta: DeckMeta;
slides: Slide[];
}

interface Slide {
meta: SlideMeta;
blocks: Block[];
}

type Block =
| HeadingBlock
| ParagraphBlock
| ListBlock
| CodeBlock
| InlineDirectiveBlock
| BlockDirectiveBlock
| RawHtmlBlock;

interface HeadingBlock {
kind: "heading";
level: number;
text: string;
}

interface ParagraphBlock {
kind: "paragraph";
inlines: InlineNode[];
}

interface ListBlock {
kind: "list";
ordered: boolean;
items: Block[][];
}

interface CodeBlock {
kind: "code";
language: string | null;
code: string;
}

interface InlineDirectiveBlock {
kind: "inline-directive";
name: string;
payload: string | null;
attrs: Record<string, string>;
}

interface BlockDirectiveBlock {
kind: "block-directive";
name: string; // for example "groan-zone"
attrs: Record<string, string>; // for example { size: "large" }
children: Block[] | ColumnBlock[];
}

interface ColumnBlock {
name: string; // "left", "right" and so on
children: Block[];
}

interface RawHtmlBlock {
kind: "raw-html";
html: string;
}

type InlineNode =
| TextInline
| EmphasisInline
| StrongInline
| CodeInline
| LinkInline
| RawHtmlInline;

The exact structure is flexible but must:
• Distinguish between headings, paragraphs, code blocks and so on.
• Represent inline directives.
• Represent block directives and columns.
• Preserve attributes.

⸻

6. Hybrid format and downgrade from hybrid to canonical markdown

6.1 Hybrid format features

Files with extension .slides.mdx can contain everything in canonical markdown plus:
• React components in angle brackets, for example:

<GroanZone
  size="large"
  palette="teal-warm"
/>

    •	Layout components such as:

<TwoColumn>
  <Left>…</Left>
  <Right>…</Right>
</TwoColumn>

    •	Presentational components such as Callout, DemoVideo, Flowchart.

The goal of the downgrade path is to convert these into the canonical blocks defined earlier.

6.2 Parsing hybrid format

The large language model should generate an implementation that: 1. Uses an existing parser to parse the markdown elements. 2. Uses a JavaScript syntax extension parser to identify React components. 3. Produces an extended syntax tree that includes component nodes in the correct positions.

Simplified node:

interface ComponentNode {
kind: "component";
name: string; // "GroanZone", "TwoColumn"
props: Record<string, unknown>;
children: Node[];
}

The downgrade step walks this tree.

6.3 Downgrade rules

Create a registry that maps component names to downgrade behaviours.

Example TypeScript style mapping:

type DowngradeRule =
| { kind: "unwrap" }
| { kind: "toBlockDirective"; blockName: string }
| { kind: "toColumns" }
| { kind: "toCallout" }
| { kind: "toDiagram"; diagramName: string }
| { kind: "toNote" }
| { kind: "toCodeFence"; language: string }
| { kind: "toLiteral"; text: string }
| { kind: "drop" };

const downgradeRules: Record<string, DowngradeRule> = {
TwoColumn: { kind: "toColumns" },
Left: { kind: "unwrap" },
Right: { kind: "unwrap" },
Callout: { kind: "toCallout" },
GroanZone: { kind: "toDiagram", diagramName: "groan-zone" },
Note: { kind: "toNote" },
Flowchart: { kind: "toCodeFence", language: "flow" },
DemoVideo: { kind: "toLiteral", text: "[video demo omitted in markdown export]" },
};

The downgrade walker must:
• For ToColumns:
• Create a columns block directive.
• Map children wrapped in Left, Right, and so on, into column blocks with @left, @right names.
• For ToDiagram with diagramName = "groan-zone":
• Create a groan-zone block directive.
• Map component properties to directive attributes.
• For ToCallout:
• Use type property to set type attribute on :::callout.
• For ToNote:
• Wrap children inside :::note.
• For Unwrap:
• Replace the component by its children, with children converted recursively.
• For ToCodeFence:
• Turn children text into a code block with specified language.
• For ToLiteral:
• Insert a paragraph block with the literal text.

Unknown components:
• Default rule can be one of:
• Unwrap children and drop wrapper.
• Wrap original source into a code fence with language component.
• Emit a placeholder note.

The system should support a strict mode where unknown components raise an error.

6.4 Serialising downgraded tree to canonical markdown

After downgrade, the tree contains only:
• Standard markdown blocks.
• Inline directives.
• Block directives.

Serialisation rules:
• Deck front matter written using triple dash fence.
• Slides separated by lines with ---.
• Block directives written using :::name syntax with attributes printed as key="value".

The serialiser must preserve line breaks and indentation where possible for readability but does not need to be perfectly faithful to original formatting.

⸻

7. Presentation file import to canonical markdown

7.1 Pipeline overview

For both Office Open Extensible Markup Language and Open Document Format: 1. Unzip the file. 2. Parse the slide structures (ppt/slides/slideN.xml and content.xml). 3. For each slide, extract:
• Title text.
• Body text placeholders.
• Shapes and their positions. 4. Classify slide type:
• Simple text slide (title and bullets).
• Image slide (dominant picture).
• Known diagram slide (for example Groan zone).
• Complex unrecognised slide. 5. Convert each slide to canonical markdown according to its type.

7.2 Simple text slides

Detection:
• Slide has a title placeholder and one main body text placeholder.
• Few or no other shapes.

Conversion:

---

## title: "Title from slide"

# Title from slide

- Bullet one
- Bullet two

Where bullets map from paragraph levels in the body placeholder.

7.3 Image slides

Detection:
• Slide contains one large picture shape, possibly with a caption.

Conversion:

---

title: "Title from slide"
layout: "image"

---

# Title from slide

![Caption or title](slides/slide3.png)

Where slides/slide3.png is produced by rendering that slide to an image using a rendering library.

Optional:
• Add a description block with extracted text labels.

> Diagram description: …

A later enhancement can use a language model to summarise labels into a natural language description.

7.4 Known diagram slides (for example Groan zone)

Detection:
• Based on shape geometry and layout.
• For Groan zone, look for:
• Two mirrored custom polygons forming cones.
• A central label containing text similar to “Groan zone”.
• Phase labels along top from left to right (Introduction, Divergent, Emergent, Convergent, Closure).
• A horizontal axis with label similar to “Time”.
• A vertical axis with label similar to “Diversity of ideas”.

Conversion to canonical block:

---

title: "Groan zone"
layout: "diagram"

---

# Groan zone

@subtitle From problem to solution

:::groan-zone
size="large"
palette="teal-warm"
:::

Optionally, include text describing phases:

:::callout type="info"
Phases:

- Introduction
- Divergent
- Emergent (groan zone)
- Convergent
- Closure
  :::

The first version can keep block attributes minimal. Later enhancements can populate attributes such as labels for each phase.

7.5 Complex unrecognised slides

If classification fails:
• Render slide to image as in image slides.
• Extract all text from shapes.
• Produce a slide that combines the image and the text.

Example:

---

title: "Original slide title"
layout: "image"

---

# Original slide title

![Slide 5](slides/slide5.png)

> Text on slide: label one, label two, and so on.

This ensures no content is lost even if structure is not understood.

⸻

8. Rendering canonical markdown to a web deck

The large language model should generate React code that: 1. Parses canonical markdown into the intermediate tree. 2. Maps each Slide to a component, for example <SlideView>. 3. Maps each block:
• Heading → <h1>, <h2> and so on with Tailwind classes.
• Paragraph → <p> with Tailwind classes.
• List → <ul> or <ol>.
• Code block → syntax highlighted component.
• Inline directive:
• subtitle → styled subtitle under title.
• meta → used for notes, not rendered directly.
• Block directive:
• note → only in presenter view.
• callout → styled with color based on type and palette.
• columns → flex based or grid based layout.
• groan-zone → custom diagram React component with attributes bound.
• Raw hyper text markup block → rendered using dangerouslySetInnerHTML once sanitised. 4. Passes class attributes from block directives into className props added onto root elements.

The renderer is not the main focus of this document, but the large language model should ensure the mapping is explicit in generated code.

⸻

9. Editor behaviour and snippets

The editing experience should support two main modes.

9.1 Canonical markdown mode (.slides.md)

Features:
• Snippets for:
• New slide:

---

## title: ""

#

    •	Callout block.
    •	Note block.
    •	Columns block.
    •	Groan zone block.

    •	Optional auto completion for block names and attributes.
    •	No automatic insertion of React components.

9.2 Hybrid mode (.slides.mdx)

Features:
• Everything from canonical mode.
• Additional snippets for React components such as <GroanZone> and <Callout>.
• The editor can switch to this richer snippet set when:
• File has extension .mdx.
• Or a top level front matter flag react: true is present.
• Or the parser detects at least one React component tag.

The key rule: the file remains readable as text even without these snippets. Snippets exist only to reduce typing.

⸻

10. Tasks for the implementing large language model

When you send this plan to a large language model to implement, you can ask it to proceed in stages: 1. Parser for canonical slide markdown
• Build or configure a markdown parser with support for:
• Front matter.
• Slide separators.
• Inline directives.
• Block directives with attributes and optional column markers.
• Output the intermediate data model described above. 2. Serialiser for canonical markdown
• Given the intermediate data model, produce canonical markdown text.
• Ensure idempotence where possible (parsing then serialising should not change semantics). 3. Hybrid format downgrade
• Extend the parser to support React components.
• Implement the downgrade registry and tree walk.
• Verify that hybrid examples produce the expected canonical markdown. 4. Presentation import
• For pptx:
• Use an Office Open Extensible Markup Language library to walk slides.
• Implement simple slide detection and conversion.
• Implement image slide conversion with export to image.
• Stub the hook for Groan zone detection and conversion.
• For odp:
• Perform the same for content.xml. 5. Renderer
• Implement a React renderer that consumes the intermediate data model and block directives.
• Implement the groan-zone diagram component that supports attributes for size, palette, and colors.
• Implement presenter view that hides note blocks from the main view. 6. Tests
• Round trip tests for:
• Canonical markdown parse and serialise.
• Hybrid examples down to canonical markdown.
• Synthetic Groan zone presentation slides to diagram blocks.
• Snapshot tests for rendering.

⸻

This plan gives the large language model both the language specification and the transformation pipeline it needs. The key constraints are:
• Canonical slide markdown must always remain human readable.
• Semantic components such as groan-zone are expressed as block directives with attributes, not raw layout instructions.
• Downgrade paths from both hybrid code and presentation files must always terminate in this canonical markdown format.
