import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

const isProd = process.env.NODE_ENV === "production";

/** @type {import('@sveltejs/kit').Config} */
const config = {
    // Consult https://svelte.dev/docs/kit/integrations
    // for more information about preprocessors
    preprocess: vitePreprocess(),
    compilerOptions: {
        experimental: {
            async: true
        },
        ...(isProd
            ? {
                  cssHash: ({ css, hash }) => {
                      // *branding yay*
                      return `viz-css-${hash(css)}`;
                  }
              }
            : {})
    },
    onwarn: (warning, handler) => {
        if (warning.code === "css-unused-selector") {
            return;
        }
        handler(warning);
    },
    kit: {
        // adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
        // If your environment is not supported, or you settled on a specific environment, switch out the adapter.
        // See https://svelte.dev/docs/kit/adapters for more information about adapters.
        adapter: adapter({
            pages: "../build/viewfinder",
            fallback: "index.html"
        })
    }
};

export default config;
