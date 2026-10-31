import nextVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = [
  ...nextVitals,
  {
    ignores: ['.next*/**', 'coverage/**'],
  },
];

export default eslintConfig;
