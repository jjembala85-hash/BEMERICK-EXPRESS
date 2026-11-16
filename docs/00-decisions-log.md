# 00 · Decisions Log

Every decision that shapes the product goes here: newest at the bottom, never deleted. If a decision is reversed, add a new row that supersedes it.

**Status key:** ✅ Agreed · 🟡 Proposed (awaiting owner confirmation) · ⏳ Deferred

| ID | Date | Decision | Status | Notes |
|----|------|----------|--------|-------|
| D-001 | 2026-11-15 | Publication name **BEMERICK EXPRESS**; short brand / acronym **BX News** | ✅ | Logo and branding are a working draft, to be revised later |
| D-002 | 2026-11-15 | Text-first news site. Photos carry stories. **No video storage/hosting** on our platform | ✅ | |
| D-003 | 2026-11-15 | Live streams and bulletins are **YouTube-linked/embedded** only | ✅ | YouTube Live + privacy-enhanced embeds |
| D-004 | 2026-11-15 | Launch language **English only**. Luganda (lg) and Swahili (sw) added later | ✅ | Database designed for all three from day one |
| D-005 | 2026-11-15 | Database: **PostgreSQL** | ✅ | Hosted on Neon (free tier) |
| D-006 | 2026-11-15 | **Do not use Supabase**. Replace with Neon (Postgres) + Better Auth + Cloudflare R2 | 🟡 | See [03 · Architecture](03-technical-architecture.md#2-why-not-supabase-and-what-replaces-it) |
| D-007 | 2026-11-15 | Hosting budget **$0/month** at start. Only unavoidable cost is the domain (~US$10–15/yr) | ✅ | |
| D-008 | 2026-11-15 | Hosting: **Cloudflare Workers (free)** running Next.js via OpenNext, with a week-1 feasibility spike and an Astro fallback | 🟡 | Spike decides. See [Architecture §3](03-technical-architecture.md#3-hosting-on-cloudflare-and-the-week-1-spike) |
| D-009 | 2026-11-15 | Editors choose the **Lead story** and the **Top Stories row**; empty slots fall back to latest | ✅ | |
| D-010 | 2026-11-15 | Roles: **Admin first**. Admin can do everything so a one-person newsroom can operate. Editor and Writer roles are built in from the start | ✅ | More roles later |
| D-011 | 2026-11-15 | Social priority: **WhatsApp Channel, TikTok, X**. Facebook handle reserved as secondary | ✅ | |
| D-012 | 2026-11-15 | Payments deferred (MTN MoMo / Airtel Money via an aggregator when needed) | ⏳ | |
| D-013 | 2026-11-15 | Regulatory registration deferred, but the platform is **built compliance-by-design** from day one | ✅ | See [Blueprint §11](02-product-blueprint.md#11-compliance-by-design) |
| D-014 | 2026-11-15 | Documents live as **Markdown in this GitHub repository** | ✅ | |
| D-015 | 2026-11-15 | Brand palette **"Lake & Crane"** (Lake Ink teal, Crane Gold, Ember, Paper) | 🟡 | Draft, revisit with designer |
| D-016 | 2026-11-15 | Fonts: **Newsreader** (headlines/body) + **Instrument Sans** (interface) | 🟡 | Free, open licence |
| D-017 | 2026-11-15 | Clean, short URLs with no language prefix for English, e.g. `bemerickexpress.com/business/story-slug` | 🟡 | Browser tab shows BX icon + "Headline · BEMERICK EXPRESS" |
| D-018 | 2026-11-15 | Article statuses revised (draft → in review → approved → scheduled/published, plus changes requested, unpublished, spiked) | 🟡 | See [Architecture §6](03-technical-architecture.md#6-article-lifecycle-statuses) |
| D-019 | 2026-11-15 | **Vercel for private previews only; Cloudflare for the live site.** Vercel's free plan does not allow commercial use, so the public, ad-carrying site never runs there | ✅ | Vercel project `bemerickexpress` (team `roadsideapp`) |
| D-020 | 2026-11-15 | Neon project `bemerick-express` created in Frankfurt (`aws-eu-central-1`) with branches `main` (live) and `dev` (development). D-006 moves from proposed to in use | ✅ | Local app points at `dev` |
| D-021 | 2026-11-15 | Domain purchase postponed; development continues on the free `workers.dev` address | ⏳ | Q-001 stays open |
| D-022 | 2026-11-15 | Hosting spike, part 1: Next.js 16 deploys and runs on the Cloudflare Workers **free** plan (bundle ~1.06 MB compressed vs 3 MB limit). Page cache uses static assets for now; the R2 cache upload timed out from the development machine and is deferred to Phase 2 (try from GitHub Actions) | 🟡 | D-008 stays proposed until a database page and login are tested |
| D-023 | 2026-11-15 | Desktop navigation is a **collapsible left sidebar** (icon rail when collapsed); mobile uses a slide-in drawer plus the section swipe strip. Replaces the top section menu in Blueprint §6.1 | ✅ | Styled with Tailwind CSS, not Bootstrap |
| D-024 | 2026-11-15 | **Hosting confirmed: Cloudflare Workers free plan** runs the app, database reads and staff sign-in (spike passed). Bundle is 1.88 MB of the 3 MB free limit, so bundle size is now a tracked risk; the fallback stays Workers Paid (~US$5/month). D-008 is confirmed | ✅ | Local .env.local values are bundled as fallbacks at deploy; Cloudflare secrets override them. Move deploys to GitHub Actions before launch |
| D-025 | 2026-11-15 | **Vercel is the day-to-day build site** (emerickexpress.vercel.app): deploys automatically on every push to main, uses the Neon dev database, has no app-size limit. Cloudflare (workers.dev, Neon main) stays the planned home for the public, ad-carrying launch. Final host is chosen at launch: Cloudflare paid (~US$5/month) or Vercel Pro (~US$20/month). Refines D-019 | ✅ | Vercel's free plan is non-commercial only, so no ads or sponsored content may run there |
| D-026 | 2026-11-16 | **Photo pipeline:** photos are resized in the newsroom browser (480, 960 and 1600 px; WebP, or JPEG on browsers that cannot make WebP), uploaded through the app to the R2 bucket `bemerick-express-media`, and shown with plain `srcset` images, with no paid image service. Alt text and credit are required at upload. One bucket serves both Vercel and Cloudflare | 🟡 | Public address is the bucket's `r2.dev` URL until the domain is bought (then `img.bemerickexpress.com`). Uploads use an R2 API token stored in the settings of Vercel, the Cloudflare Worker and the local machine (added 16 Nov) |

## Open questions

| ID | Question | Owner | Needed by |
|----|----------|-------|-----------|
| Q-001 | Which domain? Recommended: `bemerickexpress.com` (primary) plus reserve `bxnews` handles everywhere. Check availability | Owner | Phase 0 |
| Q-002 | Confirm the tagline, or replace it | Owner | Before launch |
| Q-003 | Who are the first staff (names, roles) and how many hours a week can development get? | Owner | Phase 1 |
| Q-004 | Is there a YouTube channel yet? Needed for live and bulletins | Owner | Phase 4 |
| Q-005 | Final logo: keep the draft or hire a designer once there is revenue? | Owner | Post-launch |
