# Zendor Slides Feature Plan

## Overview

A full-featured presentation editor similar to Google Slides, with support for infographics, charts, and rich media.

## Core Features

### 1. Slide Management

- [ ] Create new presentations
- [ ] Add/delete/duplicate slides
- [ ] Reorder slides (drag & drop)
- [ ] Slide thumbnails sidebar
- [ ] Slide templates (title, title + content, two columns, blank, etc.)
- [ ] Master slides / themes

### 2. Content Elements

- [ ] Text boxes with rich formatting (bold, italic, underline, font size, color)
- [ ] Shapes (rectangles, circles, arrows, lines, stars, callouts)
- [ ] Images (upload, drag & drop, paste)
- [ ] Tables
- [ ] Charts (bar, line, pie, donut) - using a charting library
- [ ] Icons library
- [ ] LaTeX/Math equations
- [ ] Code blocks with syntax highlighting
- [ ] Videos (embed YouTube, Vimeo, or upload)
- [ ] Audio

### 3. Infographics

- [ ] Pre-built infographic templates
  - Timeline
  - Process flow
  - Comparison
  - Statistics/metrics
  - Hierarchy/org chart
  - Cycle diagram
  - Venn diagram
  - Mind map
- [ ] Smart connectors between shapes
- [ ] Icon + text combinations
- [ ] Progress bars and gauges

### 4. Styling & Theming

- [ ] Color themes (light, dark, colorful presets)
- [ ] Background colors/gradients/images per slide
- [ ] Global font settings
- [ ] Element styling (fill, stroke, shadow, opacity)
- [ ] Alignment tools (align left/center/right, distribute)
- [ ] Grid and guides
- [ ] Snap to grid/objects

### 5. Animations & Transitions

- [ ] Slide transitions (fade, slide, zoom, etc.)
- [ ] Element animations (appear, fade in, fly in, etc.)
- [ ] Animation ordering and timing
- [ ] Animation preview

### 6. Collaboration Features

- [ ] Speaker notes
- [ ] Comments on slides
- [ ] Version history

### 7. Presentation Mode

- [ ] Full-screen presentation
- [ ] Presenter view (current slide + next slide + notes)
- [ ] Keyboard navigation (arrows, space, escape)
- [ ] Laser pointer / highlighting tool
- [ ] Timer

### 8. Export & Import

- [ ] Export to PDF
- [ ] Export to PNG/JPG (individual slides)
- [ ] Export to PPTX (if possible)
- [ ] Import from PPTX
- [ ] Share link (view only)

## Technical Architecture

### Data Model

```typescript
interface Presentation {
  id: string;
  title: string;
  theme: Theme;
  slides: Slide[];
  createdAt: string;
  updatedAt: string;
}

interface Slide {
  id: string;
  elements: SlideElement[];
  background: Background;
  transition?: Transition;
  notes?: string;
}

interface SlideElement {
  id: string;
  type: 'text' | 'shape' | 'image' | 'chart' | 'table' | 'video' | 'code' | 'latex';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked: boolean;
  content: ElementContent;
  style: ElementStyle;
  animations?: Animation[];
}

interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
}
```

### Components Structure

```
/app/slides/
  page.tsx                    # Slides editor page
  /components/
    SlideEditor.tsx           # Main editor canvas
    SlidesSidebar.tsx         # Thumbnail sidebar
    SlideCanvas.tsx           # Individual slide canvas
    ElementToolbar.tsx        # Tools for adding elements
    PropertiesPanel.tsx       # Element properties editor
    PresentationMode.tsx      # Full-screen presentation
    PresenterView.tsx         # Presenter view with notes
    /elements/
      TextElement.tsx
      ShapeElement.tsx
      ImageElement.tsx
      ChartElement.tsx
      TableElement.tsx
      InfographicElement.tsx
    /infographics/
      Timeline.tsx
      ProcessFlow.tsx
      Comparison.tsx
      Statistics.tsx
      OrgChart.tsx
    /dialogs/
      InsertImageDialog.tsx
      InsertChartDialog.tsx
      ThemePickerDialog.tsx
  /lib/
    slides-storage.ts         # LocalStorage persistence
    slide-templates.ts        # Slide templates
    infographic-templates.ts  # Infographic templates
    export-utils.ts           # PDF/image export
```

### Libraries to Use

- **Canvas/Rendering**: Fabric.js or Konva.js (for interactive canvas)
- **Charts**: Chart.js or Recharts
- **Icons**: Lucide React (already installed)
- **PDF Export**: jspdf + html2canvas
- **Drag & Drop**: @dnd-kit/core
- **Rich Text**: TipTap (already installed)

## Implementation Phases

### Phase 1: Basic Editor (MVP)

1. Create slides page route
2. Implement basic slide canvas with Fabric.js/Konva
3. Add text boxes
4. Add basic shapes
5. Slide sidebar with thumbnails
6. Add/delete slides
7. Save to localStorage

### Phase 2: Rich Content

1. Image upload and placement
2. Tables
3. Charts integration
4. Code blocks
5. LaTeX equations

### Phase 3: Infographics

1. Timeline template
2. Process flow template
3. Statistics/metrics display
4. Comparison layouts
5. Custom connectors

### Phase 4: Styling & Polish

1. Theme system
2. Background customization
3. Alignment tools
4. Grid and guides
5. Element animations

### Phase 5: Presentation

1. Full-screen mode
2. Presenter view
3. Keyboard navigation
4. Slide transitions

### Phase 6: Export & Share

1. PDF export
2. Image export
3. Share functionality

## UI Mockup

```
+------------------------------------------------------------------+
|  [Logo] Presentation Title          [Present] [Share] [Export]   |
+------------------------------------------------------------------+
|        |                                              |          |
| Slides |              Slide Canvas                    | Props    |
| -----  |                                              | ------   |
| [   ]  |    +--------------------------------+        | Fill     |
| [   ]  |    |                                |        | Stroke   |
| [   ]  |    |     Click to add title         |        | Font     |
| [   ]  |    |                                |        | Size     |
| [   ]  |    |     Click to add content       |        | Align    |
| [   ]  |    |                                |        |          |
| [   ]  |    +--------------------------------+        |          |
|        |                                              |          |
|  [+]   |  [Text] [Shape] [Image] [Chart] [Table]     |          |
+------------------------------------------------------------------+
|  Speaker Notes...                                                 |
+------------------------------------------------------------------+
```

## Questions to Resolve

1. Use Fabric.js or Konva.js for canvas? (Fabric.js has more features)
2. Store presentations in localStorage or add backend?
3. Real-time collaboration needed?
4. PPTX import/export priority?
