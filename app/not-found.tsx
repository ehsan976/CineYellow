import { NotFoundContent } from "@/components/common/not-found-content";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";

export const metadata = { title: "Page not found" };

// Unknown URLs land here, outside the (main) group, so it adds the navbar and footer itself.
// notFound() from pages inside (main) uses app/(main)/not-found.jsx instead.
export default function NotFound() {
  return (
    <>
      <Navbar />
      <NotFoundContent />
      <Footer />
    </>
  );
}
