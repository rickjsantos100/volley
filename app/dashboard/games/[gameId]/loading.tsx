import { Card } from "@/components/ui/card";

function SkeletonLine({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[#dde2ea] ${className}`}
    />
  );
}

function SkeletonStatTile() {
  return (
    <div className="border-l border-white/20 pl-4 first:border-l-0 first:pl-0">
      <SkeletonLine className="h-3 w-20" />
      <SkeletonLine className="mt-3 h-5 w-24" />
    </div>
  );
}

function SkeletonListCard() {
  return (
    <Card>
      <SkeletonLine className="h-7 w-40" />
      <div className="mt-4 grid gap-3">
        {[0, 1, 2].map((index) => (
          <div
            className="flex items-center gap-3 border-b border-[#dde2ea] py-3"
            key={index}
          >
            <SkeletonLine className="h-9 w-9 shrink-0" />
            <SkeletonLine className="h-4 w-36" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function Loading() {
  return (
    <main className="min-h-screen bg-[#f5f7fa] px-4 pt-28 pb-12 text-[#101828] sm:px-6 lg:px-8">
      <section className="mx-auto grid w-full max-w-[1120px] gap-5">
        <div className="flex items-center justify-between gap-4">
          <SkeletonLine className="h-11 w-36" />
          <SkeletonLine className="h-3 w-28" />
        </div>

        <Card variant="matchSheet">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <SkeletonLine className="h-9 w-64 max-w-full" />
              <SkeletonLine className="mt-2 h-12 w-32" />
            </div>
            <SkeletonLine className="h-7 w-20" />
          </div>

          <dl className="mt-6 grid gap-3 border-t border-white/20 pt-5 sm:grid-cols-2">
            <SkeletonStatTile />
            <SkeletonStatTile />
          </dl>
        </Card>

        <Card>
          <div className="flex flex-col gap-3 sm:flex-row">
            <SkeletonLine className="h-10 w-full sm:w-36" />
            <SkeletonLine className="h-10 w-full sm:w-36" />
          </div>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <SkeletonListCard />
          <SkeletonListCard />
        </div>
      </section>
    </main>
  );
}
