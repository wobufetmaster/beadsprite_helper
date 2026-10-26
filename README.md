# Beadsprite Helper

A browser-based tool for designing beadsprites from pixel art images. Upload an image, automatically map colors to Perler beads, and get a shopping list with bead counts.

🔗 **[Live Demo](https://wobufetmaster.github.io/beadsprite_helper/)**

## Features

- 🖼️ **Image Upload** - Drag & drop or paste pixel art images (PNG, JPG, GIF)
- 📐 **Grid Detection** - Finds the pixel grid in upscaled art, including fractional scales and noisy JPEGs
- 🎨 **Smart Color Mapping** - Matches to Perler, Hama or Artkal S colors using CIEDE2000, after merging JPEG-noise variants of each color
- 🛒 **Shopping List** - Get exact bead counts and color breakdowns
- 📊 **Visual Preview** - Interactive grid with zoom/pan and bead shapes
- 🎯 **Manual Override** - Click any pixel to manually change bead colors
- 📐 **Pegboard Calculator** - Calculate how many pegboards you need
- 💾 **Project Save/Load** - Export and import your projects as JSON
- 📄 **Pattern Export** - Export printable patterns as PNG or PDF with color legend
- 🔄 **Background Detection** - Automatically detect and remove backgrounds
- 📱 **Mobile Friendly** - Responsive design works great on phones and tablets
- 🚀 **100% Client-Side** - No server needed, works offline, your images never leave your device

## Getting Started

### Local Development

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5800 in your browser.

### Command line

Turn an image straight into a printable pattern (PNG + US Letter PDF):

```bash
./beadsprite sprite.jpg                      # writes sprite-pattern.png / .pdf next to it
./beadsprite sprite.jpg -p hama -o out/      # other palette, other folder
./beadsprite sprite.jpg --cell 6.4 --offset 2,5   # override detection
./beadsprite --help
```

The PDF has an overview page, a labelled chart (split per 29×29 pegboard when large) and a legend with bead counts.

### Tests

```bash
cd frontend
npm test
```

### Production Build

```bash
cd frontend
npm run build
```

Static files will be in `frontend/dist/` ready to deploy anywhere.

## Deployment

Deploy the static frontend to any hosting service:

### Vercel
```bash
cd frontend
vercel --prod
```

### Netlify
```bash
cd frontend
netlify deploy --prod --dir=dist
```

### GitHub Pages
```bash
cd frontend
npm run build
# Copy dist/ contents to gh-pages branch
```

## Technology Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Zustand** - State management with persistence
- **culori** - Color science library (LAB color space, Delta E distance)
- **jsPDF** - PDF generation for pattern export
- **Canvas API** - Client-side image processing

## How It Works

1. **Upload** - User uploads a pixel art image via drag-and-drop, file picker, or paste
2. **Detect grid** - Edge positions along each axis are scanned for the period they line up on (fractional cell sizes allowed); the largest well-aligned period is the cell size
3. **Sample** - Each cell's colour is the median of its interior, so JPEG ringing and anti-aliasing are ignored; near-identical colours are then merged
4. **Color Match** - Each colour is mapped to the closest bead using Delta E (CIEDE2000)
5. **Display** - Interactive grid shows the mapped colors with options to manually override any pixel
6. **Export** - Generate shopping lists and printable patterns with color legends

All processing happens client-side - your images never leave your device!

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Disclaimer

This project is not affiliated with, endorsed by, or sponsored by Perler®, Artkal, Hama, or any other bead manufacturers. All product names and trademarks are the property of their respective owners. This is an independent, open-source tool created for educational and personal use.

## Acknowledgments

- Perler bead color data based on official Perler color charts
- Color matching uses the [culori](https://github.com/Evercoder/culori) library for perceptually accurate color science
