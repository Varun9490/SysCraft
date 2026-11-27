import type { Metadata } from "next";
import { RedirectTo } from "@/components/nav/RedirectTo";

export const metadata: Metadata = {
  title: "Sign-up removed",
  description: "SysCraft does not use accounts. Progress stays in your browser.",
};

export default function SignUpPage() {
  return <RedirectTo href="/" name="home" />;
}
