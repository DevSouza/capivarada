import Link from "next/link";
import { BrandMark } from "./Capybara";

export function Brand() {
  return (
    <Link href="/" prefetch={false} className="inline-flex items-center gap-2.5 rounded-lg">
      <BrandMark size={34} />
      <span className="font-display text-xl font-bold tracking-tight">Capivarada</span>
    </Link>
  );
}
