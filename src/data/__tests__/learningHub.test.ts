import { describe, expect, it } from 'vitest';
import { ACCENTS, LIBRARY_RESOURCES, TRACK_LABELS, type LibraryTrack } from '../learningHub';

const TRACKS = new Set(Object.keys(TRACK_LABELS) as LibraryTrack[]);

describe('learningHub — curated library', () => {
  it('contains exactly the sixteen canonical sources', () => {
    expect(LIBRARY_RESOURCES).toHaveLength(16);
    const hosts = LIBRARY_RESOURCES.map((r) => new URL(r.url).hostname.replace(/^www\./, ''));
    expect(hosts).toContain('takeuforward.org');
    expect(hosts).toContain('neetcode.io');
    expect(hosts).toContain('github.com');
    expect(hosts).toContain('roadmap.sh');
    expect(hosts).toContain('javascript.info');
  });

  it('has https URLs, unique ids and full teaching content per source', () => {
    const ids = new Set<string>();
    for (const resource of LIBRARY_RESOURCES) {
      expect(resource.url.startsWith('https://')).toBe(true);
      expect(ids.has(resource.id)).toBe(false);
      ids.add(resource.id);
      expect(resource.blurb.length).toBeGreaterThan(30);
      expect(resource.why.length).toBeGreaterThan(60);
      expect(resource.syllabus.length).toBeGreaterThanOrEqual(4);
      expect(resource.bestFor.length).toBeGreaterThan(3);
      expect(resource.pairWith.href.startsWith('/')).toBe(true);
      expect(ACCENTS[resource.accent]).toBeDefined();
      expect(TRACKS.has(resource.track)).toBe(true);
    }
  });
});
