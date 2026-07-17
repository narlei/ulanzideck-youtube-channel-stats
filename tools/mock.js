/**
 * Shared harness for store-art pages: renders real key faces with the
 * plugin's ChannelStats renderer against a fake YouTube API.
 * Usage: renderKey(selector, settings, statsOverride?) — sets <img> src.
 */

// Fake channel avatar (gradient + letter, CORS-safe data URI)
const _av = document.createElement('canvas');
_av.width = _av.height = 240;
(() => {
  const c = _av.getContext('2d');
  const g = c.createLinearGradient(0, 0, 240, 240);
  g.addColorStop(0, '#7048e8');
  g.addColorStop(1, '#e8590c');
  c.fillStyle = g;
  c.fillRect(0, 0, 240, 240);
  c.fillStyle = 'rgba(255,255,255,.92)';
  c.font = '900 120px Helvetica, system-ui';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('N', 120, 132);
})();
const AVATAR_URI = _av.toDataURL();

let FAKE_STATS = { subscriberCount: '1284000', viewCount: '342000000', videoCount: '1284' };

window.fetch = async () => {
  const stats = FAKE_STATS; // capture at call time (restored right after updateSettings)
  return {
    ok: true,
    json: async () => ({
      items: [{
        snippet: { title: 'My Channel', thumbnails: { medium: { url: AVATAR_URI } } },
        statistics: stats
      }]
    })
  };
};

let _ctr = 0;
function renderKey(selector, settings, statsOverride, deltaBaseline) {
  const img = document.querySelector(selector);
  const context = 'k' + (_ctr++);
  const channel = settings.channel || ('@demo' + _ctr);
  settings = Object.assign({ apiKey: 'x', channel }, settings);

  if (deltaBaseline != null) {
    try {
      const metric = settings.metric || 'subscribers';
      localStorage.setItem(
        'ytstats_base_' + channel + '_' + metric,
        JSON.stringify({ date: new Date().toDateString(), value: deltaBaseline })
      );
    } catch (e) {}
  }

  const savedStats = statsOverride;
  const ud = {
    language: 'en',
    setBaseDataIcon(ctx, data) { img.src = data; },
    sendParamFromPlugin() {}
  };

  const prevStats = FAKE_STATS;
  if (savedStats) FAKE_STATS = Object.assign({}, FAKE_STATS, savedStats);
  const inst = ChannelStats(context, ud);
  inst.updateSettings(settings);
  if (savedStats) FAKE_STATS = prevStats;
}
