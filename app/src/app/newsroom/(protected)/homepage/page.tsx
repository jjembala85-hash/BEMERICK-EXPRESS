import type { Metadata } from "next";
import { and, count, desc, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { article, articleTranslation, breakingAlert, homepageSlot, pushSubscription, section, sectionPin } from "@/db/schema";
import { SectionPins, type PinRow } from "@/components/newsroom/section-pins";
import { pushConfigured } from "@/lib/push";
import { requireStaff } from "@/lib/session";
import { formatEAT } from "@/lib/dates";
import { toEATInput } from "@/lib/workflow";
import { HomepageBoard, type BoardSlot } from "@/components/newsroom/homepage-board";

export const metadata: Metadata = { title: "Homepage board" };

export default async function HomepageBoardPage() {
  await requireStaff("homepage.manage");
  const db = getDb();
  const now = new Date();

  const alertSubscribers = pushConfigured() ? ((await getDb().select({ n: count() }).from(pushSubscription))[0]?.n ?? 0) : null;
  const [stories, slots, [alert], sectionRows, pins] = await Promise.all([
    db
      .select({
        id: article.id,
        headline: articleTranslation.headline,
        section: section.name,
        sectionId: section.id,
        publishedAt: article.publishedAt,
      })
      .from(article)
      .innerJoin(articleTranslation, and(eq(articleTranslation.articleId, article.id), eq(articleTranslation.lang, "en")))
      .innerJoin(section, eq(section.id, article.primarySectionId))
      .where(eq(article.status, "published"))
      .orderBy(desc(article.publishedAt))
      .limit(300),
    db
      .select({
        zone: homepageSlot.zone,
        position: homepageSlot.position,
        articleId: homepageSlot.articleId,
        overrideHeadline: homepageSlot.overrideHeadline,
        pinnedUntil: homepageSlot.pinnedUntil,
      })
      .from(homepageSlot),
    db
      .select({ text: breakingAlert.text, expiresAt: breakingAlert.expiresAt, story: articleTranslation.headline })
      .from(breakingAlert)
      .leftJoin(
        articleTranslation,
        and(eq(articleTranslation.articleId, breakingAlert.articleId), eq(articleTranslation.lang, "en")),
      )
      .where(and(isNull(breakingAlert.clearedAt), gt(breakingAlert.expiresAt, now)))
      .orderBy(desc(breakingAlert.startsAt))
      .limit(1),
    db.select({ id: section.id, name: section.name }).from(section).where(eq(section.isActive, true)).orderBy(section.sortOrder, section.name),
    db.select().from(sectionPin),
  ]);
  const pinRows: PinRow[] = sectionRows.map((sec) => {
    const pin = pins.find((p) => p.sectionId === sec.id && (!p.pinnedUntil || p.pinnedUntil > now));
    return {
      sectionId: sec.id,
      name: sec.name,
      pinnedId: pin?.articleId ?? "",
      until: pin?.pinnedUntil ? toEATInput(pin.pinnedUntil) : "",
      stories: stories.filter((st) => st.sectionId === sec.id).slice(0, 40).map((st) => ({ id: st.id, headline: st.headline })),
    };
  });

  const slotMap: Record<string, BoardSlot> = {};
  for (const s of slots) {
    // An expired pin shows as empty so the editor sees what readers see.
    if (s.pinnedUntil && s.pinnedUntil <= now) continue;
    slotMap[`${s.zone}-${s.position}`] = {
      articleId: s.articleId,
      overrideHeadline: s.overrideHeadline ?? "",
      until: s.pinnedUntil ? toEATInput(s.pinnedUntil) : "",
    };
  }

  return (
    <>
      <h1 className="font-serif text-3xl font-bold text-ink">Homepage board</h1>
      <p className="mt-1 text-slate">Choose the lead and top stories readers see first, and run the breaking banner.</p>
      {stories.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-mist p-6 text-slate">
          Publish a story first. Only published stories can be placed on the homepage.
        </p>
      ) : (
        <HomepageBoard
          stories={stories.slice(0, 100).map((s) => ({
            id: s.id,
            headline: s.headline,
            section: s.section,
            when: s.publishedAt ? formatEAT(s.publishedAt) : "",
          }))}
          slots={slotMap}
          breaking={alert ? { text: alert.text, until: formatEAT(alert.expiresAt), story: alert.story } : null}
          alertSubscribers={alertSubscribers}
        />
      )}
      {stories.length > 0 && <SectionPins rows={pinRows} />}
    </>
  );
}
