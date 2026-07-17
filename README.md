# YouTube Channel Stats - Ulanzi Deck Plugin

**Your channel's subscribers, views and videos — live on a physical key.**

Canvas-rendered key faces with your channel avatar, compact numbers and a daily growth badge. No dashboards, no app switching — just glance at your deck.

![YouTube Channel Stats on an Ulanzi Deck](resources/cover.png)

[![Ulanzi Community Store](https://raw.githubusercontent.com/narlei/ulanzicommunitystore/main/docs/badges/ulanzi-community-store-shield.svg)](https://ulanzicommunitystore.narlei.com)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20·%20Windows-lightgrey.svg)]()
[![API](https://img.shields.io/badge/YouTube%20Data%20API-v3-FF0033.svg)]()
[![Unofficial](https://img.shields.io/badge/unofficial-not%20affiliated%20with%20YouTube-lightgrey.svg)]()

> **Disclaimer:** this is an independent, open-source project built by a fan. It is **not affiliated with, endorsed by, or supported by YouTube or Google**. "YouTube" is a trademark of Google LLC.

---

## 📥 Install

<div align="center">

### Get it from the Ulanzi Community Store

[![Download on the Ulanzi Community Store](https://raw.githubusercontent.com/narlei/ulanzicommunitystore/main/docs/badges/ulanzi-community-store-shield.svg)](https://ulanzicommunitystore.narlei.com)

**[ulanzicommunitystore.narlei.com](https://ulanzicommunitystore.narlei.com)** → search for **YouTube Channel Stats** → install with one click.

</div>

> **Requirements:** [Ulanzi Studio](https://www.ulanzi.com/pages/download) (macOS or Windows) · a free [YouTube Data API v3 key](https://developers.google.com/youtube/v3/getting-started)

<details>
<summary>Manual install (without the store)</summary>

1. Download the latest `com.narlei.youtubechannelstats.ulanziPlugin.zip` from [Releases](https://github.com/narlei/ulanzideck-youtube-channel-stats/releases).
2. Extract it into the Ulanzi plugins folder:
   - **macOS:** `~/Library/Application Support/Ulanzi/UlanziDeck/Plugins/`
   - **Windows:** `%APPDATA%/Ulanzi/UlanziDeck/Plugins/`
3. Restart Ulanzi Studio.

</details>

---

## Why this exists

The official YouTube statistics plugin prints a plain number on a flat color. That's it.

This one renders the whole key on a canvas: your channel avatar in a ring, `1.2M`-style compact numbers that auto-fit, a green `▲ +400` badge showing today's growth, and three themes that actually look good on the deck.

---

## Every metric, gorgeous by default

Drag **Channel Stats** onto a key, and press it to cycle subscribers → views → videos (or set it to refresh on press).

![Key faces](resources/banner1.png)

| Key face | What you see |
|---|---|
| **Subscribers / Views / Videos** | compact (`15.4K`, `2.34M`) or full (`1,234,567`) numbers, auto-fitted |
| **Channel avatar** | fetched from the API, drawn in a ring (YouTube play badge as fallback) |
| **Daily growth** | green `▲ +N` pill since local midnight, red `▼` if it drops |
| **Themes** | Dark (red glow), Red (bold gradient), Black (OLED) |
| **Errors** | friendly cards on the key — missing key, wrong channel, quota, offline |

---

## Setup in a minute

![Setup](resources/banner2.png)

1. Create a free API key for the **YouTube Data API v3** ([guide](https://developers.google.com/youtube/v3/getting-started)).
2. Paste the key in the button settings.
3. Type your channel — `@handle`, channel ID (`UC…`) or a full channel URL all work.
4. Pick metric, theme, number format and refresh interval (1 min – 1 h).

The default 5-minute refresh uses ~288 quota units/day — about 3% of the free 10,000/day quota. Localized in **English** and **Português**.

---

## Privacy

- **No third-party server.** The plugin talks only to `googleapis.com` — never to any server run by this project.
- **No analytics, no telemetry.** Nothing is collected or transmitted anywhere.
- **Your API key stays local**, stored by Ulanzi Studio with the button settings on your machine.
- **Open source.** Every line is in this repo — audit it yourself.

---

## Development

```bash
git clone https://github.com/narlei/ulanzideck-youtube-channel-stats
cd ulanzideck-youtube-channel-stats
make install   # symlink into UlanziDeck + restart Ulanzi Studio
```

| Command | What it does |
|---|---|
| `make package` | Build distributable ZIP → `dist/` |
| `make restart` | Restart Ulanzi Studio only |
| `make bump_patch` | Bump version (patch / minor / major) |

`preview-dev.html` renders every key-face state in a browser with fake data — iterate on the design without a deck. Store art in `resources/` is generated from `tools/*.html`, where the key mockups come from the plugin's **real renderer** (see the Chrome headless commands in [tools/](tools/)).

**Layout**

```
com.narlei.youtubechannelstats.ulanziPlugin/   # the plugin bundle
├── plugin/               # app.html, app.js, actions/channelStats.js (fetch + canvas renderer)
├── property-inspector/   # settings UI
├── libs/                 # Ulanzi SDK (ulanziApi.js, utils, css)
├── assets/               # icons
└── en.json / pt_PT.json
tools/                    # store-art generators (cover, banner1, banner2 + mock.js)
resources/                # cover.png, banner1.png, banner2.png
```

Releases are automated: push a `v*` tag and the GitHub Action builds the zip and publishes it.

---

MIT © [Narlei Moreira](https://github.com/narlei)
