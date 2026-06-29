export declare class Regex {
    private readonly re;
    constructor(pattern: string, flags?: string);
    isMatch(text: string): boolean;
    find(text: string): string | null;
    findAll(text: string): string[];
    replace(text: string, replacement: string): string;
    replaceAll(text: string, replacement: string): string;
    split(text: string): string[];
}
export declare function reMatch(pattern: string, text: string): boolean;
export declare function reFindAll(pattern: string, text: string): string[];
export declare function reReplace(pattern: string, text: string, replacement: string): string;
export declare function reSplit(pattern: string, text: string): string[];
//# sourceMappingURL=regex.d.ts.map