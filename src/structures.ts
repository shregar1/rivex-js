/**
 * Data structures — Bloom filter, HyperLogLog, priority queue, sorted set, ring buffer.
 *
 * Pure Node.js implementations (no native dependencies).
 */

import { createHash } from "node:crypto";

// ── Bloom Filter ────────────────────────────────────────────────────

/**
 * A probabilistic set membership data structure.
 *
 * Supports `add` and `contains` with a configurable false positive rate.
 * No false negatives — if `contains` returns false, the item was never added.
 */
export class BloomFilter {
  private bits: Uint8Array;
  private numBits: number;
  private numHashes: number;

  /**
   * @param capacity Expected number of items
   * @param fpr Target false positive rate (default: 0.01)
   */
  constructor(capacity: number = 1000, fpr: number = 0.01) {
    // Optimal bit count: -n*ln(p) / (ln(2))^2
    this.numBits = Math.max(1, Math.ceil((-capacity * Math.log(fpr)) / (Math.LN2 * Math.LN2)));
    // Optimal hash count: (m/n) * ln(2)
    this.numHashes = Math.max(1, Math.round((this.numBits / capacity) * Math.LN2));
    this.bits = new Uint8Array(Math.ceil(this.numBits / 8));
  }

  /**
   * Add an item to the filter.
   */
  add(item: string): void {
    const hashes = this.getHashes(item);
    for (const h of hashes) {
      const idx = h % this.numBits;
      this.bits[idx >>> 3] |= 1 << (idx & 7);
    }
  }

  /**
   * Check if an item might be in the filter.
   *
   * @returns true if the item might be present (possible false positive),
   *          false if the item is definitely not present.
   */
  contains(item: string): boolean {
    const hashes = this.getHashes(item);
    for (const h of hashes) {
      const idx = h % this.numBits;
      if (!(this.bits[idx >>> 3] & (1 << (idx & 7)))) return false;
    }
    return true;
  }

  /**
   * Reset the filter, removing all items.
   */
  clear(): void {
    this.bits.fill(0);
  }

  /** Generate k hash positions using double hashing. */
  private getHashes(item: string): number[] {
    const hash = createHash("md5").update(item).digest();
    const h1 = hash.readUInt32LE(0);
    const h2 = hash.readUInt32LE(4);
    const result: number[] = [];
    for (let i = 0; i < this.numHashes; i++) {
      result.push((h1 + i * h2) >>> 0);
    }
    return result;
  }
}

// ── HyperLogLog ─────────────────────────────────────────────────────

/**
 * A probabilistic cardinality estimator.
 *
 * Uses the HyperLogLog algorithm to estimate the number of distinct
 * items added with low memory usage.
 */
export class HyperLogLog {
  private precision: number;
  private m: number; // number of registers
  private registers: Uint8Array;
  private alphaMM: number;

  /**
   * @param precision Number of bits for register indexing (4–16, default: 14)
   */
  constructor(precision: number = 14) {
    this.precision = Math.max(4, Math.min(16, precision));
    this.m = 1 << this.precision;
    this.registers = new Uint8Array(this.m);

    // Alpha constant
    if (this.m === 16) this.alphaMM = 0.673 * this.m * this.m;
    else if (this.m === 32) this.alphaMM = 0.697 * this.m * this.m;
    else if (this.m === 64) this.alphaMM = 0.709 * this.m * this.m;
    else this.alphaMM = (0.7213 / (1 + 1.079 / this.m)) * this.m * this.m;
  }

  /**
   * Add an item to the estimator.
   */
  add(item: string): void {
    const hash = this.hash(item);
    const idx = hash >>> (32 - this.precision);
    const w = hash << this.precision;
    const rho = w === 0 ? 32 - this.precision + 1 : Math.clz32(w) + 1;
    if (rho > this.registers[idx]) {
      this.registers[idx] = rho;
    }
  }

  /**
   * Estimate the number of distinct items.
   */
  count(): number {
    // Raw harmonic mean estimate
    let sum = 0;
    for (let i = 0; i < this.m; i++) {
      sum += Math.pow(2, -this.registers[i]);
    }
    let estimate = this.alphaMM / sum;

    // Small range correction
    if (estimate <= 2.5 * this.m) {
      let zeros = 0;
      for (let i = 0; i < this.m; i++) {
        if (this.registers[i] === 0) zeros++;
      }
      if (zeros > 0) {
        estimate = this.m * Math.log(this.m / zeros);
      }
    }

    return Math.round(estimate);
  }

  /**
   * Reset the estimator.
   */
  clear(): void {
    this.registers.fill(0);
  }

  /** Hash a string to a 32-bit integer. */
  private hash(item: string): number {
    const buf = createHash("md5").update(item).digest();
    return buf.readUInt32LE(0);
  }
}

// ── Priority Queue ──────────────────────────────────────────────────

interface PQItem<T> {
  priority: number;
  item: T;
}

/**
 * A min-heap priority queue.
 *
 * Items with the lowest priority value are dequeued first.
 */
export class PriorityQueue<T = any> {
  private heap: PQItem<T>[] = [];

  /**
   * Add an item with a given priority.
   *
   * @param priority Numeric priority (lower = higher priority)
   * @param item The item to enqueue
   */
  push(priority: number, item: T): void {
    this.heap.push({ priority, item });
    this.bubbleUp(this.heap.length - 1);
  }

  /**
   * Remove and return the item with the lowest priority.
   *
   * @throws Error if the queue is empty
   */
  pop(): T {
    if (this.heap.length === 0) throw new Error("PriorityQueue is empty");
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.sinkDown(0);
    }
    return top.item;
  }

  /**
   * Return the item with the lowest priority without removing it.
   *
   * @throws Error if the queue is empty
   */
  peek(): T {
    if (this.heap.length === 0) throw new Error("PriorityQueue is empty");
    return this.heap[0].item;
  }

  /** Number of items in the queue. */
  get length(): number {
    return this.heap.length;
  }

  private bubbleUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >>> 1;
      if (this.heap[i].priority >= this.heap[parent].priority) break;
      [this.heap[i], this.heap[parent]] = [this.heap[parent], this.heap[i]];
      i = parent;
    }
  }

  private sinkDown(i: number): void {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < n && this.heap[left].priority < this.heap[smallest].priority) smallest = left;
      if (right < n && this.heap[right].priority < this.heap[smallest].priority) smallest = right;
      if (smallest === i) break;
      [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
      i = smallest;
    }
  }
}

// ── Sorted Set ──────────────────────────────────────────────────────

/**
 * A Redis-style sorted set — members are unique strings, each with a numeric score.
 *
 * Members are kept sorted by score for efficient retrieval of top/bottom elements.
 */
export class SortedSet {
  private members: Map<string, number> = new Map();

  /**
   * Add or update a member with a score.
   */
  add(member: string, score: number): void {
    this.members.set(member, score);
  }

  /**
   * Remove a member from the set.
   *
   * @returns true if the member existed and was removed
   */
  remove(member: string): boolean {
    return this.members.delete(member);
  }

  /**
   * Get the score of a member.
   *
   * @returns The score, or undefined if the member is not in the set
   */
  score(member: string): number | undefined {
    return this.members.get(member);
  }

  /**
   * Get the top n members with the highest scores.
   *
   * @returns Array of [member, score] tuples, sorted by score descending
   */
  top(n: number): [string, number][] {
    return this.sortedEntries().slice(-n).reverse();
  }

  /**
   * Get the bottom n members with the lowest scores.
   *
   * @returns Array of [member, score] tuples, sorted by score ascending
   */
  bottom(n: number): [string, number][] {
    return this.sortedEntries().slice(0, n);
  }

  /** Number of members in the set. */
  get size(): number {
    return this.members.size;
  }

  private sortedEntries(): [string, number][] {
    return [...this.members.entries()].sort((a, b) => a[1] - b[1]);
  }
}

// ── Ring Buffer ──────────────────────────────────────────────────────

/**
 * A fixed-capacity circular buffer.
 *
 * When the buffer is full, new items overwrite the oldest items.
 */
export class RingBuffer<T = any> {
  private buffer: (T | undefined)[];
  private capacity_: number;
  private head: number = 0;
  private size_: number = 0;

  /**
   * @param capacity Maximum number of items the buffer can hold
   */
  constructor(capacity: number) {
    if (capacity < 1) throw new Error("RingBuffer capacity must be at least 1");
    this.capacity_ = capacity;
    this.buffer = new Array(capacity);
  }

  /**
   * Push an item into the buffer. If full, the oldest item is overwritten.
   */
  push(item: T): void {
    const idx = (this.head + this.size_) % this.capacity_;
    if (this.size_ < this.capacity_) {
      this.buffer[idx] = item;
      this.size_++;
    } else {
      this.buffer[this.head] = item;
      this.head = (this.head + 1) % this.capacity_;
    }
  }

  /**
   * Get all items in insertion order (oldest first).
   */
  items(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this.size_; i++) {
      result.push(this.buffer[(this.head + i) % this.capacity_] as T);
    }
    return result;
  }

  /**
   * Get the n most recently added items (newest last).
   */
  latest(n: number): T[] {
    const count = Math.min(n, this.size_);
    const result: T[] = [];
    for (let i = this.size_ - count; i < this.size_; i++) {
      result.push(this.buffer[(this.head + i) % this.capacity_] as T);
    }
    return result;
  }

  /** Number of items currently in the buffer. */
  get length(): number {
    return this.size_;
  }
}
