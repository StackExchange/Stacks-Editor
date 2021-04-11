module.exports = (ctx) => {
    let isProduction = ctx.env === "production";
    // check our super hacky solution for overriding minification in shared configs
    let shouldMinifyOverride = ctx.options._data.minify;
    return {
        plugins: {
            cssnano:
                isProduction && shouldMinifyOverride
                    ? {
                          preset: [
                              "default",
                              {
                                  calc: false,
                              },
                          ],
                      }
                    : false,
        },
    };
};
