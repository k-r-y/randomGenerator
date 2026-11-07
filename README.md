# Kuji - Free Interactive Random Generator & Decision Maker

> A modern, interactive suite of 5 custom visual random choice generators built with React 19, TypeScript, and Tailwind CSS.

[![Live Demo](https://img.shields.io/badge/Demo-Live%20on%20Vercel-black?style=for-the-badge&logo=vercel)](https://random-generator.vercel.app)

---

## Overview

**Kuji** (籤) is a high-performance web application designed to eliminate decision paralysis. From classroom student rosters and live stream giveaways to everyday dilemmas like "What should I eat for dinner?", Kuji provides fair, engaging, and celebratory visual decision tools.

## 5 Interactive Random Generator Modes

1. **Wheel of Fortune Spinner:** Classic roulette-style wheel with realistic friction deceleration, customizable color slices, clicking sound effects, and confetti celebrations.
2. **Duck Race Simulator:** Viral rubber duck water race featuring randomized velocity spikes and an exciting photo finish.
3. **Vegas Slot Machine Tumbler:** 3-reel casino-style slot tumbler with mechanical reel spinning sounds and jackpot matching.
4. **Plinko Peg Drop Board:** Arcade-style pachinko drop board with real-time peg deflections and weighted bins.
5. **Arcade Claw Machine Grabber:** Retro arcade crane simulator with motorized lateral movement and mechanical grabbing tension.

---

## Content Management System (CMS) Features

* **20+ Categorized Presets:** Ready-to-use templates for Decisions (Yes/No, Coin Flip, Who Pays, Truth or Dare), Food & Dining (Pizza, Sushi, Burgers, Cuisines, Lunch), Games & Numbers (Dice 1-6, Numbers 1-10, Magic 8-Ball), and Classroom/Teams (Student Caller, Project Roles, Standup Order).
* **My Saved Lists:** Save unlimited personalized lists into browser LocalStorage without needing an account.
* **Instant URL Sharing:** Generate deep links with choices and generator modes directly in query parameters (e.g. `?mode=duck&choices=Alice,Bob,Charlie`).
* **Import & Export:** Seamless export to JSON/CSV and bulk import from text, JSON, or CSV files.
* **Custom Weighted Probabilities:** Adjust individual choice weights (1x to 10x) for custom mathematical odds.
* **Timer Duration Stepper:** Adjust simulation durations from 3 seconds to 20 seconds.

---

## SEO & Discoverability Architecture

* **Target Keywords:** `random generator`, `random choice picker`, `spin the wheel`, `duck race generator`, `slot machine picker`, `plinko decision maker`, `claw machine game`, `random name picker`, `giveaway winner picker`, `decision maker`.
* **Structured Data (JSON-LD):** Complete Schema.org `@graph` with `WebApplication`, `FAQPage`, `HowTo`, and `BreadcrumbList` markup for Google rich snippets.
* **Crawlable Fallback Content:** Pre-rendered semantic HTML markup in `index.html` ensuring search engine crawlers index complete text, features, use cases, and FAQs immediately.
* **Social Graph Tags:** Full Open Graph (`og:*`) and Twitter Card (`summary_large_image`) metadata.
* **Search Sitemap & Robots:** XML Sitemap with image tags and standard crawler permissions (`robots.txt`).

---

## Tech Stack

| Category | Tools |
|----------|-------|
| **Frontend** | React 19, TypeScript |
| **Styling** | Tailwind CSS 4, Lucide React Icons |
| **Build Tool** | Vite 8 |
| **Effects & Sound** | Canvas Confetti, Web Audio API Sound Synthesizer |
| **Deployment** | Vercel |

---

## Getting Started

### Prerequisites

* **Node.js** >= 18
* **npm** or **yarn**

### Installation & Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/k-r-y/randomGenerator.git
   cd randomGenerator
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

### Production Build

```bash
npm run build
```

The output will be generated inside the `dist/` directory.

---

**Live Demo:** [https://kry-random-generator.vercel.app](https://kry-random-generator.vercel.app)
