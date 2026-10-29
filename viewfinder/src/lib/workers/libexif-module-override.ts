import { libexifFactory } from "libexif-wasm/internal/module.js";

const libexif = await libexifFactory({
    locateFile: (fileName: string) => `/wasm/libexif/${fileName}`
});

export { libexifFactory, libexif };
