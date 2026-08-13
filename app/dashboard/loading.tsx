import { Card } from "@/components/ui/card";

function SkeletonLine({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[#dde2ea] ${className}`}
    />
  );
}

function SkeletonMatchStat() {
  return (
    <div>
      <SkeletonLine className="h-3 w-20" />
      <SkeletonLine className="mt-3 h-5 w-24" />
    </div>
  );
}

function SkeletonGameCard() {
  return (
    <Card className="border-l-4 border-l-[#138a5b]">
      <div className="flex items-start justify-between gap-4">
        <SkeletonLine className="h-7 w-44 max-w-full" />
        <SkeletonLine className="h-7 w-20" />
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-4">
        <SkeletonMatchStat />
        <SkeletonMatchStat />
      </dl>
    </Card>
  );
}

export default function Loading() {
  return (
    <main className="min-h-screen bg-[#f5f7fa] px-4 pt-24 pb-32 text-[#101828] sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-[1120px]">
        <section aria-hidden="true">
          <SkeletonLine className="mb-3 h-9 w-44" />
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1, 2, 3].map((index) => (
              <SkeletonGameCard key={index} />
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
