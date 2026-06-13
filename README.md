# ovl

A transparent YouTube overlay for macOS. Float a YouTube video over any app — including full-screen windows — with adjustable opacity and keyboard-only controls.

## What it does

Paste a YouTube URL or embed code, set the opacity, and enter overlay mode. The video becomes a click-through, always-on-top layer that stays visible while you use other apps. Exit any time with a global hotkey.

## Requirements

- macOS
- Node.js

## Install

```sh
npm install
```

## Run

```sh
npm start
```

## Usage

1. Paste a YouTube URL or `<iframe>` embed code into the input field
2. Press **Enter** to preview the video
3. Press **⌥⌘O** to enter overlay mode
4. Press **⌥⌘O** again to return to preview, or **⌥Esc** to return to config

### Keyboard shortcuts

`⌥⌘O` toggles between preview and overlay. `⌥Esc` always exits back to config.

| Shortcut | Mode | Action |
|---|---|---|
| `Enter` | Config | Preview video |
| `⌥⌘O` | Preview | Enter overlay mode |
| `⌥⌘O` | Overlay | Return to preview |
| `⌥Esc` | Preview | Exit to config |
| `⌥Esc` | Overlay | Exit to config (global) |
| `⌥←` / `⌥→` | Overlay | Seek ±5 seconds |

### Supported input formats

- YouTube watch URL: `https://youtube.com/watch?v=...`
- Short URL: `https://youtu.be/...`
- Shorts URL: `https://youtube.com/shorts/...`
- Embed URL: `https://youtube.com/embed/...`
- Full `<iframe>` embed code

## How it works

ovl is an [Electron](https://electronjs.org) app. In overlay mode it sets the window to always-on-top, transparent, visible on all workspaces (including full-screen apps), and passes mouse events through to whatever is underneath. The YouTube player runs in an iframe via the YouTube IFrame API, which enables seek commands from the global hotkeys.
