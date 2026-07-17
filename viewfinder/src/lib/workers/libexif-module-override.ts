import libexifFactory from "libexif-wasm/output/libexif.js";

const libexif = await libexifFactory({
    locateFile: (fileName: string) => `/wasm/libexif/${fileName}`,
    mainScriptUrlOrBlob: "/wasm/libexif/libexif.js"
});

export { libexifFactory, libexif };
