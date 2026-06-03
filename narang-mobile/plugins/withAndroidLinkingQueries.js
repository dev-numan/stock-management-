const { withAndroidManifest } = require('expo/config-plugins');

/** Allow Linking + intents to open SMS and WhatsApp on Android 11+. */
function withAndroidLinkingQueries(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const existing = manifest.queries?.[0] || { intent: [], package: [] };

    const intentSchemes = new Set(
      (existing.intent || [])
        .flatMap((item) => item.data || [])
        .map((d) => d.$?.['android:scheme'])
        .filter(Boolean)
    );

    const addIntent = (actionName, scheme) => {
      if (scheme && intentSchemes.has(scheme)) return;
      if (scheme) intentSchemes.add(scheme);
      existing.intent = existing.intent || [];
      existing.intent.push({
        action: [{ $: { 'android:name': actionName } }],
        ...(scheme
          ? { data: [{ $: { 'android:scheme': scheme } }] }
          : {}),
      });
    };

    addIntent('android.intent.action.VIEW', 'whatsapp');
    addIntent('android.intent.action.VIEW', 'https');
    addIntent('android.intent.action.SENDTO', 'sms');
    addIntent('android.intent.action.SENDTO', 'smsto');
    addIntent('android.intent.action.SEND');
    addIntent('android.intent.action.VIEW');

    const packageNames = new Set(
      (existing.package || []).map((p) => p.$?.['android:name']).filter(Boolean)
    );
    ['com.whatsapp', 'com.whatsapp.w4b'].forEach((name) => {
      if (!packageNames.has(name)) {
        existing.package = existing.package || [];
        existing.package.push({ $: { 'android:name': name } });
      }
    });

    manifest.queries = [existing];
    return config;
  });
}

module.exports = withAndroidLinkingQueries;
