let currentMode = "config";
let currentVideoTime = 0;

const configView = document.getElementById("config-view");
const previewView = document.getElementById("preview-view");
const previewPlayer = document.getElementById("preview-player");
const overlayView = document.getElementById("overlay-view");
const urlInput = document.getElementById("url-input");
const opacitySlider = document.getElementById("opacity-slider");
const opacityValue = document.getElementById("opacity-value");
const playerContainer = document.getElementById("player-container");
const contentProtectionToggle = document.getElementById("content-protection-toggle");

function extractIframeSrc(input) {
  const match = input.match(/src=["']([^"']+)["']/);
  if (match) return match[1];
  return null;
}

function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/v\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function validateInput(input) {
  if (input.includes("<iframe")) {
    return !!extractIframeSrc(input);
  }
  return !!extractVideoId(input);
}

function withEnableJsApi(src) {
  try {
    const url = new URL(src);
    url.searchParams.set("enablejsapi", "1");
    return url.toString();
  } catch {
    return src;
  }
}

function buildIframe(input) {
  input = input.trim();

  if (input.includes("<iframe")) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = input;
    const iframe = wrapper.querySelector("iframe");
    if (iframe) {
      iframe.src = withEnableJsApi(iframe.src);
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "none";
    }
    return iframe;
  }

  const videoId = extractVideoId(input);
  if (!videoId) return null;

  const iframe = document.createElement("iframe");
  iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`;
  iframe.allow =
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "none";
  return iframe;
}

// --- State transitions ---

function switchToPreview() {
  const input = urlInput.value;
  if (!validateInput(input)) {
    urlInput.style.borderColor = "rgba(255, 80, 80, 0.6)";
    setTimeout(() => {
      urlInput.style.borderColor = "";
    }, 1500);
    return;
  }

  previewPlayer.innerHTML = "";
  const iframe = buildIframe(input);
  if (iframe) {
    iframe.addEventListener("load", () => {
      iframe.contentWindow.postMessage(JSON.stringify({ event: "listening" }), "*");
    });
    previewPlayer.appendChild(iframe);
  }

  currentMode = "preview";
  configView.classList.add("hidden");
  overlayView.classList.add("hidden");
  previewView.classList.remove("hidden");

  window.electronAPI.resizeForPreview();
}

function switchToOverlay() {
  const input = urlInput.value;
  if (!validateInput(input)) return;

  const opacity = parseInt(opacitySlider.value, 10) / 100;

  currentMode = "overlay";
  configView.classList.add("hidden");
  overlayView.classList.add("hidden");
  // Keep previewView+iframe in place — moving the iframe node reloads it and kills playback
  document.getElementById("preview-bar").classList.add("hidden");
  previewView.classList.add("overlay-active");

  window.electronAPI.startOverlay(opacity);
}

function switchToConfig() {
  currentMode = "config";
  previewView.classList.add("hidden");
  previewView.classList.remove("overlay-active");
  overlayView.classList.add("hidden");
  document.getElementById("preview-bar").classList.remove("hidden");
  configView.classList.remove("hidden");

  previewPlayer.innerHTML = "";

  window.electronAPI.stopOverlay();
}

function switchToPreviewFromOverlay() {
  currentMode = "preview";
  previewView.classList.remove("overlay-active");
  document.getElementById("preview-bar").classList.remove("hidden");
}

// --- Event Listeners ---

urlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (currentMode === "config") switchToPreview();
  }
});

opacitySlider.addEventListener("input", () => {
  opacityValue.textContent = opacitySlider.value + "%";
});

contentProtectionToggle.addEventListener("change", () => {
  window.electronAPI.setContentProtection(contentProtectionToggle.checked);
});

// Mode change from main process
window.electronAPI.onModeChanged((mode) => {
  if (mode === "config" && currentMode !== "config") {
    switchToConfig();
  } else if (mode === "preview" && currentMode === "overlay") {
    switchToPreviewFromOverlay();
  }
});

// Track current video time from YouTube iframe postMessage events
window.addEventListener("message", (event) => {
  try {
    const data = JSON.parse(event.data);
    if (data.event === "infoDelivery" && data.info && data.info.currentTime != null) {
      currentVideoTime = data.info.currentTime;
    }
  } catch {}
});

// Seek command from main process (global hotkeys in overlay mode)
window.electronAPI.onSeekVideo((delta) => {
  const iframe = previewPlayer.querySelector("iframe");
  if (!iframe) return;
  const newTime = Math.max(0, currentVideoTime + delta);
  iframe.contentWindow.postMessage(
    JSON.stringify({ event: "command", func: "seekTo", args: [newTime, true] }),
    "*"
  );
});

// --- Global keyboard shortcuts ---

// Opt+Cmd+O and Opt+Esc — handled via before-input-event in main so they work even when iframe has focus
window.electronAPI.onTriggerOverlay(() => {
  if (currentMode === "preview") switchToOverlay();
});

window.electronAPI.onTriggerExit(() => {
  if (currentMode === "preview") switchToConfig();
});
