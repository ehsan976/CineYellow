import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

/** Layout for the signed-in site: navbar on top, footer at the bottom. */
export default function MainLayout({ children }) {
  return (
    <>
      <Navbar />
      <div className="flex-1">{children}</div>
      <Footer />
    </>
  );
}
