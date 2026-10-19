import Link from "next/link";
import { SiteChrome } from "@/components/nav/SiteChrome";
import { PracticeRunner } from "@/components/practice/PracticeRunner";

export const metadata = {
  title: "Practice — spaced review",
  description:
    "Your FSRS spaced-repetition queue: quiz items and flashcards from every SysCraft concept module, scheduled at 90% desired retention with a daily cap and catch-up mode.",
};

export default function PracticePage() {
  return (
    <SiteChrome>
      <div className="section-container py-10">
        <PracticeRunner />
        <p className="mx-auto mt-8 max-w-4xl text-[12px] leading-relaxed text-zinc-600">
          Review scheduling runs entirely on-device with the FSRS-4.5 algorithm. Your answers, grades, and history never leave this
          browser. See the{" "}
          <Link href="/settings" className="text-sky-400 hover:text-sky-300">
            settings page
          </Link>{" "}
          for the daily cap, catch-up mode, and data export.
        </p>
      </div>
    </SiteChrome>
  );
}
