# 04 · Roadmap

> **Assumption:** about 15–20 development hours per week (one developer, with AI assistance). Durations scale with available time. Update the status column at every Sunday review.
> **Status key:** ⬜ Not started · 🟦 In progress · ✅ Done (verified) · ⛔ Blocked

---

## Overview

```mermaid
gantt
    title BX News: build plan (indicative)
    dateFormat  YYYY-MM-DD
    axisFormat  %d %b
    section Foundation
    Phase 0 Foundations & hosting spike     :p0, 2026-11-16, 7d
    section Core
    Phase 1 Database, auth, newsroom shell   :p1, after p0, 14d
    Phase 2 Public site core                 :p2, after p1, 14d
    Milestone 1 First story live             :milestone, m1, after p2, 0d
    section Newsroom
    Phase 3 Editorial workflow & curation    :p3, after p2, 14d
    Phase 4 Live, bulletins, share kit       :p4, after p3, 7d
    section Launch
    Phase 5 Launch readiness                 :p5, after p4, 14d
    Milestone 2 Public launch                :milestone, m2, after p5, 0d
    section Growth
    Phase 6 Revenue & engagement             :p6, after p5, 30d
    Phase 7 Luganda & Swahili                :p7, after p6, 30d
```

| Phase | Weeks | Outcome |
|-------|-------|---------|
| 0. Foundations & hosting spike | 1 | Accounts, repo, domain, hosting decision proven |
| 1. Database, auth, newsroom shell | 2–3 | Staff can log in; schema live |
| 2. Public site core | 4–5 | **Milestone 1: first story live** |
| 3. Editorial workflow & curation | 6–7 | Review flow, homepage board, breaking, media, corrections |
| 4. Live, bulletins, share kit | 8 | YouTube live/bulletins; social share kit |
| 5. Launch readiness | 9–10 | Policies, SEO, performance, security, backups. **Milestone 2: public launch** |
| 6. Revenue & engagement | 11–14 | AdSense application, direct ads, newsletter, web push |
| 7. Languages | 15+ | Luganda, then Swahili |
| 8. Later | — | Payments/memberships, live blogs, apps, comments review |

---

## Phase 0 · Foundations & hosting spike (week 1)

| # | Task | Status |
|---|------|--------|
| 0.1 | Confirm Node.js LTS, Git, VS Code installed | ✅ Node v24, Git 2.55 confirmed 15 Nov |
| 0.2 | Push this document repo to GitHub | ✅ 15 Nov |
| 0.3 | Check domain availability; buy `bemerickexpress.com` (Cloudflare Registrar) | ⬜ Postponed (D-021) |
| 0.4 | Reserve `bxnews` handles: WhatsApp Channel, TikTok, X, YouTube, Facebook, Instagram | 🟦 WhatsApp Channel created 15 Nov and linked in the footer; others pending |
| 0.5 | Create free accounts: Cloudflare, Neon, Resend, Sentry | 🟦 Cloudflare and Neon connected 15 Nov; Resend and Sentry later |
| 0.6 | Create Next.js app in `app/` with OpenNext Cloudflare | ✅ 15 Nov (Next.js 16.4; builds for Workers; brand colours and fonts applied) |
| 0.7 | **Spike:** deploy skeleton (home + article from Neon + login) to Workers free plan; record results | ✅ 15 Nov: live at `bemerick-express.bemerick-express.workers.dev`. Bundle 1.88 MB compressed (limit 3 MB); dashboard reads from Neon `main`; real sign-ins succeed, no CPU-limit errors |
| 0.8 | Record hosting decision (D-008) in Decisions Log | ✅ 15 Nov (D-024) |

**Done when:** a page that reads from Neon is live on a `workers.dev` URL, and the hosting decision is recorded.

## Phase 1 · Database, auth, newsroom shell (weeks 2–3)

| # | Task | Status |
|---|------|--------|
| 1.1 | Drizzle schema + first migration: staff_profile, section, tag, article, article_translation, article_author, article_tag, media, audit_log | ✅ 15 Nov (13 tables, migration `0000`, applied to `dev` and `main`) |
| 1.2 | Better Auth: email+password, sign-up disabled, admin plugin, roles Admin/Editor/Writer | ✅ 15 Nov |
| 1.3 | First-admin setup script | ✅ 15 Nov (`npm run create-admin` and one-time `/newsroom/setup` page) |
| 1.4 | `/newsroom` layout with server-side session + role check | ✅ 15 Nov |
| 1.5 | `can(user, permission)` helper + tests | 🟦 Helper built; automated tests still to write |
| 1.6 | Seed sections | ✅ 15 Nov (`npm run db:seed`, on `dev` and `main`) |
| 1.7 | Brand tokens + fonts in Tailwind config | ✅ 15 Nov |

**Done when:** Admin logs in; a signed-out visitor is redirected away from `/newsroom`; a Writer cannot open staff settings.

## Phase 2 · Public site core (weeks 4–5)

| # | Task | Status |
|---|------|--------|
| 2.1 | Global layout: header, swipe strip, footer, dark mode | ✅ 15 Nov (collapsible sidebar, D-023) |
| 2.2 | Basic story editor (headline, standfirst, Tiptap body, section, lead photo upload to R2) | 🟦 Text editing done 15 Nov; lead photo upload to R2 still to build |
| 2.3 | Publish / unpublish (admin) | ✅ 15 Nov |
| 2.4 | Article page (byline, times, photo + credit, body, related) | 🟦 Byline, times, body, share links done; photo + credit and related stories still to build |
| 2.5 | Homepage (latest-based) + section pages | ✅ 15 Nov |
| 2.6 | Caching + on-publish revalidation | ⬜ Pages read the database on every visit for now; needs the R2 cache |
| 2.7 | Favicon, manifest, page titles `Headline · BEMERICK EXPRESS` | 🟦 Tab icon and titles done; web app manifest still to add |

### 🏁 Milestone 1 · First story live
Admin signs in → writes a story with a photo → publishes → it appears on the homepage, its section page and its own URL → a signed-out visitor reads it on a phone → drafts are not reachable by URL.

## Phase 3 · Editorial workflow & curation (weeks 6–7)

Review states and transitions (Architecture §6) · review queue · editorial notes · scheduling (cron) · revision history · corrections · legal hold + pre-publish checklist · **homepage board (Lead + Top Stories)** · breaking banner control · media library with required credit/alt · staff invites · author pages · tags/topic pages · audit log viewer · 2FA for Admin/Editor.

**Done when:** Writer submits → Editor requests changes → Writer resubmits → Editor approves and schedules → story auto-publishes → Editor places it as Lead → breaking banner shows and auto-expires.

## Phase 4 · Live, bulletins, share kit (week 8)

`/live` page + site-wide LIVE pill · `/bulletins` page (YouTube, click-to-load) · auto-generated share images (1200×630, 1080×1080, 1080×1920) · share kit with WhatsApp/X/TikTok text · WhatsApp Channel follow prompts.

## Phase 5 · Launch readiness (weeks 9–10)

| Area | Tasks |
|------|-------|
| Content | 30+ stories published before announcement; About, Team, Contact, Tip, Advertise pages |
| Policies | Editorial, Corrections, Privacy, Terms, Cookies, reviewed by a media lawyer if possible |
| SEO | Sitemaps, Google News sitemap, RSS, structured data, Search Console, Bing, Google News Publisher Center |
| Performance | Meet budgets (Architecture §4) on a real mid-range Android over 4G |
| Accessibility | Contrast, keyboard, alt text, reduced motion |
| Security | Role tests with 4 account types + signed-out; secrets audit; WAF/rate limits |
| Ops | Nightly backup + **tested restore**, Sentry, uptime monitor, incident contact list |
| Domain | Custom domain live, `www` redirect, email routing (`news@`, `tips@`, `ads@`) |

### 🚀 Milestone 2 · Public launch
Announce on WhatsApp Channel, TikTok and X.

## Phase 6 · Revenue & engagement (weeks 11–14)

Consent banner → AdSense application · direct ad slots + `/advertise` rate card · newsletter (double opt-in, morning briefing) · web push for breaking (opt-in) · most-read widget · Data Protection Office registration before collecting subscriber data.

## Phase 7 · Languages (week 15+)

Translation workflow in newsroom → `/lg` routes → Luganda launch with human-reviewed translations → Swahili.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| App bundle exceeds the Workers free 3 MB limit (2.14 MB on 15 Nov, growing with each feature) | **High** | Medium | Track size at every deploy; trim dependencies; fallback Workers Paid (~$5/mo) |
| Free-tier limits change | Medium | Medium | Verify limits; cost path ready (Architecture §11) |
| Single developer / limited hours | High | High | Strict scope; Milestone 1 before anything else |
| Not enough content at launch | Medium | High | Start writing in Phase 3; 30-story buffer |
| Defamation / legal complaint | Low–Med | High | Checklist, legal hold, corrections, revision history |
| Account takeover of staff login | Low | High | 2FA, rate limits, audit log, no public sign-up |
| Data loss | Low | High | Nightly backups + monthly restore test |
| Name/domain taken | Low | High | Check and buy domain in Phase 0 |

---

## Weekly review (Sundays, 7:30 PM EAT)

Each review: (1) what was completed (verified, not assumed); (2) what's in progress; (3) blockers; (4) decisions needed → Decisions Log; (5) next 1–3 actions. Update the status columns above.
