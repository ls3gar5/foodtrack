module.exports = {
  displayName: 'back',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest'],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/back',
  testMatch: ['**/+(*.)+(spec|test).[tj]s?(x)'],
}
