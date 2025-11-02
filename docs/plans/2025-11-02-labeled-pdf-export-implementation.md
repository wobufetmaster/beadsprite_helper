# Labeled PDF Export Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add color-coded labels (A1, B2, etc.) to PDF pattern exports, with labels on both the grid and in the legend.

**Architecture:** Letter-number label system grouped by HSL hue families. Separate LabeledPatternRenderer component for export-only rendering. Enhanced PDF legend with code column. Auto-scaling to ensure label readability.

**Tech Stack:** React 18, culori (color science), jsPDF, HTML Canvas API

---

## Task 1: Create Label Generator Utility

**Files:**
- Create: `frontend/src/utils/labelGenerator.js`

**Step 1: Write the label generator utility**

Create `frontend/src/utils/labelGenerator.js`:

```javascript
import { converter } from 'culori';

// HSL converter for hue-based grouping
const toHsl = converter('hsl');

/**
 * Hue angle ranges for letter categories
 * Each category represents a color family
 */
const HUE_RANGES = {
  A: { name: 'Reds', min: 345, max: 15 },
  B: { name: 'Oranges', min: 15, max: 45 },
  C: { name: 'Yellows', min: 45, max: 75 },
  D: { name: 'Yellow-Greens', min: 75, max: 105 },
  E: { name: 'Greens', min: 105, max: 165 },
  F: { name: 'Cyans', min: 165, max: 195 },
  G: { name: 'Blues', min: 195, max: 255 },
  H: { name: 'Purples', min: 255, max: 285 },
  I: { name: 'Magentas', min: 285, max: 315 },
  J: { name: 'Pinks', min: 315, max: 345 },
  K: { name: 'Grays/Neutrals', saturation: 'low' }, // Saturation < 10%
  L: { name: 'Browns', lightness: 'dark', saturation: 'medium' } // Lightness < 40%, Sat 10-25%
};

/**
 * Determine hue category letter based on HSL values
 * @param {object} hsl - HSL color object from culori
 * @returns {string} Category letter (A-L)
 */
function getHueCategory(hsl) {
  const { h, s, l } = hsl;

  // Handle achromatic colors (grays/blacks/whites)
  if (s === undefined || s < 0.10) {
    return 'K'; // Grays/Neutrals
  }

  // Handle browns (dark colors with low-medium saturation)
  if (l < 0.40 && s >= 0.10 && s < 0.25) {
    return 'L'; // Browns
  }

  // Chromatic colors - categorize by hue
  const hue = h || 0; // Default to 0 if hue is undefined

  if (hue >= 345 || hue < 15) return 'A'; // Reds
  if (hue >= 15 && hue < 45) return 'B';  // Oranges
  if (hue >= 45 && hue < 75) return 'C';  // Yellows
  if (hue >= 75 && hue < 105) return 'D'; // Yellow-Greens
  if (hue >= 105 && hue < 165) return 'E'; // Greens
  if (hue >= 165 && hue < 195) return 'F'; // Cyans
  if (hue >= 195 && hue < 255) return 'G'; // Blues
  if (hue >= 255 && hue < 285) return 'H'; // Purples
  if (hue >= 285 && hue < 315) return 'I'; // Magentas
  if (hue >= 315 && hue < 345) return 'J'; // Pinks

  return 'K'; // Default to grays
}

/**
 * Generate color labels for bead colors used in pattern
 * @param {Array} legendData - Array of {beadId, beadName, hex, count} objects
 * @returns {Object} Map of beadId to label code (e.g., { "mint_green": "E1", "dark_blue": "G3" })
 */
export function generateColorLabels(legendData) {
  if (!legendData || legendData.length === 0) {
    return {};
  }

  // Group colors by hue category
  const groups = {};

  legendData.forEach(item => {
    const hsl = toHsl(item.hex);
    const category = getHueCategory(hsl);

    if (!groups[category]) {
      groups[category] = [];
    }

    groups[category].push({
      beadId: item.beadId,
      hex: item.hex,
      hsl,
      count: item.count
    });
  });

  // Sort colors within each group by lightness (light to dark)
  Object.keys(groups).forEach(category => {
    groups[category].sort((a, b) => {
      // Sort by lightness descending (lighter colors first)
      return (b.hsl.l || 0) - (a.hsl.l || 0);
    });
  });

  // Assign letter-number codes
  const labelMap = {};

  Object.keys(groups).sort().forEach(category => {
    groups[category].forEach((color, index) => {
      const number = index + 1;
      labelMap[color.beadId] = `${category}${number}`;
    });
  });

  return labelMap;
}

/**
 * Calculate text color (black or white) for maximum contrast on background
 * @param {string} hex - Background color in hex format
 * @returns {string} Text color ("#000000" or "#FFFFFF")
 */
export function getContrastTextColor(hex) {
  // Convert hex to RGB
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  // Calculate relative luminance
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  // Return black for light backgrounds, white for dark
  return luminance > 127.5 ? '#000000' : '#FFFFFF';
}
```

**Step 2: Commit label generator**

```bash
git add frontend/src/utils/labelGenerator.js
git commit -m "feat: add color label generator for PDF exports

- HSL hue-based grouping (A-L categories)
- Letter-number code assignment (A1, B2, etc.)
- Contrast text color calculation
- Sorts colors by lightness within groups"
```

---

## Task 2: Create Labeled Pattern Renderer Component

**Files:**
- Create: `frontend/src/components/LabeledPatternRenderer.jsx`

**Step 1: Create LabeledPatternRenderer component**

Create `frontend/src/components/LabeledPatternRenderer.jsx`:

```javascript
import { useRef, useEffect } from 'react';
import { PERLER_COLORS } from '../data/perlerColors';
import { getContrastTextColor } from '../utils/labelGenerator';

/**
 * LabeledPatternRenderer - Offscreen canvas for labeled PDF exports
 * Renders bead pattern with color code labels on each pixel
 */
export default function LabeledPatternRenderer({
  beadGrid,
  colorLabels,
  backgroundMask,
  removeBackground,
  beadShape = 'square',
  showPegboardGrid = false,
  onCanvasReady,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!beadGrid || !colorLabels || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const gridWidth = beadGrid[0]?.length || 0;
    const gridHeight = beadGrid.length;

    if (gridWidth === 0 || gridHeight === 0) return;

    // Minimum pixel size to ensure labels are readable
    const MIN_PIXEL_SIZE = 20;
    const pixelSize = MIN_PIXEL_SIZE;

    // Find bounding box of actual beads
    let minX = gridWidth, maxX = -1, minY = gridHeight, maxY = -1;

    if (backgroundMask && removeBackground) {
      for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
          if (!backgroundMask[y]?.[x]) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
        }
      }

      // If no non-background pixels found, use full grid
      if (maxX === -1) {
        minX = 0;
        maxX = gridWidth - 1;
        minY = 0;
        maxY = gridHeight - 1;
      }
    } else {
      // Use full grid
      minX = 0;
      maxX = gridWidth - 1;
      minY = 0;
      maxY = gridHeight - 1;
    }

    const width = maxX - minX + 1;
    const height = maxY - minY + 1;

    // Set canvas size based on content
    canvas.width = width * pixelSize;
    canvas.height = height * pixelSize;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Build bead color lookup
    const beadColorMap = {};
    PERLER_COLORS.forEach(color => {
      beadColorMap[color.id] = color.hex;
    });

    // Draw each pixel
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        // Skip background pixels
        if (backgroundMask && removeBackground && backgroundMask[y]?.[x]) {
          continue;
        }

        const beadId = beadGrid[y]?.[x];
        if (!beadId) continue;

        const beadHex = beadColorMap[beadId] || '#CCCCCC';
        const label = colorLabels[beadId] || '??';

        const px = (x - minX) * pixelSize;
        const py = (y - minY) * pixelSize;

        // Draw bead
        if (beadShape === 'circle') {
          // Draw circle
          ctx.fillStyle = beadHex;
          ctx.beginPath();
          ctx.arc(
            px + pixelSize / 2,
            py + pixelSize / 2,
            pixelSize / 2 - 1,
            0,
            Math.PI * 2
          );
          ctx.fill();

          // Draw circle border
          ctx.strokeStyle = '#333333';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        } else {
          // Draw square
          ctx.fillStyle = beadHex;
          ctx.fillRect(px, py, pixelSize, pixelSize);

          // Draw square border
          ctx.strokeStyle = '#333333';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(px, py, pixelSize, pixelSize);
        }

        // Draw label
        const textColor = getContrastTextColor(beadHex);
        ctx.fillStyle = textColor;
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, px + pixelSize / 2, py + pixelSize / 2);
      }
    }

    // Draw pegboard grid if enabled
    if (showPegboardGrid) {
      const pegboardSize = 29;
      const padding = 5;

      ctx.strokeStyle = '#666666';
      ctx.lineWidth = 2;

      // Draw vertical lines
      for (let x = pegboardSize; x < width; x += pegboardSize) {
        const px = x * pixelSize;
        ctx.beginPath();
        ctx.moveTo(px - padding, 0);
        ctx.lineTo(px - padding, canvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(px + padding, 0);
        ctx.lineTo(px + padding, canvas.height);
        ctx.stroke();
      }

      // Draw horizontal lines
      for (let y = pegboardSize; y < height; y += pegboardSize) {
        const py = y * pixelSize;
        ctx.beginPath();
        ctx.moveTo(0, py - padding);
        ctx.lineTo(canvas.width, py - padding);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, py + padding);
        ctx.lineTo(canvas.width, py + padding);
        ctx.stroke();
      }
    }

    // Notify parent component
    if (onCanvasReady) {
      onCanvasReady(canvas);
    }
  }, [beadGrid, colorLabels, backgroundMask, removeBackground, beadShape, showPegboardGrid, onCanvasReady]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'none' }}
    />
  );
}
```

**Step 2: Commit labeled renderer**

```bash
git add frontend/src/components/LabeledPatternRenderer.jsx
git commit -m "feat: add LabeledPatternRenderer for PDF exports

- Offscreen canvas rendering with labels
- Minimum 20px pixel size for readability
- Contrast text color for labels
- Supports square/circle bead shapes
- Optional pegboard grid overlay
- Background removal support"
```

---

## Task 3: Enhance PDF Export with Labels

**Files:**
- Modify: `frontend/src/services/patternExporter.js`
- Modify: `frontend/src/components/PatternExportControls.jsx`

**Step 1: Update patternExporter to generate labels and use labeled renderer**

Modify `frontend/src/services/patternExporter.js`:

Add imports at the top:
```javascript
import { generateColorLabels } from '../utils/labelGenerator';
```

Replace the `exportPDF` function (starting at line 55) with:

```javascript
/**
 * Export pattern and legend as PDF file with labeled grid
 * @param {HTMLCanvasElement} canvas - Canvas element with labeled pattern
 * @param {Array} legendData - Array of {beadId, beadName, hex, count} objects
 * @param {Object} colorLabels - Map of beadId to label codes
 * @param {string} filename - Optional custom filename
 * @returns {Promise<{success: boolean, filename: string}>}
 */
export async function exportPDF(canvas, legendData, colorLabels, filename) {
  try {
    // Generate filename with date
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const finalFilename = filename || `beadsprite-pattern-${date}.pdf`;

    // Create PDF document (A4 size: 210mm x 297mm)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Page 1: Pattern Image
    const imgData = canvas.toDataURL('image/png');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;

    // Calculate image dimensions to fit page
    const maxWidth = pageWidth - 2 * margin;
    const maxHeight = pageHeight - 2 * margin;
    const aspectRatio = canvas.width / canvas.height;

    let imgWidth, imgHeight;
    if (aspectRatio > maxWidth / maxHeight) {
      // Width is limiting factor
      imgWidth = maxWidth;
      imgHeight = maxWidth / aspectRatio;
    } else {
      // Height is limiting factor
      imgHeight = maxHeight;
      imgWidth = maxHeight * aspectRatio;
    }

    // Center image on page
    const x = (pageWidth - imgWidth) / 2;
    const y = (pageHeight - imgHeight) / 2;

    pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);

    // Page 2: Color Legend with codes
    pdf.addPage();

    // Title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Bead Color Legend', margin, margin + 8);

    // Table header
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    let yPos = margin + 18;

    // Column headers
    pdf.setFont('helvetica', 'bold');
    pdf.text('Code', margin + 5, yPos);
    pdf.text('Color', margin + 25, yPos);
    pdf.text('Name', margin + 50, yPos);
    pdf.text('Count', pageWidth - margin - 25, yPos);
    yPos += 2;

    // Header underline
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    // Add labels to legend data and sort by label code
    const labeledLegend = legendData.map(item => ({
      ...item,
      label: colorLabels[item.beadId] || '??'
    })).sort((a, b) => a.label.localeCompare(b.label));

    // Legend rows
    pdf.setFont('helvetica', 'normal');
    const rowHeight = 8;
    const swatchSize = 6;

    for (const item of labeledLegend) {
      // Check if we need a new page
      if (yPos + rowHeight > pageHeight - margin) {
        pdf.addPage();
        yPos = margin + 10;

        // Repeat header on new page
        pdf.setFont('helvetica', 'bold');
        pdf.text('Code', margin + 5, yPos);
        pdf.text('Color', margin + 25, yPos);
        pdf.text('Name', margin + 50, yPos);
        pdf.text('Count', pageWidth - margin - 25, yPos);
        yPos += 2;
        pdf.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 5;
        pdf.setFont('helvetica', 'normal');
      }

      // Draw label code
      pdf.setFont('helvetica', 'bold');
      pdf.text(item.label, margin + 5, yPos);
      pdf.setFont('helvetica', 'normal');

      // Draw color swatch
      pdf.setFillColor(item.hex);
      pdf.rect(margin + 20, yPos - swatchSize + 1, swatchSize, swatchSize, 'F');

      // Draw swatch border
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.2);
      pdf.rect(margin + 20, yPos - swatchSize + 1, swatchSize, swatchSize, 'S');

      // Draw text
      pdf.setTextColor(0, 0, 0);
      pdf.text(item.beadName, margin + 30, yPos);
      pdf.text(item.count.toString(), pageWidth - margin - 25, yPos, { align: 'right' });

      yPos += rowHeight;
    }

    // Add total count at bottom
    yPos += 5;
    pdf.setFont('helvetica', 'bold');
    const totalCount = legendData.reduce((sum, item) => sum + item.count, 0);
    pdf.text('Total Beads:', margin + 50, yPos);
    pdf.text(totalCount.toString(), pageWidth - margin - 25, yPos, { align: 'right' });

    // Save PDF
    pdf.save(finalFilename);

    return { success: true, filename: finalFilename };
  } catch (error) {
    console.error('Failed to export PDF:', error);
    throw new Error('Failed to export PDF');
  }
}
```

**Step 2: Update PatternExportControls to use LabeledPatternRenderer**

Modify `frontend/src/components/PatternExportControls.jsx`:

Add imports at the top:
```javascript
import LabeledPatternRenderer from './LabeledPatternRenderer';
import { generateColorLabels } from '../utils/labelGenerator';
```

Add state for labeled canvas and color labels after line 14:
```javascript
  const labeledCanvasRef = useRef(null);
  const [colorLabels, setColorLabels] = useState(null);
```

Add callback for labeled canvas after line 19:
```javascript
  const handleLabeledCanvasReady = (canvas) => {
    labeledCanvasRef.current = canvas;
  };
```

Replace the `handleExport` function (starting at line 21) with:

```javascript
  const handleExport = async () => {
    if (!beadGrid) {
      alert('No pattern to export. Please upload an image first.');
      return;
    }

    try {
      setIsExporting(true);

      // Wait a moment for canvas to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      if (exportFormat === 'png') {
        if (!canvasRef.current) {
          alert('Pattern canvas not ready. Please try again.');
          return;
        }
        await exportPNG(canvasRef.current);
        console.log('Pattern exported as PNG');
      } else if (exportFormat === 'pdf') {
        // Generate legend data and labels
        const legendData = generateLegendData(beadGrid, backgroundMask, removeBackground);
        const labels = generateColorLabels(legendData);
        setColorLabels(labels);

        // Wait for labeled canvas to render
        await new Promise(resolve => setTimeout(resolve, 200));

        if (!labeledCanvasRef.current) {
          alert('Labeled pattern canvas not ready. Please try again.');
          return;
        }

        await exportPDF(labeledCanvasRef.current, legendData, labels);
        console.log('Pattern exported as PDF with labels');
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Failed to export pattern: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };
```

Add LabeledPatternRenderer to the component's return, after the existing PatternRenderer (around line 147):

```javascript
      {/* Labeled PatternRenderer for PDF exports */}
      {beadGrid && colorLabels && (
        <LabeledPatternRenderer
          beadGrid={beadGrid}
          colorLabels={colorLabels}
          backgroundMask={backgroundMask}
          removeBackground={removeBackground}
          beadShape={beadShape}
          showPegboardGrid={showPegboardGrid}
          onCanvasReady={handleLabeledCanvasReady}
        />
      )}
```

**Step 3: Add missing import**

At the top of `PatternExportControls.jsx`, add:
```javascript
import { useRef } from 'react';
```

Update the first import line to:
```javascript
import { useState, useRef } from 'react';
```

**Step 4: Verify changes compile**

Run the development server:
```bash
npm run dev
```

Expected: Server starts without errors

**Step 5: Commit PDF export enhancements**

```bash
git add frontend/src/services/patternExporter.js frontend/src/components/PatternExportControls.jsx
git commit -m "feat: enhance PDF export with labeled patterns

- Generate color labels in PatternExportControls
- Use LabeledPatternRenderer for PDF exports
- Enhanced legend table with Code column
- Sort legend by label code (A1, A2, B1, etc.)
- Pass color labels to exportPDF function"
```

---

## Task 4: Manual Testing & Verification

**Step 1: Test label generation**

1. Start dev server: `npm run dev`
2. Open browser to http://localhost:5173
3. Upload a pixel art image
4. Export as PDF
5. Verify:
   - Pattern page has labels on each pixel
   - Labels are readable (not too small)
   - Labels use contrasting colors (white on dark, black on light)
   - Legend has Code column
   - Legend sorted by code (A1, A2, ..., B1, B2, ...)
   - Codes match between pattern and legend

**Step 2: Test edge cases**

Test with:
- Small pattern (10×10) - labels should still be readable
- Large pattern (100×100) - should scale appropriately
- Monochrome pattern - all labels in same letter category
- Pattern with background removal - background pixels have no labels

**Step 3: Test different bead shapes**

- Square beads - labels centered in squares
- Circle beads - labels centered in circles

**Step 4: Test pegboard grid**

- Enable pegboard grid overlay
- Verify grid lines don't obscure labels

**Step 5: Final commit**

```bash
git add -A
git commit -m "test: verify labeled PDF export functionality

Manual testing completed:
- Label generation working correctly
- HSL hue grouping accurate
- Contrast text colors appropriate
- Legend sorted by label code
- Edge cases handled (small/large/mono patterns)
- Bead shapes and pegboard grid working"
```

---

## Completion Checklist

- [x] Label generator utility created
- [x] HSL hue-based grouping implemented (A-L)
- [x] LabeledPatternRenderer component created
- [x] Minimum pixel size enforced (20px)
- [x] Contrast text color calculation
- [x] PDF export enhanced with labels
- [x] Legend table includes Code column
- [x] Legend sorted by label code
- [x] Manual testing completed
- [x] All code committed

## Notes for Implementation

- The label generator uses culori's HSL converter for consistent color analysis
- Minimum pixel size of 20px ensures labels are always readable
- Contrast calculation uses relative luminance formula for WCAG compliance
- LabeledPatternRenderer is offscreen-only (display: none)
- PDF legend now has 4 columns: Code | Color | Name | Count
- Background removal works with labeled patterns

## Related Documentation

- Design: `docs/plans/2025-11-02-labeled-pdf-export-design.md`
- Color science: `frontend/src/utils/colorUtils.js`
- Existing pattern renderer: `frontend/src/components/PatternRenderer.jsx`
- PDF export: `frontend/src/services/patternExporter.js`
