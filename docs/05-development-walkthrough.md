# 05 · Development Walkthrough

> A practical, step-by-step guide from this folder to **Milestone 1: first story live**. It replaces the v0 walkthrough (Supabase), which is in `docs/archive/`.
> ⚠️ Tools change quickly. Commands here reflect the stack as of November 2026. If a command or option differs, follow the **official docs linked in each step** and update this file.

---

## Step 0 · Your machine

Already confirmed: **Node.js v24**, **Git 2.55**. Also install:
- **VS Code** + extensions: ESLint, Tailwind CSS IntelliSense, Prettier, GitLens.
- **GitHub CLI** (optional but useful): `winget install GitHub.cli`, then `gh auth login`.

Open this folder (`C:\Users\HP\Desktop\BEMERICK EXPRESS`) in VS Code. The repo root holds the docs; the app goes in `app/`.

---

## Step 1 · Free accounts (Phase 0)

| Service | Sign up | You'll need from it |
|---------|---------|---------------------|
| Cloudflare | dash.cloudflare.com | Account (Workers, R2, Registrar, Email Routing) |
| Neon | neon.tech | Project `bemerick-express`, region nearest East Africa (e.g. EU/Frankfurt) → connection string |
| Resend | resend.com | API key (staff invites, password resets) |
| Sentry | sentry.io | DSN (error monitoring) |

Use a password manager. Turn on 2FA on **every** account, especially GitHub and Cloudflare.

---

## Step 2 · Create the app with Cloudflare + Next.js

From the repo root, in PowerShell:

```powershell
npm create cloudflare@latest -- app --framework=next
```

This scaffolds Next.js already configured for Cloudflare Workers via OpenNext. Choose **TypeScript, ESLint, Tailwind, `src/` directory, App Router, import alias `@/*`**. Docs: <https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/> and <https://opennext.js.org/cloudflare>.

```powershell
cd app
npm run dev        # local dev at http://localhost:3000
npm run preview    # runs the real Workers runtime locally (use before every deploy)
npm run deploy     # builds and deploys to <name>.workers.dev
```

Run `npx wrangler login` once before the first deploy.

### Target folder structure (grow it as features arrive)

```
app/
  src/
    app/
      (public)/                 # reader site, no language prefix for English
        page.tsx                # homepage
        [section]/page.tsx      # section page
        [section]/[slug]/page.tsx  # article
        live/  bulletins/  latest/  search/  author/[slug]/  topic/[slug]/
        about/ contact/ editorial-policy/ corrections/ privacy/ terms/ cookies/ advertise/
      newsroom/                 # staff portal (protected)
        login/  stories/  review/  homepage/  alerts/  media/  staff/  audit/
      api/auth/[...all]/route.ts   # Better Auth
      sitemap.ts  robots.ts  manifest.ts
    components/   (public/, newsroom/, ui/)
    db/           schema.ts, index.ts
    lib/          auth.ts, permissions.ts, queries/ (public.ts filters published only)
  drizzle/        # generated SQL migrations (committed)
  wrangler.jsonc  open-next.config.ts  drizzle.config.ts
```

**Commit:**
```powershell
cd ..
git add app
git commit -m "feat(app): scaffold Next.js on Cloudflare Workers"
```

---

## Step 3 · Environment variables

Create `app/.env.local` (**never committed**; check it's in `.gitignore`):

```ini
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
BETTER_AUTH_SECRET=<long random string>
BETTER_AUTH_URL=http://localhost:3000
RESEND_API_KEY=
```

Generate a secret: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
For Workers preview/production, store the same keys as **secrets**: `npx wrangler secret put DATABASE_URL` (repeat for each). Use **different values for dev and production**.

---

## Step 4 · Database with Neon + Drizzle

```powershell
cd app
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit
```

`app/drizzle.config.ts`
```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

`app/src/db/index.ts`
```ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export const db = drizzle({ client: neon(process.env.DATABASE_URL!), schema });
```

`app/src/db/schema.ts`: starting tables (extend in Phase 3 per Architecture §5)
```ts
import { pgTable, pgEnum, uuid, text, boolean, integer, jsonb, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const articleStatus = pgEnum("article_status", [
  "draft", "in_review", "changes_requested", "approved",
  "scheduled", "published", "unpublished", "spiked",
]);
export const articleType = pgEnum("article_type", [
  "news", "analysis", "opinion", "feature", "bulletin", "photo_story", "sponsored",
]);
export const priority = pgEnum("priority", ["normal", "important", "breaking"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
};

export const section = pgTable("section", {
  id: uuid("id").primaryKey().defaultRandom(),
  parentId: uuid("parent_id"),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  r2Key: text("r2_key").notNull(),
  variants: jsonb("variants").notNull(),          // { "480": key, "960": key, "1600": key }
  width: integer("width"), height: integer("height"),
  caption: text("caption"),
  altText: text("alt_text").notNull(),
  credit: text("credit").notNull(),               // required: photo credit
  licence: text("licence"),
  uploadedBy: text("uploaded_by").notNull(),      // Better Auth user id
  ...timestamps,
});

export const article = pgTable("article", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: articleType("type").notNull().default("news"),
  status: articleStatus("status").notNull().default("draft"),
  priority: priority("priority").notNull().default("normal"),
  primarySectionId: uuid("primary_section_id").notNull().references(() => section.id),
  leadMediaId: uuid("lead_media_id").references(() => media.id),
  youtubeVideoId: text("youtube_video_id"),
  legalHold: boolean("legal_hold").notNull().default(false),
  createdBy: text("created_by").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  firstPublishedAt: timestamp("first_published_at", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  updatedPublicAt: timestamp("updated_public_at", { withTimezone: true }),
  ...timestamps,
});

export const articleTranslation = pgTable("article_translation", {
  id: uuid("id").primaryKey().defaultRandom(),
  articleId: uuid("article_id").notNull().references(() => article.id, { onDelete: "cascade" }),
  lang: text("lang").notNull().default("en"),     // en | lg | sw
  headline: text("headline").notNull(),
  standfirst: text("standfirst"),
  body: jsonb("body").notNull().default({}),      // Tiptap JSON
  slug: text("slug").notNull(),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  socialHeadline: text("social_headline"),
  ...timestamps,
}, (t) => [
  uniqueIndex("translation_lang_slug").on(t.lang, t.slug),
  uniqueIndex("translation_article_lang").on(t.articleId, t.lang),
]);

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: text("actor_id"),
  action: text("action").notNull(),               // e.g. "article.publish"
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

Generate and apply migrations (SQL files go in `app/drizzle/` and are **committed**):
```powershell
npx drizzle-kit generate
npx drizzle-kit migrate
```
Docs: <https://orm.drizzle.team/docs/get-started/neon-new>

> Rule: **never** edit the production database by hand. Every change is a migration in Git. Test on the Neon `dev` branch first.

---

## Step 5 · Staff authentication with Better Auth

```powershell
npm install better-auth
```

`app/src/lib/auth.ts`
```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { db } from "@/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,        // no public registration: staff are invited
    minPasswordLength: 12,
  },
  plugins: [admin()],           // roles, ban/disable users, admin user management
});
```

`app/src/app/api/auth/[...all]/route.ts`
```ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

Generate Better Auth's tables into the Drizzle schema, then migrate:
```powershell
npx @better-auth/cli generate
npx drizzle-kit generate
npx drizzle-kit migrate
```

Docs: <https://www.better-auth.com/docs/installation> · admin plugin & custom roles (Admin/Editor/Writer): <https://www.better-auth.com/docs/plugins/admin>

**Protect the newsroom:** `app/src/app/newsroom/(protected)/layout.tsx` gets the session **on the server** (`auth.api.getSession({ headers: await headers() })`), redirects to `/newsroom/login` if missing or banned, and passes the role down. Every server action re-checks with `can(user, "article.publish")`. **Hiding a button is not security.**

**First admin:** a one-time script `app/scripts/create-admin.ts` creates the first user with role `admin` from command-line input. It's never exposed as a web page.

---

## Step 6 · Public queries: published only

`app/src/lib/queries/public.ts` is the **only** place public pages get articles from:

```ts
import { and, desc, eq, lte } from "drizzle-orm";
import { db } from "@/db";
import { article, articleTranslation } from "@/db/schema";

const isPublic = () =>
  and(eq(article.status, "published"), lte(article.publishedAt, new Date()));

export async function getArticleBySlug(slug: string, lang = "en") {
  const rows = await db
    .select()
    .from(articleTranslation)
    .innerJoin(article, eq(article.id, articleTranslation.articleId))
    .where(and(eq(articleTranslation.slug, slug), eq(articleTranslation.lang, lang), isPublic()))
    .limit(1);
  return rows[0] ?? null;
}

export async function getLatest(limit = 20, lang = "en") {
  return db
    .select()
    .from(articleTranslation)
    .innerJoin(article, eq(article.id, articleTranslation.articleId))
    .where(and(eq(articleTranslation.lang, lang), isPublic()))
    .orderBy(desc(article.publishedAt))
    .limit(limit);
}
```

---

## Step 7 · Brand in code

- Add the CSS tokens from [01 · Brand §2](01-brand-identity.md#css-tokens-copy-into-the-app) to `app/src/app/globals.css` and map them in the Tailwind theme.
- Load fonts with `next/font/google` (self-hosted at build): `Newsreader` (400, 600, 700, italic 400) and `Instrument_Sans` (400, 600).
- Copy `brand/favicon.svg` to `app/src/app/icon.svg` (Next.js picks it up automatically).
- Root metadata: `title: { template: "%s · BEMERICK EXPRESS", default: "BEMERICK EXPRESS · News. Insight. Impact." }`.

---

## Step 8 · Photos to R2

1. Cloudflare dashboard → R2 → create buckets `bx-media` (public via custom domain `img.bemerickexpress.com` once the domain exists) and `bx-backups` (private).
2. Bind `bx-media` in `wrangler.jsonc` as `MEDIA`.
3. In the newsroom upload form, resize in the browser to WebP 480/960/1600 (e.g. `browser-image-compression`), then upload to a server action that checks role, type and size and writes to R2.
4. Credit and alt text are required before the save button activates.

---

## Step 9 · Deploy & verify Milestone 1

```powershell
npm run preview     # test on the Workers runtime locally
npm run deploy
```

Checklist (Roadmap Milestone 1):
- [ ] Admin signs in on the deployed URL
- [ ] Creates a story with a lead photo (credit + alt filled)
- [ ] Publishes; it appears on `/`, `/{section}` and `/{section}/{slug}`
- [ ] Signed-out phone browser can read it; tab shows BX icon + `Headline · BEMERICK EXPRESS`
- [ ] A draft's URL returns 404 for signed-out users
- [ ] `/newsroom` redirects signed-out users to login
- [ ] Code committed and pushed to GitHub

---

## Working habits

- Small commits, clear messages: `feat(newsroom): add review queue`, `fix(article): correct EAT time display`, `docs(roadmap): update phase 1 status`.
- Use a branch per feature once the site is live; `main` = what's deployed.
- Never paste secrets, passwords or tokens into code, docs, issues or chat.
- Review AI-generated code before committing. Test it as a signed-out visitor, a Writer and an Admin.
