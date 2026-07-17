let ACTION_SETTING = {};
let form = null;

$UD.connect('com.narlei.ulanzideck.youtubechannelstats.channel');

$UD.onConnected(() => {
  form = document.querySelector('#property-inspector');

  document.querySelector('.uspi-wrapper').classList.remove('hidden');

  form.addEventListener(
    'input',
    Utils.debounce(() => {
      ACTION_SETTING = Utils.getFormValue(form);
      $UD.sendParamFromPlugin(ACTION_SETTING);
    }, 300)
  );
});

// Both events may deliver the stored settings — listen to both like the SDK demos
$UD.onAdd(jsn => {
  if (jsn && jsn.param) restoreSettings(jsn.param);
});

$UD.onParamFromApp(jsn => {
  if (jsn && jsn.param) restoreSettings(jsn.param);
});

function restoreSettings(params) {
  ACTION_SETTING = params;
  Utils.setFormValue(ACTION_SETTING, form);
}

document.getElementById('help').addEventListener('click', () => {
  $UD.openUrl('https://developers.google.com/youtube/v3/getting-started');
});
