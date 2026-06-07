import Link from "next/link";

export function GlobalDashboardLink() {
  return (
    <Link
      href="/dashboard"
      className="fixed top-4 left-1/2 z-50 -translate-x-1/2 text-lg font-semibold tracking-[-0.01em] text-[#006241] transition hover:text-[#00754A] active:scale-95 sm:top-6 sm:text-xl"
    >
      Voley Lisboa
    </Link>
  );
}
