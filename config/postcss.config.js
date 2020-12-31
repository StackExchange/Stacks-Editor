module.exports = (ctx) => {
    let isProduction = false; // ctx.webpack.mode === "production";

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
