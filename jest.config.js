// jest.config.js
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts'],
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/index.ts',
        '!src/app.ts',
        '!src/__tests__/**',
        '!src/database/mongodb.ts',      // infrastructure, not testable in unit context
        '!src/config/email.ts',          // nodemailer transport, mocked everywhere
        '!src/config/index.ts',          // env vars only
        '!src/middlewares/upload.middleware.ts', // multer disk storage callbacks
        '!src/types/**',             // TypeScript types, not executable code
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
    moduleNameMapper: {
        "^uuid$": "<rootDir>/src/__tests__/__mocks__/uuid.js",
    },
    //increase timeout if DB ops are slow
    testTimeout: 30000,
};