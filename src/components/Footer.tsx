import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-zinc-200 bg-white mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-green-500 flex items-center justify-center">
            <span className="text-white font-black text-[10px]">J</span>
          </div>
          <span>© {year} jakobpreneur Command Center</span>
        </div>
        <nav className="flex items-center gap-6">
          <Link href="/terms" className="hover:text-zinc-900 transition-colors">
            Terms of Service
          </Link>
          <Link href="/privacy" className="hover:text-zinc-900 transition-colors">
            Privacy Policy
          </Link>
          <a
            href="mailto:Jrubenstein313@gmail.com"
            className="hover:text-zinc-900 transition-colors"
          >
            Contact
          </a>
        </nav>
      </div>
    </footer>
  );
}
