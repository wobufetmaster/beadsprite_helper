# Beadsprite Helper

A browser-based tool for designing beadsprites from pixel art images. Upload an image, automatically map colors to Perler beads, and get a shopping list with bead counts.

🔗 **[Live Demo](https://your-demo-url.com)** (if deployed)

## Features

- 🖼️ **Image Upload** - Drag & drop or paste pixel art images (PNG, JPG, GIF)
- 🎨 **Smart Color Mapping** - Automatic color matching to 107 Perler bead colors using LAB color space
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
2. **Process** - Image is processed entirely in the browser using Canvas API to extract RGB pixels
3. **Color Match** - Each pixel color is mapped to the closest Perler bead using LAB color space and Delta E (CIE2000) distance metric
4. **Display** - Interactive grid shows the mapped colors with options to manually override any pixel
5. **Export** - Generate shopping lists and printable patterns with color legends

All processing happens client-side - your images never leave your device!

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Perler bead color data based on official Perler color charts
- Color matching uses the [culori](https://github.com/Evercoder/culori) library for perceptually accurate color science
