import { describe, it, expect } from 'vitest';
import {
  slugify,
  escapeHtml,
  unescapeHtml,
  stripHtml,
  truncate,
  camelToSnake,
  snakeToCamel,
} from '../src/text.js';

describe('Text utilities', () => {
  describe('slugify', () => {
    it('converts text to URL-safe slug', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('handles special characters', () => {
      expect(slugify('Hello, World! How are you?')).toBe('hello-world-how-are-you');
    });

    it('supports custom separator', () => {
      expect(slugify('Hello World', '_')).toBe('hello_world');
    });

    it('trims leading/trailing separators', () => {
      expect(slugify('  hello world  ')).toBe('hello-world');
    });

    it('handles empty string', () => {
      expect(slugify('')).toBe('');
    });

    it('handles unicode characters', () => {
      expect(slugify('café résumé')).toBe('cafe-resume');
    });

    it('collapses multiple separators', () => {
      expect(slugify('hello---world')).toBe('hello-world');
    });
  });

  describe('escapeHtml', () => {
    it('escapes HTML special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });

    it('escapes ampersands', () => {
      expect(escapeHtml('a & b')).toBe('a &amp; b');
    });

    it('escapes single quotes', () => {
      expect(escapeHtml("it's")).toBe('it&#x27;s');
    });

    it('returns empty string unchanged', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('does not double-escape', () => {
      expect(escapeHtml('&amp;')).toBe('&amp;amp;');
    });
  });

  describe('unescapeHtml', () => {
    it('unescapes HTML entities', () => {
      expect(unescapeHtml('&lt;b&gt;bold&lt;/b&gt;')).toBe('<b>bold</b>');
    });

    it('unescapes ampersands', () => {
      expect(unescapeHtml('a &amp; b')).toBe('a & b');
    });

    it('roundtrips with escapeHtml', () => {
      const original = '<div class="test">Hello & World</div>';
      expect(unescapeHtml(escapeHtml(original))).toBe(original);
    });
  });

  describe('stripHtml', () => {
    it('removes HTML tags', () => {
      expect(stripHtml('<p>Hello <b>World</b></p>')).toBe('Hello World');
    });

    it('handles self-closing tags', () => {
      expect(stripHtml('line1<br/>line2')).toBe('line1line2');
    });

    it('returns plain text unchanged', () => {
      expect(stripHtml('no tags here')).toBe('no tags here');
    });
  });

  describe('truncate', () => {
    it('truncates long text with ellipsis', () => {
      expect(truncate('Hello, World!', 10)).toBe('Hello, ...');
    });

    it('returns short text unchanged', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
    });

    it('supports custom suffix', () => {
      expect(truncate('Hello, World!', 10, '…')).toBe('Hello, Wo…');
    });

    it('handles exact length', () => {
      expect(truncate('Hello', 5)).toBe('Hello');
    });
  });

  describe('camelToSnake', () => {
    it('converts camelCase to snake_case', () => {
      expect(camelToSnake('helloWorld')).toBe('hello_world');
    });

    it('handles multiple capitals', () => {
      expect(camelToSnake('myHTTPClient')).toBe('my_h_t_t_p_client');
    });

    it('handles single word', () => {
      expect(camelToSnake('hello')).toBe('hello');
    });
  });

  describe('snakeToCamel', () => {
    it('converts snake_case to camelCase', () => {
      expect(snakeToCamel('hello_world')).toBe('helloWorld');
    });

    it('handles multiple underscores', () => {
      expect(snakeToCamel('my_http_client')).toBe('myHttpClient');
    });

    it('handles single word', () => {
      expect(snakeToCamel('hello')).toBe('hello');
    });
  });
});
