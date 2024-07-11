/** Helps to set the progress of the progress bar
 * Progress is provided in numbers between 0 and 1.
 * It needs a start position, and end positions and the number of steps it will take to get there.
 */
export class Progress {
    #start: number; // start position
    #actual: number; // the actual position
    #end: number; // the end position
    #total: number; // the total number of steps to get there
    #step: number; // the size of the individual steps to take

    constructor(start: number, end = 1, total: number) {
        this.#start = start;
        this.#actual = start;
        this.#end = end;
        this.#total = total;
        this.#step = this.toCover / (this.#total + 1);
    }
    get actual() {
        return this.#actual;
    }
    get total() {
        return this.#total;
    }
    get end() {
        return this.#end;
    }
    get toCover() {
        return this.#end - this.#actual;
    }
    get step() {
        //return this.toCover / this.#total;
        return this.#step;
    }
    // Calculate the next step, modify and return the new progress status
    get next() {
        this.#actual += this.step;
        return this.#actual;
    }
}
