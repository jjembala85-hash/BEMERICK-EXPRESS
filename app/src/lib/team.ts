// People shown on /about/team. Each bio is approved by the person it describes
// before it goes live. Journalists get author pages from the newsroom instead
// (staff_profile); this list is for the people who build and run BX News.
export type TeamMember = {
  slug: string;
  name: string;
  role: string;
  photo: string; // 256 x 320 WebP in public/team
  bio: string[];
  focus: string[];
  linkedin?: string;
};

export const technologyTeam: TeamMember[] = [
  {
    slug: "jjemba-lawrence",
    name: "Jjemba Lawrence",
    role: "Lead Developer",
    photo: "/team/jjemba-lawrence.webp",
    bio: [
      "Lawrence leads the technology behind BX News: the newsroom tools our journalists write and publish with, and the fast, data-light site readers open on their phones.",
      "He studied information systems and information security at Makerere University, is affiliated with the Makerere AI Lab, and works as a systems administrator. He has mentored young people with Educate! and writes about climate change.",
    ],
    focus: ["Systems & security", "Web development", "Newsroom tools"],
    linkedin: "https://www.linkedin.com/in/jjemba-lawrence-16826b24a",
  },
  {
    slug: "ashurah-bemerick",
    name: "Ashurah Bemerick",
    role: "Assistant Developer & Designer",
    photo: "/team/ashurah-bemerick.webp",
    bio: [
      "Ashurah designs and builds what readers see on BX News, with a focus on clean, easy-to-use pages that work well on any phone.",
      "She is a multidisciplinary designer and software engineer working across UI/UX, website and graphic design. She gained hands-on industry experience at Sumic IT Solutions and is active in Uganda’s tech community.",
    ],
    focus: ["UI/UX design", "Web design", "Graphic design"],
    linkedin: "https://www.linkedin.com/in/ashurah-bemerick-a960972a2",
  },
];
