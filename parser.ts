import { Err, Ok, Result } from "./result.ts"
import * as R from "./result.ts"

export type Parser<I, O> = (input: I) => Result<[I, O], Error>

export const id = <I, T>(t: Result<T, Error>): Parser<I, T> =>
  lazyId(() => t)

export const lazyId = <I, T>(t: () => Result<T, Error>): Parser<I, T> =>
  (input: I) => R.map<T, Error, [I, T]>(t => [input, t])(t())

export const map = <I, T, O>(f: (t: T) => O) => (parser: Parser<I, T>): Parser<I, O> =>
  (input: I) => R.map<[I, T], Error, [I, O]>(([i, t]) => [i, f(t)])(parser(input))

export const andThen = <I, T, O>(f: (t: T) => Parser<I, O>) => (parser: Parser<I, T>): Parser<I, O> =>
  (input: I) => R.andThen<[I, T], Error, [I, O]>(([rest, t]) => f(t)(rest))(parser(input))

export const mapErr = <I, T>(f: (input: I) => (e: Error) => Error) => (parser: Parser<I, T>): Parser<I, T> =>
  (input: I) => R.mapErr<[I, T], Error, Error>(f(input))(parser(input))

export const any = <I, T>(parsers: Parser<I, T>[]): Parser<I, T> =>
  (input: I) => R.first(parsers.map(p => () => p(input)))

export const sequence = <I, T>(parsers: Parser<I, T>[]): Parser<I, T[]> => {
  const inner = (arr: T[]) => (parsers: Parser<I, T>[]): Parser<I, T[]> => {
    if (parsers.length === 0) {
      return id(Ok(arr))
    }
    return (input: I) => {
      const parser = parsers[0]
      const res = parser(input)
      if (!res.ok) return res
      const [ni, v] = res.value
      return inner([...arr, v])(parsers.slice(1))(ni)
    }
  }
  return inner([])(parsers)
}

export const many = <I, T>(parser: Parser<I, T>): Parser<I, T[]> => {
  const inner = (arr: T[]) => (parser: Parser<I, T>): Parser<I, T[]> =>
    (input: I) => {
      const res = parser(input)
      if (!res.ok) return Ok([input, arr])
      const [ni, v] = res.value
      return inner([...arr, v])(parser)(ni)
    }
  return inner([])(parser)
}

export const not = <I, T>(value: T) => (parser: Parser<I, T>): Parser<I, T> =>
  (input: I) => {
    const res = parser(input)
    if (!res.ok) return res
    if (res.value[1] === value) return Err(new Error(`not ${value}`))
    return res
  }

export const oneOrMore = <I, T>(parser: Parser<I, T>) =>
  andThen<I, T[], T[]>
    (res => id(res.length === 0 ? Err(new Error(`expected oneOrMore of ${parser} but got 0`)) : Ok(res)))
    (many(parser))

export const recursive = <I, T>(parser: () => Parser<I, T>): Parser<I, T> =>
  (input: I) => parser()(input)

export const anyChar: Parser<string, string> = input =>
  input.length === 0
    ? Err(new Error("expected char found empty string"))
    : Ok([input.slice(1), input[0]])


export const char = (char: string): Parser<string, string> =>
  andThen<string, string, string>(s => id(
    s === char
      ? Ok(char)
      : Err(new Error(`expected ${char} found ${s}`))
  ))(anyChar)

andThen<string, string, string>(c => char(c[1]))(char("5"))

export const word = (word: string): Parser<string, string> =>
  mapErr<string, string>(input => () => new Error(`expected ${word} found ${input.slice(0, word.length)}`))
    (map<string, string[], string>(a => a.join(''))
      (sequence(word.split('').map(char))))

export const digit: Parser<string, number> = map<string, string, number>(parseInt)(any(Array(10).fill(0).map((_, i) => `${i}`).map(char)))

export const uint: Parser<string, number> = map<string, number[], number>
  (arr => arr.reduce((v, d) => v * 10 + d))
  (oneOrMore(digit))

export const surrounded = <I, T, D1, D2>(d1: Parser<I, D1>) => (d2: Parser<I, D2>) => (parser: Parser<I, T>): Parser<I, T> =>
  andThen<I, T, T>
    (res => map<I, D2, T>(() => res)(d2))
    (andThen<I, D1, T>
      (() => parser)
      (d1))

export const ws: Parser<string, string> = map<string, string[], string>(a => a.join(''))(many(any([char(' '), char('\n')])))
