# Broken Beach / Pasih Uug visitor guide

Independent English and Indonesian information for Broken Beach in Nusa Penida. The English homepage remains `/`; Indonesian uses `/id/`. Existing privacy-policy, terms-of-service and cookie-settings topics retain their slugs, with topic-paired language links.

## Build and verification

Use the pinned pnpm version and supported Node.js 22/24. Run `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm test`, `pnpm build`, then `pnpm exec wrangler deploy --dry-run`. The build uses only Node.js built-ins. Editable copy and templates are under `source/` and `scripts/`; `worker.mjs` handles canonical redirects, real 404 responses and model-data endpoints.

This repository originally tracked the generated `public/` directory and that convention is retained. Commit rebuilt HTML, hashed assets, discovery files and the error page together with their source assets. No separate dist directory is required. The verified Cloudflare project is `brokenbeach`; the old official base check was a historical failed build, not evidence about this change.

The former repository contained only a development React bundle and manually patched output, without editable app source or a package manifest. The maintainable static build preserves the original visual colours, typography and visitor topics while removing development collectors, DOM patches and obsolete Pages functions.

## Current source limits

See [source notes](research.md). The map pin is a location reference, not a verified entrance. Maps uses Sakti, while the dated regency report uses Bunga Mekar; they are attributed separately. Current hours and fees remain unverified. Broken Beach’s cove/arch and Angel’s Billabong’s coastal pool do not share an automatic access permission. Neither old photographs nor low model sea level authorise entering water or walking on an arch.

## Photograph

The site now uses a reference photograph by **Aaron Rentfrew**, taken in 2017, from [Commons: Broken Beach.jpg](https://commons.wikimedia.org/wiki/File:Broken_Beach.jpg), under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The inspected description showed no deletion nomination or rights warning. It is resized/re-encoded to 1920 × 1280 WebP (CSS cropping may occur); the source/licence and modification notice accompany the image. This audit does not independently warrant ownership or present access conditions. Existing untraceable served photos have been replaced; legacy original files remain historical source material and are not used by the current build.

## Privacy and models

Google Fonts and Maps are external resources. Analytics is disabled until consent. Refusal immediately disables analytics; storage failures are explained without claiming persistence. No account, booking or contact form is provided.

Weather and sea-level endpoints use fixed place coordinates and bounded Open-Meteo requests. They reject invalid data and fail with a generic error. Marine data are regional models, not coastal-navigation or water-entry guidance; the page includes source attribution and model limits. Local HTTP and code tests do not replace actual production, mobile navigation, geometry and browser image-loading verification.
