/// <reference types="vitest/config" />
import { sveltekit } from "@sveltejs/kit/vite";
import fs from "fs";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
import { type ProxyOptions } from "vite";
import devtoolsJson from "vite-plugin-devtools-json";
import { defineConfig } from "vitest/config";

const file = fileURLToPath(new URL("package.json", import.meta.url));
const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
// In Docker we can pass VIZ_CONFIG_PATH (e.g., /app/viz.json)
const configPath = process.env.VIZ_CONFIG_PATH || "../viz.json";
const defaultServers = {
    api: { host: "localhost", port: Number(process.env.API_PORT ?? 7770) },
    viz: { port: Number(process.env.VITE_VIZ_PORT ?? 7777) }
};

let config: any = { servers: defaultServers };
try {
    const fileConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    config = {
        ...fileConfig,
        servers: {
            api: { ...defaultServers.api, ...fileConfig.servers?.api },
            viz: { ...defaultServers.viz, ...fileConfig.servers?.viz }
        }
    };
} catch (err) {
    if (process.env.VIZ_CONFIG_PATH) {
        // Fail fast for unexpected Docker build context issues.
        throw new Error(`VIZ_CONFIG_PATH set to '${process.env.VIZ_CONFIG_PATH}' but file not found: ${err}`);
    }
}
const define = {
    __APP_VERSION__: JSON.stringify(pkg.version)
};

// ideally a user/developer NEVER gets to the hardcoded defaults
const apiHost = process.env.VIZ_API_SERVER_HOST || config.servers.api.host || "localhost";
const apiPort = process.env.VIZ_API_SERVER_PORT || config.servers.api.port || 7770;

const apiServer: ProxyOptions = {
    target: `http://${apiHost}:${apiPort}`,
    secure: true,
    changeOrigin: true,
    ws: true
};

const viteProxy: Record<string, string | ProxyOptions> = {
    "/api": apiServer
};

// Expose runtime config (servers) as a global so the built frontend can read it without extra fetches.
(define as any).__RUNTIME_CONFIG__ = JSON.stringify({ version: pkg.version });

if (process.env.NODE_ENV !== "production") {
    (define as any).__servers = config.servers;
}

function copyFiles(srcDir: string, destDir: string, filterFn: (file: string) => boolean) {
    if (!fs.existsSync(srcDir)) {
        return;
    }
    fs.mkdirSync(destDir, { recursive: true });
    for (const file of fs.readdirSync(srcDir)) {
        if (filterFn(file)) {
            fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
        }
    }
}

function copyImageProcessWasmFiles() {
    const require = createRequire(import.meta.url);

    try {
        const srcDir = path.resolve("node_modules/wasm-vips/lib");
        const destWasmDir = path.resolve("static/wasm/vips");
        copyFiles(
            srcDir,
            destWasmDir,
            (file) => file.endsWith(".wasm") || file === "vips-es6.js" || file === "vips.js"
        );
    } catch (e) {
        console.error("Failed to copy wasm-vips files:", e);
    }

    try {
        const pkgPath = require.resolve("libexif-wasm/package.json");
        const srcDir = path.join(path.dirname(pkgPath), "dist/output");
        const destExifDir = path.resolve("static/wasm/libexif");
        copyFiles(srcDir, destExifDir, (file) => file.endsWith(".wasm") || file.endsWith(".js"));
    } catch (e) {
        console.error("Failed to copy libexif-wasm files:", e);
    }
}

export default defineConfig({
    plugins: [
        {
            name: "image-process-wasm-copy",
            buildStart() {
                copyImageProcessWasmFiles();
            }
        },
        {
            name: "isolate",
            configureServer(server) {
                server.middlewares.use((_req, res, next) => {
                    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
                    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
                    next();
                });
            }
        },
        devtoolsJson(),
        sveltekit()
    ],
    define: define,
    optimizeDeps: {
        exclude: ["wasm-vips", "libexif-wasm"],
        rolldownOptions: {
            transform: {
                target: "es2023"
            }
        }
    },
    worker: {
        format: "es"
    },
    build: {
        target: "es2023",
        reportCompressedSize: false,
        rollupOptions: {
            external: ["material-symbols/index.css"]
        }
    },
    test: {
        globals: true, // This enables global APIs like 'expect', 'vi'
        environment: "jsdom", // Default to jsdom for client-side tests
        setupFiles: ["./vitest-setup-client.ts"], // Apply this to all client tests
        // Common include/exclude patterns for all test projects
        include: [
            "src/tests/**/*.spec.ts",
            "src/**/*.spec.{js,ts}",
            "src/**/*.test.{js,ts}",
            "src/**/*.svelte.spec.{js,ts}",
            "src/**/*.svelte.test.{js,ts}"
        ],
        exclude: [
            "src/lib/server/**",
            "src/lib/third-party/**",
            "src/lib/third-party/**/tests/**",
            "e2e/**" // Exclude Playwright E2E tests
        ],
        projects: [
            {
                extends: "./vite.config.ts", // Extend the base config
                test: {
                    name: "client",
                    clearMocks: true
                    // No need to redefine include/exclude or setupFiles here if they are in the top-level
                }
            },
            {
                extends: "./vite.config.ts",
                test: {
                    name: "server",
                    environment: "node",
                    // keep server tests narrow to server-specific locations to avoid loading UI/component tests
                    include: ["src/lib/server/**", "src/**/*.server.spec.{js,ts}", "src/**/*.server.test.{js,ts}"],
                    exclude: [
                        "src/tests/**",
                        "src/**/*.svelte.spec.{js,ts}",
                        "src/lib/third-party/**/tests/**",
                        "e2e/**"
                    ]
                }
            }
        ]
    },
    server: {
        host: "0.0.0.0",
        port: config.servers.viz.port,
        cors: true,
        headers: {
            "Cross-Origin-Opener-Policy": "same-origin",
            "Cross-Origin-Embedder-Policy": "require-corp"
        },
        proxy: viteProxy,
        allowedHosts: ["viz.localhost", "localhost", "127.0.0.1"],
        watch: {
            usePolling: true
        }
    },
    preview: {
        port: config.servers.viz.port,
        cors: true,
        headers: {
            "Cross-Origin-Opener-Policy": "same-origin",
            "Cross-Origin-Embedder-Policy": "require-corp"
        },
        proxy: viteProxy
    }
});
