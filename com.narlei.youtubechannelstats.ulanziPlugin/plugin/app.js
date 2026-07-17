const ACTION_CACHES = {};

$UD.connect('com.narlei.ulanzideck.youtubechannelstats');

$UD.onConnected(() => {});

// A key was assigned this action (or the deck re-synced existing keys)
$UD.onAdd(jsn => {
  const context = jsn.context;
  let instance = ACTION_CACHES[context];
  if (!instance) {
    instance = ChannelStats(context, $UD);
    ACTION_CACHES[context] = instance;
  }
  instance.updateSettings(jsn.param || {});
});

// Key pressed
$UD.onRun(jsn => {
  const instance = ACTION_CACHES[jsn.context];
  if (!instance) $UD.emit('add', jsn);
  else instance.onKeyPress();
});

$UD.onSetActive(jsn => {
  const instance = ACTION_CACHES[jsn.context];
  if (instance) instance.setActive(jsn.active);
});

// Key removed
$UD.onClear(jsn => {
  if (!jsn.param) return;
  for (let i = 0; i < jsn.param.length; i++) {
    const context = jsn.param[i].context;
    if (ACTION_CACHES[context]) {
      ACTION_CACHES[context].destroy();
      delete ACTION_CACHES[context];
    }
  }
});

// Settings changed (from app restore or from the Property Inspector)
$UD.onParamFromApp(jsn => onSettings(jsn));
$UD.onParamFromPlugin(jsn => onSettings(jsn));

function onSettings(jsn) {
  const instance = ACTION_CACHES[jsn.context];
  if (instance && jsn.param) instance.updateSettings(jsn.param);
}
