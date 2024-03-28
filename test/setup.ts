// JSDOM stub for getBoundingClientRect
// https://github.com/jsdom/jsdom/issues/3002
document.createRange = () => {
    const range = new Range();

    range.getBoundingClientRect = () => {
        return {
            x: 0,
            y: 0,
            bottom: 0,
            height: 0,
            left: 0,
            right: 0,
            top: 0,
            width: 0,
            toJSON: () => {},
        };
    };

    range.getClientRects = () => {
        return {
            item: () => null,
            length: 0,
            *[Symbol.iterator]() {},
        };
    };

    return range;
};
