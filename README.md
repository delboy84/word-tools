# 🛠️ Word Tools

Free, offline-capable web utilities — no ads, no tracking, no account required.

## 🧩 Word Puzzle Solvers

| Tool | Description |
|------|-------------|
| 🔤 **[Crossword Solver](crossword.html)** | Find words matching a pattern. Use `?` for unknown letters. |
| 🔄 **[Anagram Solver](anagram.html)** | Unscramble letters to find all valid words with Scrabble scores. |
| 🟩 **[Wordle Solver](wordle.html)** | Get optimal guesses for your daily Wordle. Supports hard mode. |
| 🀄 **[Scrabble Finder](scrabble.html)** | Find highest-scoring words from your rack and board letters. |

## 🎨 Utilities

| Tool | Description |
|------|-------------|
| 🎨 **[Colour Picker](colour-picker.html)** | Generate harmonious colour palettes with WCAG contrast checking. |

## ✨ Features

- **Works offline** — Service Worker caches everything after first visit
- **No ads, no tracking** — Your data stays in your browser
- **Mobile friendly** — Responsive design works on any screen size
- **Dark mode** — Auto-detects your system preference
- **Copy to clipboard** — One-click copy for any result
- **80,000+ word dictionary** — Comprehensive English word list

## 🚀 Deployment

This is a static site designed for GitHub Pages. All files are self-contained HTML with CDN dependencies (Tailwind CSS, Alpine.js).

### Quick Start (Local)

1. Clone this repo
2. Open `index.html` in a browser
3. That's it!

### GitHub Pages Deployment

1. Push to a GitHub repository
2. Go to Settings → Pages → Source: Deploy from branch → `main` / `root`
3. Your site will be live at `https://<username>.github.io/word-tools/`

## 🛠️ Tech Stack

- **Tailwind CSS** — Styling via CDN
- **Alpine.js** — Lightweight reactivity
- **Service Worker** — Offline capability
- **No build step** — Open any HTML file directly

## 📁 Project Structure

```
├── index.html              # Landing page
├── crossword.html          # Crossword Solver
├── anagram.html            # Anagram Solver
├── wordle.html             # Wordle Solver
├── scrabble.html           # Scrabble Word Finder
├── colour-picker.html      # Colour Picker
├── js/
│   ├── wordlist.js         # 80K word dictionary
│   ├── word-engine.js      # Word puzzle engine
│   └── colour-engine.js    # Colour math library
├── css/
│   └── shared.css          # Shared styles
├── sw.js                   # Service Worker
├── manifest.json           # PWA manifest
├── sitemap.xml             # SEO sitemap
└── robots.txt              # Search engine config
```

## 📄 License

MIT License — use freely, modify, distribute.

The word list was programmatically generated and is not sourced from any copyrighted dictionary. If you plan to use this for competitive Scrabble, you should replace the word list with a properly licensed dictionary (CSW21, TWL06, etc.).

---

Built with ❤️ by the Word Tools team