type StatTileProps = {
  label: string;
  value: string;
};

export function StatTile({ label, value }: StatTileProps) {
  return (
    <div className="rounded-xl bg-[#f9f9f9] px-4 py-3">
      <dt className="text-xs font-semibold tracking-[0.1em] text-[rgba(0,0,0,0.58)] uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-base font-semibold text-[#33433d]">{value}</dd>
    </div>
  );
}
