// babel-preset-expo (SDK 57) adds the react-native-worklets plugin automatically when the package is
// installed (required by react-native-reanimated 4), so no explicit plugin entry is needed here.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
