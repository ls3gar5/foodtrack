module.exports = {
  displayName: 'front',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': ['@swc/jest'],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'html'],
  coverageDirectory: '../../coverage/apps/front',
  testMatch: ['**/+(*.)+(spec|test).[tj]s?(x)'],
}
