module.exports = {
    globals: {
        "ts-jest": {
            tsconfig: "./test/tsconfig.json",
        },
    },

    serverOptions: {
        command: "npm start -- --port 8081 --no-open",
        launchTimeout: 20000,
        port: 8081,
    },

    // uncomment to see what playwright's doing
    // launchOptions: {
    //     headless: false,
    //     slowMo: 200,
    // },
};
