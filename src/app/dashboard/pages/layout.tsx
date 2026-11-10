import "@/components/pages/pages.css";

export default function PagesLayout({ children }: { children: React.ReactNode }) {
  return <div className="pages-ui">{children}</div>;
}
