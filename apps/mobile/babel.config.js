module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Tamagui plugin for optimized builds
      [
        '@tamagui/babel-plugin',
        {
          components: ['tamagui'],
          config: './shared/theme/tamagui.config.ts',
          logTimings: true,
          disableExtraction: process.env.NODE_ENV === 'development',
        },
      ],
      // Reanimated plugin must be last
      'react-native-reanimated/plugin',
    ],
  };
};
