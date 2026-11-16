import type { Metadata } from "next";
import { technologyTeam, type TeamMember } from "@/lib/team";

export const metadata: Metadata = {
  title: "Our team",
  description: "The people who build and run BEMERICK EXPRESS (BX News).",
};

export default function TeamPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-10">
      <header className="border-b-2 border-crane-gold pb-5">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate">
          <span className="inline-block h-3.5 w-1 bg-crane-gold" aria-hidden />
          About BX
        </p>
        <h1 className="mt-2 font-serif text-4xl font-bold leading-tight text-ink sm:text-5xl">Our team</h1>
        <p className="mt-3 max-w-2xl font-serif text-lg italic leading-relaxed text-slate sm:text-xl">
          BX News is built in Uganda by a small team that believes clear, verified news should be fast and
          affordable to read on any phone.
        </p>
      </header>

      <section aria-labelledby="tech-heading" className="mt-10">
        <h2 id="tech-heading" className="text-xs font-semibold uppercase tracking-[0.12em] text-slate">
          Technology &amp; design
        </h2>
        <ul className="mt-5 grid gap-8 sm:grid-cols-2">
          {technologyTeam.map((m) => (
            <MemberCard key={m.slug} member={m} />
          ))}
        </ul>
      </section>

      <p className="mt-12 border-t border-mist pt-6 text-sm text-slate">
        Our journalists and editors will be introduced here as the newsroom grows.
      </p>
    </div>
  );
}

function MemberCard({ member }: { member: TeamMember }) {
  return (
    <li id={member.slug} className="flex flex-col overflow-hidden rounded-lg border border-mist bg-surface">
      {/* Plain <img>: the portrait is already sized for the web (about 20–40 KB). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={member.photo}
        alt={`Portrait of ${member.name}`}
        width={640}
        height={800}
        loading="lazy"
        decoding="async"
        className="aspect-[4/5] w-full bg-mist object-cover"
      />
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-serif text-2xl font-bold text-ink">{member.name}</h3>
        <p className="mt-0.5 text-sm font-semibold uppercase tracking-[0.08em] text-lake-ink">{member.role}</p>
        <div className="mt-3 space-y-3 leading-relaxed text-ink">
          {member.bio.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </div>
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Areas of focus">
          {member.focus.map((f) => (
            <li key={f} className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-ink">{f}</li>
          ))}
        </ul>
        {member.linkedin && (
          <a
            href={member.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto self-start pt-5 text-sm font-semibold text-lake-ink hover:underline"
          >
            LinkedIn profile →
          </a>
        )}
      </div>
    </li>
  );
}
