abstract class _Result<T, E> {
    private into(): Result<T, E> {
        if (this.passed()) {
            return new Pass(this.unwrap());
        } else {
            return new Fail(this.expectFail());
        }
    }

    /** 
     * # Usage
     * Returns true if the Result passed, and false if it failed.
     * 
     * # Example
     * let pass = new Pass(10)
     * let fail = new Fail("Failed");
     * 
     * assert(pass.passed());
     * assertF(fail.passed());
    */
    abstract passed(): boolean;

    /** 
     * # Usage
     * Returns the `Result`'s inner passed value, or throws an `UnwrappedFailError` if the `Result` failed.
     * 
     * # Examples
     * ```ts
     * const pass = new Pass(10);
     * const fail = new Fail("L");
     * 
     * assertThrows(fail.unwrap, "Attempted to unwrap");
     * assertEq(pass.unwrap(), 10);
     * ```
    */
    abstract unwrap(): T;

    /** 
     * # Usage
     * Returns the `Result`'s inner error if it's variant is `Fail`, 
     * or throws an `ExpectedFailError` is it's variant is `Pass`.
     * 
     * # Examples
     * ```ts
     * let pass = new Pass("throw me!");
     * let fail = new Fail(10);
     * 
     * assertThrows(pass.expectFail);
     * assertEq(fail.expectFail(), 10);
     * ```
    */
    abstract expectFail(): E;

    /**
     * # Usage
     * Returns a new `Result` that contains the return value of `f` called on the inner Some value,
     * or a Fail value if the variant was `Fail`.
     * 
     * # Examples
     * ```ts
     * let pass = new Pass(["tuple", true]);
     * let fail = new Fail(10);
     * 
     * const fn = ([arg0, arg1]) => { arg1 ? arg0.length : -1 }
     * 
     * assertEq(pass.map(fn), 5);
     * assert(fail.map(fn).failed());
     * ```
     * # Caveats
     * If your map produces its own Result, consider using `flatMap` or `andThen` to avoid dealing with nested Results.
    */
    map<U>(f: (value: T) => U): Result<U, E> {
        return this.passed() ? new Pass(f(this.unwrap())) : new Fail(this.expectFail());
    };

    flatMap<U>(f: (value: T) => Result<U, E>): Result<U, E> {
        if (this.passed()) {
            return f(this.unwrap());
        } else {
            return new Fail(this.expectFail());
        }
    }

    flatMapErr<F>(f: (error: E) => Result<T, F>): Result<T, F> {
        if (this.failed()) {
            return f(this.expectFail());
        } else {
            return new Pass(this.unwrap());
        }
    }

    mapErr<F>(f: (error: E) => F): Result<T, F> {
        return this.failed() ? new Fail(f(this.expectFail())) : new Pass(this.unwrap());
    };

    /** 
     * # Usage
     * Returns true if the Result failed, and false if it passed.
     * 
     * # Example
     * let pass = new Pass(10)
     * let fail = new Fail("Failed");
     * 
     * assertF(pass.passed());
     * assert(fail.passed());
    */
    failed(): boolean {
        return !this.passed();
    };

    /** 
     * # Usage
     * Returns the inner value if the variant is `Pass`, or `undefined` if the inner variant is `Fail`.
     * 
     * # Examples
     * ```ts
     * const pass = new Pass("Passed");
     * const fail = new Fail(false);
     * 
     * assertEq(pass.nullify(), "Passed");
     * assertEq(fail.nullify(), undefined);
     * ```
    */
    nullify(): T | undefined {
        return this.passed() ? this.unwrap() : undefined;
    };
    
    andThen = this.flatMap

    orElse = this.flatMapErr

    inspect(f: (result: Result<T, E>) => void): Result<T, E> {
        let spaghet = this.into();
        f(spaghet);
        return spaghet;
    }

    match<R>(onPass: (value: T) => R, onFail: (error: E) => R): R {
        if (this.passed()) {
            return onPass(this.unwrap());
        } else {
            return onFail(this.expectFail());
        }
    }
}

export class Pass<T> extends _Result<T, never> {
    value: T;

    constructor(value: T) {
        super();
        this.value = value;
    }

    passed(): boolean {
        return true;
    }

    unwrap(): T {
        return this.value;
    }

    expectFail(): never {
        throw new ExpectFailError(this.value);
    }
}

export class Fail<E> extends _Result<never, E> {
    error: E;

    constructor(error: E) {
        super();
        this.error = error;
    } 
    
    passed(): boolean {
        return false
    }

    unwrap(): never {
        throw new UnwrappedFailError(this.error);
    }

    expectFail(): E {
        return this.error;
    }
}

export type Result<T, E> = Pass<T> | Fail<E>;

/**
 * # Usage
 * Returns the result of the given function `f` with the given arguments `...args` within a `Pass` variant,
 * or returns a `Fail` with the error thrown by the function.
 * 
 * If `f` throws a non-error value, 
 * it will be converted into a part of a `ResultifyFailError`'s `message`.
 * 
 * If `f` returns `NaN`, a `NaNError` will be thrown.
 * 
 * # Examples
 * ```ts
 * const fallibleFn = () => throw new Error("I'm fallible");
 * const infallibleFn = (n: number) => n;
 * 
 * assertEq(resultify(fallibleFn).expectErr().message, "I'm fallible");
 * assertEq(resultify(infallibleFn, 100).unwrap(), 100);
 * ```
 * # Caveats
 * `resultify` is known to wrongly infer types when given an overloadable function.
 * To fix this, pass it a closure that just calls your function and returns its value, as seen in the `resultifyPromise` example
*/
export function resultify<A extends any[], T>(f: (...args: A) => T, ...args: A): Result<T, Error> {
    try {
        const result = f(...args);

        if (Number.isNaN(result)) {
            throw new NaNError();
        } else {
            return new Pass(result);
        }
    } catch (err: any) {
        if (err instanceof Error) {
            return new Fail(err);
        } else {
            return new Fail(new ResultifyFailError(err));
        }
    }
}

/** 
 * # Usage
 * Accepts a function `f` that returns a Promise, resolves it, and turns its resolved value into a promise containing a `Result`.
 * 
 * If the Promise throws an error, this function wraps it in a `Fail` variant and returns it.
 * 
 * If the Promise is fulfilled, but its value returns a `Fail` variant when passed into `resultify`,
 * the returned promise will also contain a `Fail`.
 * 
 * # Examples
 * ```ts
 * import { readFile } from "fs/promises";
 * 
 * const file = await resultifyPromise(readFile, "something.txt", "utf8");
 * const withProperlyInferredTypes = await resultifyPromise(() => readFile("something.txt", "utf8"));
 * ```
 * 
 * # Caveats
 * Like `resultify`, this function is known to wrongly infer types when given an overloadable function.
 * To fix this, pass it a closure that just calls your function and returns its value, as shown in the example
 * 
 * 
*/
export async function resultifyPromise<A extends any[], T>(asyncFn: (...args: A) => Promise<T>, ...args: A): Promise<Result<T, Error>> {
    return asyncFn(...args)
        .then((value: T) => {
            if (resultify(() => value).failed()) {
                throw value;
            } else {
                return new Pass(value);
            }
        })
        .catch((err: Error) => {
            return resultify(() => {throw err;});
        });
}

export class UnwrappedFailError extends Error {
    override readonly name = "UnwrappedFailError";

    constructor(err: any) {
        super(`Attempted to unwrap Fail with inner error = ${err})`);
    }
}

export class ExpectFailError extends Error {
    override readonly name = "ExpectFailError";

    constructor(val: any) {
        super(`Expected variant Fail, got Pass with inner value = ${val})`);
    }
}

export class NaNError extends Error {
    constructor() {
        super();
        this.name = "NaNError";
    }
}

export class ResultifyFailError extends Error {
    override readonly name = "ResultifyFailError";

    constructor(value: any) {
        super(`Failed resultify threw non-error value: ${value}`);
    }
}
