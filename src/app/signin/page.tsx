import type { Metadata } from "next";
import { RedirectTo } from "@/components/nav/RedirectTo";

export const metadata: Metadata = {
  title: "Sign-in removed",
  description: "SysCraft does not use accounts. Progress stays in your browser.",
};

export default function SignInPage() {
  return <RedirectTo href="/" name="home" />;
}
