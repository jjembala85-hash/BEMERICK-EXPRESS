# BEMERICK EXPRESS · BX News

**A professional, Uganda-focused digital news publication.**
Text-first journalism with photo-led stories, YouTube-linked live streams and bulletins, built mobile-first for readers on limited data.

> Working tagline (draft): *News. Insight. Impact.*

This repository holds the **project documents, brand assets and (later) the application source code**. The documents are living. Edit them through pull requests or direct commits, and record every decision in the decisions log.

---

## Document set

| # | Document | What it answers |
|---|----------|-----------------|
| 00 | [Decisions Log](docs/00-decisions-log.md) | What has been agreed, when, and what is still open |
| 01 | [Brand & Editorial Identity](docs/01-brand-identity.md) | Name, logo, colours, fonts, social templates, breaking banner, editorial voice |
| 02 | [Product Blueprint](docs/02-product-blueprint.md) | Audience, features, sitemap, navigation map, URLs, wireframes, channels, revenue, compliance-by-design |
| 03 | [Technical Architecture & Hosting](docs/03-technical-architecture.md) | $0 stack, hosting, database, statuses, roles, security, costs |
| 04 | [Roadmap](docs/04-roadmap.md) | Phases, weeks, milestones, definitions of done, risks |
| 05 | [Development Walkthrough](docs/05-development-walkthrough.md) | Step-by-step build guide from empty folder to first published story |

Brand files live in [`brand/`](brand/README.md).
The original v0 Word documents are kept for reference in [`docs/archive/`](docs/archive/).

## Folder layout

```
BEMERICK EXPRESS/
├── README.md               ← you are here
├── docs/                   ← planning documents (Markdown, rendered by GitHub)
│   └── archive/            ← original v0 .docx files
├── brand/                  ← logo, favicon, social templates, breaking banner (SVG)
└── app/                    ← (Phase 0+) the Next.js application will be created here
```

## How we work on these documents

1. Change a document → commit with a clear message, e.g. `docs(blueprint): add live page wireframe`.
2. Any decision that changes direction → add a row to the [Decisions Log](docs/00-decisions-log.md).
3. Weekly review (Sunday): update the status tables in the [Roadmap](docs/04-roadmap.md).
