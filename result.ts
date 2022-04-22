import { None, Option, Some } from "./option.ts"
import * as O from "./option.ts"

export type Result<T, E> = { ok: true, value: T } | { ok: false, value: E }

export const Ok = <T, E>(value: T): Result<T, E> => ({ ok: true, value })
export const Err = <T, E>(value: E): Result<T, E> => ({ ok: false, value })

export const andThen = <T, E, O>(f: (t: T) => Result<O, E>) => (result: Result<T, E>): Result<O, E> =>
  result.ok ? f(result.value) : result

export const map = <T, E, O>(f: (t: T) => O): (result: Result<T, E>) => Result<O, E> =>
  andThen(o => Ok(f(o)))

export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (result.ok) return result.value
  console.error("Tried to unwrap a Err value", result)
  Deno.exit(-1)
}

export const unwrapOrElse = <T, E>(f: () => T) => (result: Result<T, E>): T =>
  result.ok ? result.value : f()

export const unwrapOr = <T, E>(t: T): (result: Result<T, E>) => T =>
  unwrapOrElse(() => t)

export const mapErr = <T, E, E2>(f: (e: E) => E2) => (result: Result<T, E>): Result<T, E2> =>
  result.ok ? result : Err(f(result.value))

export const unwrapErr = <T, E>(result: Result<T, E>): E => {
  if (!result.ok) return result.value
  console.log("Tried to unwrapErr an Ok value", result)
  Deno.exit(-1)
}

export const discardErr = <T, E>(result: Result<T, E>): Option<T> =>
  result.ok ? Some(result.value) : None

export const first = <T, E>(results: (() => Result<T, E>)[]): Result<T, E> => {
  if (results.length === 0) throw new Error("first must receive at least one Parser")
  let error: Option<E> = None
  for (const f of results) {
    const result = f()
    if (result.ok) return result
    error = Some(result.value)
  }
  return Err(O.unwrap(error))
}