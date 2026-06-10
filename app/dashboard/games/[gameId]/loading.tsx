import { Card } from "@/components/ui/card";

function SkeletonLine({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-full bg-[rgba(0,0,0,0.08)] ${className}`}
    />
  );
}

function SkeletonStatTile() {
  return (
    <div className="rounded-xl bg-[#f9f9f9] px-4 py-3">
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
            className="flex items-center gap-3 rounded-xl bg-[#f9f9f9] px-4 py-3"
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
    <main className="min-h-screen bg-[#f2f0eb] px-4 py-20 text-[rgba(0,0,0,0.87)] sm:px-6 lg:px-10">
      <section className="mx-auto grid w-full max-w-5xl gap-5">
        <Card>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <SkeletonLine className="h-8 w-64 max-w-full" />
            <SkeletonLine className="h-7 w-20" />
          </div>

          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
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
