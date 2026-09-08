module.exports = {
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-async-storage|@react-navigation|@sahil_sensei|react-native-linear-gradient|react-native-vector-icons)/)',
  ],
};
