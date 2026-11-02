# Repository constraints

This application is deployed as a static GitHub Pages site under a repository subpath.

- Keep runtime features fully client-side; GitHub Pages provides no application server.
- Resolve routes, assets, the manifest, and service-worker URLs through Vite's `BASE_URL` / the configured `BASE_PATH`.
- Preserve SPA refresh and offline behavior under `/<repository-name>/`, not only at `/`.
- Before completing a production-facing change, run `BASE_PATH=/bookkeeping/ npm run build` in addition to the relevant tests and type checks.
