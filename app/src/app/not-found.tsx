import { SiteChrome } from "@/components/site-chrome";
import { SiteFooter } from "@/components/site-footer";
import { NotFoundContent } from "@/components/not-found-content";

// For addresses that match no route at all: no layout wraps this, so it
// brings its own header, sidebar and footer.
export default function NotFound() {
  return (
    <SiteChrome footer={<SiteFooter />}>
      <NotFoundContent />
    </SiteChrome>
  );
}
