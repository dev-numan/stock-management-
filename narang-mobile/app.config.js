// Dynamic Expo config. Expo loads app.json first and passes it in as `config`;
// we override only the network-security flags so cleartext HTTP is allowed for
// local LAN development (`expo start`) but DISABLED in every EAS build, which
// talks to the production HTTPS API. Set via the EAS_BUILD_PROFILE env that EAS
// injects during builds.
module.exports = ({ config }) => {
  const isEasBuild = Boolean(process.env.EAS_BUILD_PROFILE);
  const allowHttp = !isEasBuild; // only local dev needs cleartext for LAN IPs

  return {
    ...config,
    android: {
      ...config.android,
      usesCleartextTraffic: allowHttp,
    },
    ios: {
      ...config.ios,
      infoPlist: {
        ...(config.ios && config.ios.infoPlist),
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: allowHttp,
          NSAllowsLocalNetworking: true,
        },
      },
    },
  };
};
