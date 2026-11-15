// Launch sections (docs/02-product-blueprint.md §3).
// Temporary: these move to the database (editable in the newsroom) in Phase 1.
export type Section = {
  slug: string;
  name: string;
  description: string;
  /** Shown directly in the desktop menu; the rest sit under "More". */
  primary: boolean;
};

export const sections: Section[] = [
  { slug: "uganda", name: "Uganda", primary: true, description: "National news, Parliament, Kampala and the districts." },
  { slug: "politics", name: "Politics", primary: true, description: "Government, parties, elections and policy." },
  { slug: "business", name: "Business", primary: true, description: "Markets, agriculture, companies and personal finance." },
  { slug: "sports", name: "Sports", primary: true, description: "Football, athletics and Ugandan sport at home and abroad." },
  { slug: "world", name: "World", primary: true, description: "Africa and international news that matters to Uganda." },
  { slug: "opinion", name: "Opinion", primary: true, description: "Columns, editorials and letters." },
  { slug: "technology", name: "Technology", primary: false, description: "Tech, telecoms, startups and digital life." },
  { slug: "education", name: "Education", primary: false, description: "Schools, universities, exams and policy." },
  { slug: "health", name: "Health", primary: false, description: "Public health, hospitals and wellbeing." },
  { slug: "security", name: "Security", primary: false, description: "Police, defence, courts and crime." },
  { slug: "entertainment", name: "Entertainment", primary: false, description: "Music, film, culture and celebrity." },
];

export const primarySections = sections.filter((s) => s.primary);
export const moreSections = sections.filter((s) => !s.primary);

export function getSection(slug: string) {
  return sections.find((s) => s.slug === slug);
}

export const watchLinks = [
  { href: "/live", name: "Live" },
  { href: "/bulletins", name: "Bulletins" },
  { href: "/latest", name: "Latest" },
];

export const aboutLinks = [
  { href: "/about", name: "About BX" },
  { href: "/about/team", name: "Our team" },
  { href: "/contact", name: "Contact" },
  { href: "/contact/tip", name: "Send a news tip" },
  { href: "/advertise", name: "Advertise" },
];

export const policyLinks = [
  { href: "/editorial-policy", name: "Editorial policy" },
  { href: "/corrections", name: "Corrections" },
  { href: "/privacy", name: "Privacy" },
  { href: "/terms", name: "Terms" },
  { href: "/cookies", name: "Cookies" },
];
