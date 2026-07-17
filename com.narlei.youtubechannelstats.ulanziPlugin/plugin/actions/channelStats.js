/**
 * ChannelStats — one instance per key.
 * Fetches YouTube Data API v3 channel stats and renders a rich key face
 * (avatar, compact number, label, daily growth pill) on a 288x288 canvas.
 */

const YT_METRICS = ['subscribers', 'views', 'videos'];

const YT_LABELS = {
  en: { subscribers: 'SUBSCRIBERS', views: 'VIEWS', videos: 'VIDEOS' },
  pt: { subscribers: 'INSCRITOS', views: 'VIEWS', videos: 'VÍDEOS' },
  es: { subscribers: 'SUSCRIPTORES', views: 'VISTAS', videos: 'VÍDEOS' },
  de: { subscribers: 'ABONNENTEN', views: 'AUFRUFE', videos: 'VIDEOS' }
};

const YT_THEMES = {
  dark: {
    bgTop: '#232327', bgBottom: '#0e0e11',
    glow: 'rgba(255,0,51,0.16)',
    number: '#ffffff', label: '#9b9ba6',
    ring: 'rgba(255,255,255,0.14)'
  },
  red: {
    bgTop: '#e5173f', bgBottom: '#7a0c26',
    glow: 'rgba(255,255,255,0.10)',
    number: '#ffffff', label: 'rgba(255,255,255,0.8)',
    ring: 'rgba(255,255,255,0.35)'
  },
  black: {
    bgTop: '#000000', bgBottom: '#000000',
    glow: 'rgba(255,0,51,0.10)',
    number: '#ffffff', label: '#8a8a93',
    ring: 'rgba(255,255,255,0.18)'
  }
};

function ChannelStats(context, $UD) {
  const SIZE = 288;

  let settings = {};
  let pollTimer = 0;
  let allowSend = true;
  let destroyed = false;

  let lastStats = null;      // { subscribers, views, videos }
  let channelTitle = '';
  let avatarCanvas = null;   // sanitized (CORS-safe) avatar, ready to draw
  let avatarUrlLoaded = '';  // url of the avatar currently in avatarCanvas
  let avatarBroken = false;

  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');

  const FONT = "'Source Han Sans SC', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  // ---------- settings / lifecycle ----------

  function updateSettings(newSettings) {
    settings = newSettings || {};
    refresh();
  }

  function refresh() {
    fetchStats();
    startPolling();
  }

  function startPolling() {
    stopPolling();
    const seconds = Number(settings.refresh) || 300;
    pollTimer = setInterval(fetchStats, Math.max(60, seconds) * 1000);
  }

  function stopPolling() {
    if (pollTimer !== 0) {
      clearInterval(pollTimer);
      pollTimer = 0;
    }
  }

  function setActive(active) {
    allowSend = String(active) === 'true' || active === true;
    if (allowSend) render();
  }

  function onKeyPress() {
    if (String(settings.cycleOnPress) === 'false') {
      fetchStats();
      return;
    }
    // Cycle metric: subscribers -> views -> videos -> subscribers
    const current = YT_METRICS.includes(settings.metric) ? YT_METRICS.indexOf(settings.metric) : 0;
    settings.metric = YT_METRICS[(current + 1) % YT_METRICS.length];
    $UD.sendParamFromPlugin(settings, context);
    if (lastStats) render();
    else fetchStats();
  }

  function destroy() {
    destroyed = true;
    stopPolling();
  }

  // ---------- data ----------

  function parseChannel(raw) {
    if (!raw) return null;
    let value = String(raw).trim();
    // Accept full URLs: youtube.com/@handle, youtube.com/channel/UC...
    const urlMatch = value.match(/youtube\.com\/(channel\/|c\/)?(@?[A-Za-z0-9_.\-]+)/);
    if (urlMatch) value = urlMatch[2];
    value = value.replace(/[/?#].*$/, '');
    if (/^UC[\w-]{20,}$/.test(value)) return { param: 'id', value };
    return { param: 'forHandle', value: value.startsWith('@') ? value : '@' + value };
  }

  async function fetchStats() {
    if (destroyed) return;

    const apiKey = (settings.apiKey || '').trim();
    const channel = parseChannel(settings.channel);

    if (!apiKey) { renderError(t('Set API Key'), t('in key settings')); return; }
    if (!channel) { renderError(t('Set channel'), t('@handle or ID')); return; }

    if (!lastStats) renderLoading();

    const url = 'https://www.googleapis.com/youtube/v3/channels'
      + '?part=snippet,statistics'
      + '&' + channel.param + '=' + encodeURIComponent(channel.value)
      + '&key=' + encodeURIComponent(apiKey);

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        const apiError = data && data.error;
        const reason = apiError && apiError.errors && apiError.errors[0] && apiError.errors[0].reason;
        renderError(t('API error'), reason || (apiError && 'HTTP ' + apiError.code) || '');
        return;
      }
      if (!data.items || !data.items[0]) {
        renderError(t('Not found'), channel.value);
        return;
      }

      const item = data.items[0];
      channelTitle = (item.snippet && item.snippet.title) || '';
      lastStats = {
        subscribers: Number(item.statistics.subscriberCount || 0),
        views: Number(item.statistics.viewCount || 0),
        videos: Number(item.statistics.videoCount || 0)
      };

      loadAvatar(item);
      render();
    } catch (err) {
      console.warn('[yt-stats] fetch failed', err);
      renderError(t('No connection'), '');
    }
  }

  function loadAvatar(item) {
    if (avatarBroken || String(settings.showAvatar) === 'false') return;
    const thumbs = item.snippet && item.snippet.thumbnails;
    const url = thumbs && (thumbs.medium || thumbs.default) && (thumbs.medium || thumbs.default).url;
    if (!url || url === avatarUrlLoaded) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const off = document.createElement('canvas');
        off.width = 240;
        off.height = 240;
        off.getContext('2d').drawImage(img, 0, 0, 240, 240);
        off.toDataURL(); // throws if tainted -> fallback badge
        avatarCanvas = off;
        avatarUrlLoaded = url;
        render();
      } catch (e) {
        console.warn('[yt-stats] avatar tainted, using badge', e);
        avatarBroken = true;
      }
    };
    img.onerror = () => { avatarBroken = true; };
    img.src = url;
  }

  // Daily growth: baseline stored per channel+metric, reset at local midnight.
  function dailyDelta(metric, value) {
    try {
      const key = 'ytstats_base_' + (settings.channel || '') + '_' + metric;
      const today = new Date().toDateString();
      const stored = JSON.parse(localStorage.getItem(key) || 'null');
      if (!stored || stored.date !== today) {
        localStorage.setItem(key, JSON.stringify({ date: today, value }));
        return 0;
      }
      return value - stored.value;
    } catch (e) {
      return 0;
    }
  }

  // ---------- formatting ----------

  function formatNumber(n) {
    if (settings.format === 'full') return n.toLocaleString();
    if (n < 1000) return String(n);
    const units = [
      { v: 1e9, s: 'B' },
      { v: 1e6, s: 'M' },
      { v: 1e3, s: 'K' }
    ];
    for (const u of units) {
      if (n >= u.v) {
        const num = n / u.v;
        const str = num >= 100 ? Math.round(num).toString() : num.toFixed(num >= 10 ? 1 : 2);
        return str.replace(/\.0+$/, '').replace(/(\.\d)0$/, '$1') + u.s;
      }
    }
    return String(n);
  }

  function t(text) {
    const lang = ($UD.language || 'en').slice(0, 2);
    const dict = {
      pt: {
        'Set API Key': 'Configure a API Key', 'in key settings': 'nas configurações',
        'Set channel': 'Configure o canal', '@handle or ID': '@handle ou ID',
        'API error': 'Erro na API', 'Not found': 'Não encontrado',
        'No connection': 'Sem conexão', 'Loading': 'Carregando'
      },
      es: {
        'Set API Key': 'Configura la API Key', 'in key settings': 'en los ajustes',
        'Set channel': 'Configura el canal', '@handle or ID': '@handle o ID',
        'API error': 'Error de API', 'Not found': 'No encontrado',
        'No connection': 'Sin conexión', 'Loading': 'Cargando'
      }
    };
    return (dict[lang] && dict[lang][text]) || text;
  }

  function metricLabel(metric) {
    const lang = ($UD.language || 'en').slice(0, 2);
    const labels = YT_LABELS[lang] || YT_LABELS.en;
    return labels[metric] || labels.subscribers;
  }

  // ---------- drawing ----------

  function theme() {
    return YT_THEMES[settings.theme] || YT_THEMES.dark;
  }

  function drawBackground(th) {
    const grad = ctx.createLinearGradient(0, 0, 0, SIZE);
    grad.addColorStop(0, th.bgTop);
    grad.addColorStop(1, th.bgBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, SIZE, SIZE);

    const glow = ctx.createRadialGradient(SIZE / 2, SIZE + 40, 10, SIZE / 2, SIZE + 40, SIZE * 0.95);
    glow.addColorStop(0, th.glow);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, SIZE, SIZE);
  }

  function drawAvatar(th, cx, cy, r) {
    if (avatarCanvas && String(settings.showAvatar) !== 'false') {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatarCanvas, cx - r, cy - r, r * 2, r * 2);
      ctx.restore();

      ctx.beginPath();
      ctx.arc(cx, cy, r + 1, 0, Math.PI * 2);
      ctx.lineWidth = 5;
      ctx.strokeStyle = th.ring;
      ctx.stroke();
    } else {
      drawPlayBadge(cx, cy, r);
    }
  }

  function drawPlayBadge(cx, cy, r) {
    // YouTube-style rounded play badge as avatar fallback
    const w = r * 2.05, h = r * 1.45, rad = h * 0.32;
    const x = cx - w / 2, y = cy - h / 2;
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
    ctx.fillStyle = '#FF0033';
    ctx.fill();

    ctx.beginPath();
    const tr = h * 0.28;
    ctx.moveTo(cx - tr * 0.7, cy - tr);
    ctx.lineTo(cx + tr * 1.1, cy);
    ctx.lineTo(cx - tr * 0.7, cy + tr);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  function drawFittedText(text, x, y, maxWidth, baseSize, weight, color) {
    let size = baseSize;
    ctx.fillStyle = color;
    do {
      ctx.font = weight + ' ' + size + 'px ' + FONT;
      if (ctx.measureText(text).width <= maxWidth) break;
      size -= 2;
    } while (size > 14);
    ctx.fillText(text, x, y);
    return size;
  }

  function drawDeltaPill(delta) {
    const up = delta > 0;
    const text = (up ? '▲ ' : '▼ ') + formatNumber(Math.abs(delta));
    ctx.font = '600 20px ' + FONT;
    const tw = ctx.measureText(text).width;
    const padX = 12, h = 34;
    const w = tw + padX * 2;
    const x = SIZE - w - 14, y = 14, rad = h / 2;

    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
    ctx.fillStyle = up ? 'rgba(38,194,84,0.20)' : 'rgba(255,72,72,0.20)';
    ctx.fill();

    ctx.fillStyle = up ? '#42dd7c' : '#ff6b6b';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + padX, y + h / 2 + 1);
  }

  function render() {
    if (!lastStats) return;
    const th = theme();
    const metric = YT_METRICS.includes(settings.metric) ? settings.metric : 'subscribers';
    const value = lastStats[metric];
    const delta = dailyDelta(metric, value);

    ctx.clearRect(0, 0, SIZE, SIZE);
    drawBackground(th);
    drawAvatar(th, SIZE / 2, 88, 52);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    drawFittedText(formatNumber(value), SIZE / 2, 208, SIZE - 28, 62, '700', th.number);

    ctx.font = '600 21px ' + FONT;
    ctx.save();
    // letter-spacing via canvas API when available
    if ('letterSpacing' in ctx) ctx.letterSpacing = '3px';
    drawFittedText(metricLabel(metric), SIZE / 2, 248, SIZE - 32, 21, '600', th.label);
    ctx.restore();

    if (delta !== 0) drawDeltaPill(delta);

    sendIcon();
  }

  function renderLoading() {
    const th = theme();
    ctx.clearRect(0, 0, SIZE, SIZE);
    drawBackground(th);
    drawPlayBadge(SIZE / 2, 100, 46);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '600 26px ' + FONT;
    ctx.fillStyle = th.label;
    ctx.fillText(t('Loading') + '…', SIZE / 2, 210);
    sendIcon();
  }

  function renderError(title, detail) {
    const th = theme();
    ctx.clearRect(0, 0, SIZE, SIZE);
    drawBackground(th);

    // warning triangle
    const cx = SIZE / 2, cy = 96, s = 40;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx + s * 1.05, cy + s * 0.75);
    ctx.lineTo(cx - s * 1.05, cy + s * 0.75);
    ctx.closePath();
    ctx.lineJoin = 'round';
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#f5b829';
    ctx.fillStyle = '#f5b829';
    ctx.stroke();
    ctx.fill();
    ctx.fillStyle = '#1a1a1e';
    ctx.font = '800 44px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('!', cx, cy + s * 0.45);

    drawFittedText(title, cx, 204, SIZE - 28, 30, '700', '#ffffff');
    if (detail) drawFittedText(detail, cx, 242, SIZE - 28, 21, '400', th.label);
    sendIcon();
  }

  function sendIcon() {
    if (!allowSend || destroyed) return;
    $UD.setBaseDataIcon(context, canvas.toDataURL('image/png'));
  }

  return {
    updateSettings,
    refresh,
    onKeyPress,
    setActive,
    destroy
  };
}
