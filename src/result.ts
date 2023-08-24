abstract class _Result<T, E> {
    /** 
     * # Usage
     * Converts a `_Result<T, E`> into a `Pass<T>` or a `Fail<E>`, so it can be used as a `Result<T, E>`.
     * 
     * Only should be used internally.
    */
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
     * const fn = ([arg0, arg1]: [string, boolean]) => arg1 ? arg0.length : -1;
     * 
     * assertEq(pass.map(fn), 5);
     * assert(fail.map(fn).failed());
     * ```
     * # Caveats
     * If your map produces its own Result, consider using `andThen` to avoid dealing with nested Results.
    */
    map<U>(f: (value: T) => U): Result<U, E> {
        return this.passed() ? new Pass(f(this.unwrap())) : new Fail(this.expectFail());
    };

    /**
    * # Usage
    * Returns a new `Result` that contains the return value of `f` called on the inner Fail value,
    * or a Some value if the variant was `Some`.
    * 
    * # Examples
    * ```ts
    * //Usecase is converting a `Fail` of one type into another type
    * let pass = new Pass(10);
    * let bigFail = new Fail("I'm big!");
    * let smallFail = new Fail("I'm small.");
    * 
    * const fn = (errMsg: string) => errMsg.includes("fixable") ? 10000 : 0;
    * 
    * assertEq(pass.mapErr(fn).unwrap(), 10);
    * assertEq(bigFail.mapErr(fn).expectFail(), 10000);
    * assertEq(smallFail.mapErr(fn).expectFail(), 0);
    * ```
    * 
    * # Caveats
    * If instead you want to convert an `Fail` into a `Pass`, use `orElse`.
    */
    mapErr<F>(f: (error: E) => F): Result<T, F> {
        return this.failed() ? new Fail(f(this.expectFail())) : new Pass(this.unwrap());
    };

    /**
     * # Usage
     * Returns the current `Fail` value, or creates a new `Result` by calling `f` on the inner `Pass` value.
    */
    andThen<U>(f: (value: T) => Result<U, E>): Result<U, E> {
        if (this.passed()) {
            return f(this.unwrap());
        } else {
            return new Fail(this.expectFail());
        }
    }

    /**
     * # Usage
     * Returns the current `Pass` value, or creates a new `Result` by calling `f`on the inner `Fail` value.
    */
    orElse<F>(f: (error: E) => Result<T, F>): Result<T, F> {
        if (this.failed()) {
            return f(this.expectFail());
        } else {
            return new Pass(this.unwrap());
        }
    }

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

    /** 
    * # Usage
    * Accepts a function `f` who's first argument is the current result. Meant for method chaining.
    * 
    * # Examples
    * ```ts
    * const fallible = (cond: boolean) => cond ? new Pass(10) : new Fail("nope");
    * const fallible2 = (value: number) => number > 5 ? new Pass("nice!") : new Fail(101);
    * 
    * fallible().andThen(fallible2).inspect((result) => {
    *   if (result.passed()) {
    *       console.log(`We have a value: ${result.unwrap()}`);
    *   } else {
    *       console.log(`No value, your err is ${result.expectFail()}`);  
    *   }
    * });
    * ```
    */
    inspect(f: (result: Result<T, E>) => void): Result<T, E> {
        let result = this.into();
        f(result);
        return result;
    }

    /**
     * # Usage
     * Accepts a function `f` that is only run if the inner variant is `Pass`.
     * 
     * # Examples
     * ```ts
     * let didItRun = false;
     * 
     * const fail = new Fail("nope");
     * fail.inspectPass((value) => didItRun = true);
     * assertN(didItRun);
     * 
     * const pass = new Pass(10);
     * pass.inspectPass((value) => didItRun = true);
     * assert(didItRun);
     * ```
    */
    inspectPass(f: (value: T) => void): Result<T, E> {
        if (this.passed()) {
            f(this.unwrap());
        }

        return this.into();
    }

    /** 
     * # Usage
     * Accepts a function `f` that is only run if the inner variant is `Fail`.
     * 
     * # Examples
     * ```ts
     * let didItRun = false;
     * 
     * const pass = new Pass(10);
     * pass.inspectPass((value) => didItRun = true);
     * assertN(didItRun);
     * 
     * const fail = new Fail("nope");
     * fail.inspectPass((value) => didItRun = true);
     * assert(didItRun);
     * ```
    */
    inspectFail(f: (error: E) => void): Result<T, E> {
        if (this.failed()) {
            f(this.expectFail());
        }

        return this.into();
    }

    /**
     * # Usage
     * Accepts two functions: `onPass`, which will run if the inner variant is `Pass`, and `onFail`, which will run if the inner variant is `Fail`.
     * 
     * # Examples
     * ```ts
     * const onPass = (_: any) => 6;
     * const onFail = (_: any) => 7;
     * 
     * let pass = new Pass(10);
     * let fail = new Fail("fail");
     * 
     * assertEq(pass.match(onPass, onFail), 6);
     * assertEq(fail.match(onPass, onFail), 7);
     * ```
    */
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
 * To fix this, pass it a closure that just calls your function and returns its value, as seen in the `resultifyPromise` example.
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
 * If the Promise is fulfilled, but returns a `Fail` when passed into `resultify`
 * the returned promise will also contain a `Fail`.
 * 
 * # Examples
 * ```ts
 * import { readFile } from "fs/promises";
 * 
 * const file = await resultifyPromise(readFile, "something.txt", "utf8");
 * ```
 * 
 * # Caveats
 * Like `resultify`, this function is known to wrongly infer types when given an overloadable function.
 * To fix this, pass it a closure that just calls your function and returns its value, like so:
 * ```ts
 * const withProperlyInferredTypes = await resultifyPromise(() => readFile("something.txt", "utf8"));
 * ```
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
