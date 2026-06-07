"use client";

type LeaveGameFormProps = {
  action: () => void;
  confirmMessage: string;
  label: string;
};

export function LeaveGameForm({
  action,
  confirmMessage,
  label,
}: LeaveGameFormProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <button className="w-full rounded-full border border-[#c82014] bg-white px-5 py-3 text-sm font-semibold text-[#c82014] transition hover:bg-[hsl(4_82%_43%_/_5%)] active:scale-95 sm:w-auto">
        {label}
      </button>
    </form>
  );
}
