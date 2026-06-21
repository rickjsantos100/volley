type StatTileProps = {
  label: string;
  value: string;
};

export function StatTile({ label, value }: StatTileProps) {
  return (
    <div className="border-l border-[#dde2ea] pl-4 first:border-l-0 first:pl-0">
      <dt className="text-xs font-bold tracking-[0.08em] text-[#667085] uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-base font-semibold text-[#101828]">{value}</dd>
    </div>
  );
}
