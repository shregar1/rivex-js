/**
 * Data structures — Bloom filter, HyperLogLog, priority queue, sorted set, ring buffer.
 *
 * Pure Node.js implementations (no native dependencies).
 */
/**
 * A probabilistic set membership data structure.
 *
 * Supports `add` and `contains` with a configurable false positive rate.
 * No false negatives — if `contains` returns false, the item was never added.
 */
export declare class BloomFilter {
    private bits;
    private numBits;
    private numHashes;
    /**
     * @param capacity Expected number of items
     * @param fpr Target false positive rate (default: 0.01)
     */
    constructor(capacity?: number, fpr?: number);
    /**
     * Add an item to the filter.
     */
    add(item: string): void;
    /**
     * Check if an item might be in the filter.
     *
     * @returns true if the item might be present (possible false positive),
     *          false if the item is definitely not present.
     */
    contains(item: string): boolean;
    /**
     * Reset the filter, removing all items.
     */
    clear(): void;
    /** Generate k hash positions using double hashing. */
    private getHashes;
}
/**
 * A probabilistic cardinality estimator.
 *
 * Uses the HyperLogLog algorithm to estimate the number of distinct
 * items added with low memory usage.
 */
export declare class HyperLogLog {
    private precision;
    private m;
    private registers;
    private alphaMM;
    /**
     * @param precision Number of bits for register indexing (4–16, default: 14)
     */
    constructor(precision?: number);
    /**
     * Add an item to the estimator.
     */
    add(item: string): void;
    /**
     * Estimate the number of distinct items.
     */
    count(): number;
    /**
     * Reset the estimator.
     */
    clear(): void;
    /** Hash a string to a 32-bit integer. */
    private hash;
}
/**
 * A min-heap priority queue.
 *
 * Items with the lowest priority value are dequeued first.
 */
export declare class PriorityQueue<T = any> {
    private heap;
    /**
     * Add an item with a given priority.
     *
     * @param priority Numeric priority (lower = higher priority)
     * @param item The item to enqueue
     */
    push(priority: number, item: T): void;
    /**
     * Remove and return the item with the lowest priority.
     *
     * @throws Error if the queue is empty
     */
    pop(): T;
    /**
     * Return the item with the lowest priority without removing it.
     *
     * @throws Error if the queue is empty
     */
    peek(): T;
    /** Number of items in the queue. */
    get length(): number;
    private bubbleUp;
    private sinkDown;
}
/**
 * A Redis-style sorted set — members are unique strings, each with a numeric score.
 *
 * Members are kept sorted by score for efficient retrieval of top/bottom elements.
 */
export declare class SortedSet {
    private members;
    /**
     * Add or update a member with a score.
     */
    add(member: string, score: number): void;
    /**
     * Remove a member from the set.
     *
     * @returns true if the member existed and was removed
     */
    remove(member: string): boolean;
    /**
     * Get the score of a member.
     *
     * @returns The score, or undefined if the member is not in the set
     */
    score(member: string): number | undefined;
    /**
     * Get the top n members with the highest scores.
     *
     * @returns Array of [member, score] tuples, sorted by score descending
     */
    top(n: number): [string, number][];
    /**
     * Get the bottom n members with the lowest scores.
     *
     * @returns Array of [member, score] tuples, sorted by score ascending
     */
    bottom(n: number): [string, number][];
    /** Number of members in the set. */
    get size(): number;
    private sortedEntries;
}
/**
 * A fixed-capacity circular buffer.
 *
 * When the buffer is full, new items overwrite the oldest items.
 */
export declare class RingBuffer<T = any> {
    private buffer;
    private capacity_;
    private head;
    private size_;
    /**
     * @param capacity Maximum number of items the buffer can hold
     */
    constructor(capacity: number);
    /**
     * Push an item into the buffer. If full, the oldest item is overwritten.
     */
    push(item: T): void;
    /**
     * Get all items in insertion order (oldest first).
     */
    items(): T[];
    /**
     * Get the n most recently added items (newest last).
     */
    latest(n: number): T[];
    /** Number of items currently in the buffer. */
    get length(): number;
}
//# sourceMappingURL=structures.d.ts.map