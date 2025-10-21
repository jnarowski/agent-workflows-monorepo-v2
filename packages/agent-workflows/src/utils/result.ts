export type Ok<T> = {
  ok: true;
  data: T;
};

export type Err<E> = {
  ok: false;
  error: E;
};

export type Result<T, E> = Ok<T> | Err<E>;

export type ResultPaginated<T, E> = Result<T[], E> & {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export const ok = <T, E>(data: T): Result<T, E> => ({
  ok: true,
  data,
});

export const err = <T, E>(error: E): Result<T, E> => ({
  ok: false,
  error,
});

export const fail = <T>(error: unknown): Result<T, Error> => ({
  ok: false,
  error: error instanceof Error ? error : new Error(String(error)),
});

/**
 * Unwraps a Result, returning the data if Ok or throwing if Err.
 * Useful when you want fail-fast behavior with Result types.
 *
 * @throws Error containing the error message if Result is Err
 * @example
 * const data = unwrap(await workflow.load(config));
 * // Equivalent to:
 * // const result = await workflow.load(config);
 * // if (!result.ok) throw new Error(result.error);
 * // const data = result.data;
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (!result.ok) {
    const message =
      result.error instanceof Error
        ? result.error.message
        : String(result.error);
    throw new Error(message);
  }

  return result.data;
}

/**
 * Unwraps a Result, returning the data if Ok or a default value if Err.
 * Non-throwing alternative to unwrap().
 *
 * @example
 * const workflow = unwrapOr(await Workflow.load(config), null);
 * if (!workflow) {
 *   console.log("Using default...");
 * }
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return result.ok ? result.data : defaultValue;
}

/**
 * Unwraps a Result, returning the data if Ok or computing a default if Err.
 * Lazy version of unwrapOr() - only computes default when needed.
 *
 * @example
 * const workflow = unwrapOrElse(
 *   await Workflow.load(config),
 *   (err) => {
 *     console.warn("Load failed:", err);
 *     return createFallbackWorkflow();
 *   }
 * );
 */
export function unwrapOrElse<T, E>(
  result: Result<T, E>,
  onError: (error: E) => T
): T {
  return result.ok ? result.data : onError(result.error);
}
