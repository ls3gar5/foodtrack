module.exports = {
  displayName: 'bff',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest'],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/bff',
  testMatch: ['**/+(*.)+(spec|test).[tj]s?(x)'],
}
