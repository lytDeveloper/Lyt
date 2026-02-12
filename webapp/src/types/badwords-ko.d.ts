declare module 'badwords-ko' {
    class Filter {
        constructor();
        exists(text: string): boolean;
        clean(text: string): string;
        addWords(...words: string[]): void;
        removeWords(...words: string[]): void;
    }
    export default Filter;
}
