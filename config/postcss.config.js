module.exports = (ctx) => {
    let isProduction = ctx.env === "production";
    return {
        plugins: {
            cssnano: isProduction
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
