import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/server";

export default async function ProfilePage() {
  await requireUser();
  redirect("/dashboard");
}
