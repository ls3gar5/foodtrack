module.exports = {
  testMatch: ['**/+(*.)+(spec|test).[tj]s?(x)'],
  resolver: '@nx/jest/plugins/resolver',
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageReporters: ['html', 'text'],
}
