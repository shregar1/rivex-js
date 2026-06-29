import { describe, it, expect } from 'vitest';
import { Regex, reMatch, reFindAll, reReplace, reSplit } from '../src/regex.js';

describe('Regex utilities', () => {
  describe('Regex class', () => {
    it('tests for matches', () => {
      const re = new Regex('\\d+');
      expect(re.isMatch('hello 123')).toBe(true);
      expect(re.isMatch('no digits')).toBe(false);
    });

    it('finds first match', () => {
      const re = new Regex('\\d+');
      expect(re.find('hello 123 world 456')).toBe('123');
      expect(re.find('no digits')).toBeNull();
    });

    it('finds all matches', () => {
      const re = new Regex('\\d+');
      expect(re.findAll('a1 b2 c3')).toEqual(['1', '2', '3']);
    });

    it('replaces first match', () => {
      const re = new Regex('\\d+');
      expect(re.replace('a1 b2', 'X')).toBe('aX b2');
    });

    it('replaces all matches', () => {
      const re = new Regex('\\d+');
      expect(re.replaceAll('a1 b2 c3', 'X')).toBe('aX bX cX');
    });

    it('splits text', () => {
      const re = new Regex('[,;]\\s*');
      expect(re.split('a, b; c')).toEqual(['a', 'b', 'c']);
    });
  });

  describe('Standalone functions', () => {
    it('reMatch checks for pattern match', () => {
      expect(reMatch('[a-z]+@[a-z]+', 'user@host')).toBe(true);
      expect(reMatch('^\\d+$', 'abc')).toBe(false);
    });

    it('reFindAll returns all matches', () => {
      expect(reFindAll('\\w+', 'hello world')).toEqual(['hello', 'world']);
    });

    it('reReplace substitutes first match', () => {
      expect(reReplace('world', 'hello world', 'earth')).toBe('hello earth');
    });

    it('reSplit splits on pattern', () => {
      expect(reSplit('\\s+', 'a  b   c')).toEqual(['a', 'b', 'c']);
    });
  });
});
