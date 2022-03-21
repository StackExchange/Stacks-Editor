import { BaseOptions, EditorConstructor, EditorPlugin } from "./types";

export class EditorBuilder<TOptions extends BaseOptions> {
    private addedPlugins: Map<string, EditorPlugin>;

    constructor() {
        this.addedPlugins = new Map<string, EditorPlugin>();
    }

    public add<T>(
        name: string,
        plugin: EditorPlugin<T>
    ): EditorBuilder<{
        [Prop in keyof (TOptions & T)]: (TOptions & T)[Prop];
    }> {
        this.addedPlugins.set(name, plugin);
        return this;
    }

    // TODO remove options
    public remove(name: string): EditorBuilder<TOptions> {
        this.addedPlugins.delete(name);
        return this;
    }

    // TODO
    public build(): EditorConstructor<TOptions> {
        return null;
    }
}
