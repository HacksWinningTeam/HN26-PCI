import { redirect } from "next/navigation";
import { getLegacySolveRedirect } from "@/lib/innovation-search";

/** Keep existing bookmarks and external problem-search links working. */
export default async function SolvePage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  redirect(getLegacySolveRedirect(await searchParams));
}
