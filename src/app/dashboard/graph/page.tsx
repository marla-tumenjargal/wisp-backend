import { redirect } from "next/navigation";

/** Legacy route → graphs home */
export default function LegacyGraphRedirect() {
  redirect("/dashboard");
}
