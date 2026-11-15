import { SiteChrome } from "@/components/site-chrome";
import { SiteFooter } from "@/components/site-footer";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <SiteChrome footer={<SiteFooter />}>{children}</SiteChrome>;
}
