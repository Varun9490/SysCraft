import { describe, expect, it } from "vitest";
import { PATH_PARTS } from "@/data/pathData";
import { getLessonBlog, getAllLessonBlogsForModule, evaluateLessonSandbox } from "@/data/lessonBlogs";
import { SEED_RESOURCE_MAP } from "@/data/seedResources";

describe("lessonBlogs coverage", () => {
  it("resolves a blog for every module and lesson", () => {
    for (const part of PATH_PARTS) {
      for (const module of part.modules) {
        const blogs = getAllLessonBlogsForModule(module.id);
        expect(blogs.length).toBe(module.lessonTitles.length);
        for (let i = 0; i < module.lessonTitles.length; i++) {
          const blog = getLessonBlog(module.id, i);
          expect(blog.moduleId).toBe(module.id);
          expect(blog.lessonIndex).toBe(i);
          expect(blog.title).toBe(module.lessonTitles[i]);
        }
      }
    }
  });

  it("each blog has three stages and at least three flow nodes", () => {
    for (const part of PATH_PARTS) {
      for (const module of part.modules) {
        for (let i = 0; i < module.lessonTitles.length; i++) {
          const blog = getLessonBlog(module.id, i);
          expect(blog.steps).toHaveLength(3);
          expect(blog.diagramFlow.length).toBeGreaterThanOrEqual(3);
          for (const step of blog.steps) {
            expect(step.heading.length).toBeGreaterThan(0);
            expect(step.body.length).toBeGreaterThan(0);
            expect(step.takeaway.length).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it("canvasPrimitives resolve to seeded resources", () => {
    for (const part of PATH_PARTS) {
      for (const module of part.modules) {
        for (let i = 0; i < module.lessonTitles.length; i++) {
          const blog = getLessonBlog(module.id, i);
          expect(blog.sandbox.canvasPrimitives.length).toBeGreaterThan(0);
          for (const primitive of blog.sandbox.canvasPrimitives) {
            expect(SEED_RESOURCE_MAP[primitive], `${blog.id} -> ${primitive}`).toBeTruthy();
          }
        }
      }
    }
  });

  it("evaluateLessonSandbox is deterministic", () => {
    const part = PATH_PARTS[0];
    const module = part.modules[0];
    const blog = getLessonBlog(module.id, 0);
    const first = evaluateLessonSandbox(blog.sandbox, blog.sandbox.defaultValue);
    const second = evaluateLessonSandbox(blog.sandbox, blog.sandbox.defaultValue);
    expect(second).toEqual(first);
    const statusValues = ["healthy", "warning", "critical"];
    expect(statusValues).toContain(first.status);
  });
});
