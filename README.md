<div align="center">

# DubTitle

**YouTube Dual Subtitle System**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

A minimalist YouTube dual subtitle display system, inspired by Anthony Fu's design philosophy.

[Getting Started](#getting-started) · [Features](#features) · [Tech Stack](#tech-stack) · [繁體中文](README.zh-TW.md)

</div>

---

## Features

| Feature | Description |
|---------|-------------|
| 🎥 YouTube Player | Paste a link and start watching |
| 📝 Dual Subtitles | Side-by-side subtitle panel with custom styling |
| 🎨 Style Customization | Background color / subtitle color / font size (16–64px) |
| 🖥️ Split View | Presentation-style dual-pane layout |
| 🤖 AI Word Analysis | AI-powered analysis of difficult vocabulary in subtitles |
| ✨ Minimal UI | Dark theme, zero clutter |

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

## Usage

1. Paste a YouTube video URL in the input field
2. Click **Load Video**
3. Video plays on the left, subtitles appear on the right
4. Customize subtitle styles using the control panel

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| AI | Anthropic SDK / Groq SDK |
| Subtitles | youtube-caption-extractor |

## Project Structure

```
dubtitle/
├── app/
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Home (split view)
│   └── globals.css           # Global styles
├── components/
│   ├── YouTubePlayer.tsx     # YouTube player component
│   ├── SubtitlePanel.tsx     # Subtitle panel component
│   └── StyleControl.tsx      # Style control component
└── scripts/
    └── clean-restart.js      # Clean / restart utility
```

## Roadmap

- [x] **Phase 1** — MVP: split view layout, YouTube playback, subtitle styling
- [x] **Phase 2** — Real subtitle integration: multi-language, VTT parsing, time-synced display
- [x] **Phase 3** — AI vocabulary analysis: auto-detect difficult words in subtitles
- [ ] Multi-language subtitle switching
- [ ] Subtitle download
- [ ] Responsive design improvements
- [ ] Subtitle caching

## Design Philosophy

> "Don't over-engineer." — Pure frontend, minimal UI, focused on core functionality.

## License

[MIT](LICENSE)
