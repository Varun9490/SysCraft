import type { BlogPost, LearnerStateV1, Lesson, QuizQuestion, Track } from "@/learning/platform/types";
import { trackFoundations } from "./track-foundations";
import { trackDistributed } from "./track-distributed";
import { trackCaseStudies } from "./track-case-studies";
import { trackAi } from "./track-ai";
import { trackInference } from "./track-inference";
import { trackMath } from "./track-math";
import { trackBackend } from "./track-backend";
import { blogPosts } from "./blogs";

export const TRACKS: Track[] = [
  trackFoundations,
  trackDistributed,
  trackCaseStudies,
  trackAi,
  trackInference,
  trackMath,
  trackBackend,
];

export const BLOGS: readonly BlogPost[] = blogPosts;

export function getTrack(idOrSlug: string): Track | undefined {
  return TRACKS.find((track) => track.id === idOrSlug || track.slug === idOrSlug);
}

export function getLesson(idOrSlug: string): Lesson | undefined;
export function getLesson(trackIdOrSlug: string, lessonIdOrSlug: string): Lesson | undefined;
export function getLesson(trackOrLesson: string, lessonRef?: string): Lesson | undefined {
  if (lessonRef !== undefined) {
    const track = getTrack(trackOrLesson);
    return track?.lessons.find((lesson) => lesson.id === lessonRef || lesson.slug === lessonRef);
  }
  for (const track of TRACKS) {
    const lesson = track.lessons.find((entry) => entry.id === trackOrLesson || entry.slug === trackOrLesson);
    if (lesson) return lesson;
  }
  return undefined;
}

export function getBlog(idOrSlug: string): BlogPost | undefined {
  return BLOGS.find((blog) => blog.id === idOrSlug || blog.slug === idOrSlug);
}

export function getLessonById(id: string): Lesson | undefined {
  for (const track of TRACKS) {
    const lesson = track.lessons.find((entry) => entry.id === id);
    if (lesson) return lesson;
  }
  return undefined;
}

export const allTopicIds: string[] = Array.from(new Set([
  ...TRACKS.flatMap((track) => track.lessons.map((lesson) => lesson.id)),
  ...BLOGS.map((blog) => blog.id),
]));

/** Builds the recall bank only from lessons and blogs the learner has opened. */
export function findQuizBank(state: LearnerStateV1): QuizQuestion[] {
  const eligible = new Set([
    ...state.completedLessons,
    ...state.readBlogs,
    ...state.visitedTopics,
  ]);
  const bank: QuizQuestion[] = [];
  const seen = new Set<string>();

  const appendQuestions = (questions: readonly QuizQuestion[], topicId: string): void => {
    for (const question of questions) {
      const key = `${topicId}\u0000${question.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      bank.push(question);
    }
  };

  for (const track of TRACKS) {
    for (const lesson of track.lessons) {
      if (eligible.has(lesson.id)) appendQuestions(lesson.quiz, lesson.id);
    }
  }
  for (const blog of BLOGS) {
    if (eligible.has(blog.id)) appendQuestions(blog.quiz, blog.id);
  }
  return bank;
}
