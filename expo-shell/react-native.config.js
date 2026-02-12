// React Native Community CLI autolinking 설정
// EXPO_USE_COMMUNITY_AUTOLINKING=1 환경변수와 함께 사용
module.exports = {
  project: {
    android: {
      sourceDir: './android',
      packageName: 'com.jhcol.bridgeshell',
    },
    ios: {
      sourceDir: './ios',
    },
  },
};
