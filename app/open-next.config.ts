import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Pre-rendered pages are served from the deployed static assets.
// This cache is read-only: switch to the R2 incremental cache (see
// https://opennext.js.org/cloudflare/caching) in Phase 2, when published
// stories need to refresh pages without a redeploy.
export default defineCloudflareConfig({
	incrementalCache: staticAssetsIncrementalCache,
});
