# Beadsprite Helper

A browser-based PWA for designing beadsprites from pixel art images.

## Features

- Upload pixel art images (PNG, JPG, GIF)
- Automatic color mapping to Perler bead colors
- Shopping list with bead counts
- Color distribution visualization
- Works entirely in browser (no server needed)

## Local Development

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Production Build

```bash
cd frontend
npm run build
```

Static files in `frontend/dist/` ready to deploy.

## Deploy to Vercel

```bash
cd frontend
vercel --prod
```

## Deploy to Netlify

```bash
cd frontend
netlify deploy --prod --dir=dist
```

## Deploy to GitHub Pages

```bash
cd frontend
npm run build
# Copy dist/ contents to gh-pages branch
```

## Technology

- React 18 + Vite
- Tailwind CSS
- Zustand (state management)
- culori (color science)
- Canvas API (image processing)

## License

MIT
