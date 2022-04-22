export type Option<T> = { some: true, value: T } | { some: false }

export const Some = <T>(value: T): Option<T> => ({ some: true, value })
export const None: { some: false } = ({ some: false })

export const map = <T, O>(f: (t: T) => O): (option: Option<T>) => Option<O> =>
  andThen(o => Some(f(o)))

export const andThen = <T, O>(f: (t: T) => Option<O>) => (option: Option<T>): Option<O> =>
  option.some ? f(option.value) : None

export const unwrap = <T>(option: Option<T>): T => {
  if (option.some) return option.value
  console.error("Tried to unwrap a None value", option)
  Deno.exit(-1)
}

export const unwrapOrElse = <T>(f: () => T) => (option: Option<T>): T =>
  option.some ? option.value : f()

export const unwrapOr = <T>(v: T): (option: Option<T>) => T =>
  unwrapOrElse(() => v)
