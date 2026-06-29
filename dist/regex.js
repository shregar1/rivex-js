export class Regex {
    re;
    constructor(pattern, flags = '') {
        this.re = new RegExp(pattern, flags);
    }
    isMatch(text) {
        return this.re.test(text);
    }
    find(text) {
        const m = text.match(this.re);
        return m ? m[0] : null;
    }
    findAll(text) {
        const globalRe = new RegExp(this.re.source, this.re.flags.includes('g') ? this.re.flags : this.re.flags + 'g');
        return [...text.matchAll(globalRe)].map(m => m[0]);
    }
    replace(text, replacement) {
        return text.replace(this.re, replacement);
    }
    replaceAll(text, replacement) {
        const globalRe = new RegExp(this.re.source, this.re.flags.includes('g') ? this.re.flags : this.re.flags + 'g');
        return text.replace(globalRe, replacement);
    }
    split(text) {
        return text.split(this.re);
    }
}
export function reMatch(pattern, text) {
    return new RegExp(pattern).test(text);
}
export function reFindAll(pattern, text) {
    return [...text.matchAll(new RegExp(pattern, 'g'))].map(m => m[0]);
}
export function reReplace(pattern, text, replacement) {
    return text.replace(new RegExp(pattern), replacement);
}
export function reSplit(pattern, text) {
    return text.split(new RegExp(pattern));
}
//# sourceMappingURL=regex.js.map