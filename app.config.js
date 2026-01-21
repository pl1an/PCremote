export default {
  expo: {
    name: 'PC remote',
    slug: 'pc-remote',
    version: '1.0.0',
    orientation: 'portrait',

    icon: './assets/images/icon.png',

    splash: {
      image: './assets/images/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#1f1f1f',
    },

    scheme: 'pc-remote',
    userInterfaceStyle: 'automatic',

    newArchEnabled: true,

    ios: {
      supportsTablet: true,
    },

    android: {
      package: 'com.pl1an.pcremote',
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      adaptiveIcon: {
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundColor: '#1f1f1f',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
    },

    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },

    plugins: [
      'expo-router',
      'expo-splash-screen',
    ],

    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  },
};
