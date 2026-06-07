import { LanguageToggle } from "@/components/language-toggle";

export function GlobalLanguageToggle() {
  return (
    <div className="fixed top-4 right-4 z-50 sm:top-6 sm:right-6">
      <LanguageToggle />
    </div>
  );
}
