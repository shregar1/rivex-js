export class Regex {
  private readonly re: RegExp;

  constructor(pattern: string, flags = '') {
    this.re = new RegExp(pattern, flags);
  }

  isMatch(text: string): boolean {
    return this.re.test(text);
  }

  find(text: string): string | null {
    const m = text.match(this.re);
    return m ? m[0] : null;
  }

  findAll(text: string): string[] {
    const globalRe = new RegExp(this.re.source, this.re.flags.includes('g') ? this.re.flags : this.re.flags + 'g');
    return [...text.matchAll(globalRe)].map(m => m[0]);
  }

  replace(text: string, replacement: string): string {
    return text.replace(this.re, replacement);
  }

  replaceAll(text: string, replacement: string): string {
    const globalRe = new RegExp(this.re.source, this.re.flags.includes('g') ? this.re.flags : this.re.flags + 'g');
    return text.replace(globalRe, replacement);
  }

  split(text: string): string[] {
    return text.split(this.re);
  }
}

export function reMatch(pattern: string, text: string): boolean {
  return new RegExp(pattern).test(text);
}

export function reFindAll(pattern: string, text: string): string[] {
  return [...text.matchAll(new RegExp(pattern, 'g'))].map(m => m[0]);
}

export function reReplace(pattern: string, text: string, replacement: string): string {
  return text.replace(new RegExp(pattern), replacement);
}

export function reSplit(pattern: string, text: string): string[] {
  return text.split(new RegExp(pattern));
}
