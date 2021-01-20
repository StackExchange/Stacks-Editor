module.exports = {
    verbose: true,
    globals: {
        "ts-jest": {
            tsconfig: "./test/tsconfig.json",
        },
    },

    // uncomment to see what playwright's doing
    launchOptions: {
        headless: false,
        slowMo: 200,
    },
};
