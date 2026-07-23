import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Teach plain `node` the `@/*` path alias from tsconfig.json.
 *
 * Next.js resolves it during a build, but `node --test` does not, and the
 * scheduling domain is only worth extracting if it can be run without one.
 * Node strips the TypeScript itself (v22.6+), so this hook is the only glue
 * needed — no bundler, no transpile step, no extra dependency.
 */
const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "..", "src");

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("@/")) {
      return {
        url: pathToFileURL(resolve(SRC, specifier.slice(2) + ".ts")).href,
        shortCircuit: true,
      };
    }
    // `server-only` throws when resolved outside a server component, which
    // makes every module carrying it untestable here. The guard that actually
    // matters is the one Next's bundler enforces at build time — this only
    // stubs it for the test process, so pure server logic can be exercised.
    if (specifier === "server-only") {
      return { url: "data:text/javascript,", shortCircuit: true };
    }
    return next(specifier, context);
  },
});
