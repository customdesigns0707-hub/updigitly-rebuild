/**
 * ESM loader hook that no-ops the 'server-only' package and resolves
 * extensionless relative TS imports (bundler-style, as used throughout src/)
 * when running a script in plain Node instead of through Next's webpack
 * build. Needed by scripts/check-reconcile.ts (or anything else that imports
 * from src/lib/* directly). See check-reconcile.ts for the invocation.
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'server-only') {
    return { url: 'server-only-stub:noop', shortCircuit: true };
  }
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (
      (specifier.startsWith('./') || specifier.startsWith('../')) &&
      err &&
      err.code === 'ERR_MODULE_NOT_FOUND'
    ) {
      for (const ext of ['.ts', '.tsx', '.mjs', '.js']) {
        try {
          return await nextResolve(specifier + ext, context);
        } catch {
          // try next extension
        }
      }
    }
    throw err;
  }
}

export async function load(url, context, nextLoad) {
  if (url === 'server-only-stub:noop') {
    return { format: 'module', source: 'export {};', shortCircuit: true };
  }
  return nextLoad(url, context);
}
