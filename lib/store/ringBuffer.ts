/**
 * Fixed-capacity ring buffer. Bounded memory is the whole point: with ~170
 * pairs polled every 5s, an unbounded array would be ~1.2M samples/day.
 */
export class RingBuffer<T> {
    private readonly items: (T | undefined)[];
    private head = 0;
    private _size = 0;
    constructor(readonly capacity: number) {
      this.items = new Array<T | undefined>(capacity);
    }
    get size(): number { return this._size; }
    push(item: T): void {
      this.items[this.head] = item;
      this.head = (this.head + 1) % this.capacity;
      if (this._size < this.capacity) this._size++;
    }
    /** Oldest-first snapshot. Allocates — call from charts, never from useFrame. */
    toArray(): T[] {
      const out: T[] = new Array(this._size);
      const start = (this.head - this._size + this.capacity) % this.capacity;
      for (let i = 0; i < this._size; i++) {
        out[i] = this.items[(start + i) % this.capacity] as T;
      }
      return out;
    }
    last(): T | undefined {
      if (this._size === 0) return undefined;
      return this.items[(this.head - 1 + this.capacity) % this.capacity];
    }
    clear(): void { this.head = 0; this._size = 0; this.items.fill(undefined); }
  }