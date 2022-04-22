import * as P from './parser.ts'
import * as I from './interpret.ts'
import * as R from './result.ts'

export type NumberLiteral = { type: "number", value: number }
export type StringLiteral = { type: "string", value: string }
export type BooleanLiteral = { type: "boolean", value: boolean }
export type Literal = NumberLiteral | StringLiteral | BooleanLiteral
export type LiteralExpr = { type: "literal", value: Literal }

export type CallExpr = { type: "call", f: Expr, arg: Expr }

export type VariableExpr = { type: "variable", ident: string }

export type DeclExpr = { type: "decl", ident: string, value: Expr }

export type FuncExpr = { type: "func", arg: string, body: Expr }

export type NamedFuncExpr = { type: "namedFunc", ident: string, func: FuncExpr }

export type ObjExpr = { type: "objExpr", fields: [string, Expr][] }

export type Expr = CallExpr | LiteralExpr | VariableExpr | DeclExpr | FuncExpr | ObjExpr | NamedFuncExpr


const identChars = [
  ...Array(25).fill(0).map((_, i) => String.fromCharCode("a".charCodeAt(0) + i)),
  ...Array(25).fill(0).map((_, i) => String.fromCharCode("A".charCodeAt(0) + i)),
  "#",
  "."
].map(P.char)
export const ident: P.Parser<string, string> = P.map<string, string[], string>(a => a.join(''))(P.oneOrMore(P.any(identChars)))

const buildCurriedCallExpr = (f: Expr, args: Expr[]): CallExpr => {
  if (args.length === 1) return { type: "call", f, arg: args[0] }
  return buildCurriedCallExpr({
    type: "call",
    f,
    arg: args[0]
  }, args.slice(1))
}

const call = P.surrounded<string, CallExpr, string, string>
  (P.ws)
  (P.ws)
  (P.map<string, [Expr, Expr[]], CallExpr>
    (([f, args]) => buildCurriedCallExpr(f, args))
    (P.andThen<string, Expr, [Expr, Expr[]]>
      (ident => P.map<string, Expr[], [Expr, Expr[]]>
        (args => {
          return [ident, args]
        })
        (P.oneOrMore(P.andThen(() => expr)(P.ws))))
      (P.recursive(() => expr))))

const escaped: P.Parser<string, string> = P.andThen
  (() => P.anyChar)
  (P.char('\\'))

const string: P.Parser<string, string> = P.andThen<string, string, string>
  (() => P.andThen<string, string[], string>
    (arr => P.map<string, string, string>
      (() => arr.join(''))
      (P.char('"')))
    (P.many
      (P.any
        ([escaped,
          P.not<string, string>
            ('"')
            (P.anyChar)]))))
  (P.char('"'))

const literal = P.any<string, Literal>([
  P.map<string, number, Literal>(value => ({ type: "number", value }))(P.uint),
  P.map<string, string, Literal>(value => ({ type: "string", value }))(string),
  P.map<string, string, Literal>(() => ({ type: "boolean", value: true }))(P.word("true")),
  P.map<string, string, Literal>(() => ({ type: "boolean", value: false }))(P.word("false")),
])

const variable = P.map<string, string, VariableExpr>(ident => ({ type: "variable", ident }))(ident)

const buildCurriedFuncExpr = (body: Expr) => (args: string[]): FuncExpr => {
  if (args.length === 0) return { type: "func", body, arg: "_" }
  if (args.length === 1) return { type: "func", body, arg: args[0] }
  return buildCurriedFuncExpr({
    type: "func",
    body,
    arg: args[args.length - 1]
  })(args.slice(0, args.length - 1))
}

const genericDecl = <T>(p: P.Parser<string, T>) =>
  P.andThen<string, string, [string, T]>
    (ident => P.andThen<string, string, [string, T]>
      (() => P.andThen<string, string, [string, T]>
        (() => P.andThen
          (() => P.map<string, T, [string, T]>
            (p => [ident, p])
            (p))
          (P.ws))
        (P.char("=")))
      (P.ws))
    (ident)

const decl = P.map<string, [string, Expr], DeclExpr>
  (([ident, value]) => ({ type: "decl", ident, value }))
  (genericDecl(P.recursive(() => expr)))

const func = P.andThen<string, string[], FuncExpr>
  (args => P.map<string, Expr, FuncExpr>
    (body => buildCurriedFuncExpr(body)(args))
    (P.andThen<string, string, Expr>
      (() => P.andThen<string, string, Expr>
        (() => expr)
        (P.ws))
      (P.word("=>"))))
  (P.many
    (P.andThen<string, string, string>
      (arg => P.map<string, string, string>
        (() => arg)
        (P.ws))
      (ident)))

const namedFunc = P.map<string, [string, FuncExpr], NamedFuncExpr>
  (([ident, func]) => ({ type: "namedFunc", ident, func }))
  (genericDecl(func))

const objKVPair: P.Parser<string, [string, Expr]> = P.andThen<string, string, [string, Expr]>
  (() => P.andThen<string, string, [string, Expr]>
    (field => P.andThen<string, string, [string, Expr]>
      (() => P.map<string, Expr, [string, Expr]>
        (expr => [field, expr])
        (P.andThen<string, string, Expr>
          (() => expr)
          (P.ws)
        ))
      (P.char(':')))
    (ident))
  (P.ws)

const objInner: P.Parser<string, [string, Expr][]> = P.surrounded<string, [string, Expr][], string, string>(P.ws)(P.ws)(P.many(objKVPair))

const obj = P.surrounded<string, ObjExpr, string, string>
  (P.char("{"))
  (P.char("}"))
  (P.map<string, [string, Expr][], ObjExpr>
    (fields => ({ type: "objExpr", fields }))
    (objInner))

const innerExpr: P.Parser<string, Expr> = P.any<string, Expr>([
  call,
  P.recursive<string, Expr>(() => expr),
])

const expr: P.Parser<string, Expr> = P.surrounded<string, Expr, string, string>
  (P.ws)
  (P.ws)
  (P.any<string, Expr>([
    P.surrounded<string, Expr, string, string>
      (P.char('('))
      (P.char(')'))
      (innerExpr),
    P.map<string, Literal, Expr>(value => ({ type: "literal", value }))(literal),
    namedFunc,
    decl,
    func,
    variable,
    obj,
  ]))

function readStdin() {
  const buf = new Uint8Array(1024)
  return (function inner(str: string): Promise<string> {
    return Deno.stdin.read(buf)
      .then(n => n === null
        ? str
        : inner(str + new TextDecoder().decode(buf.subarray(0, n))))
  })("")
}

readStdin().then(input => {
  const exprs = P.oneOrMore(P.surrounded<string, Expr, string, string>(P.ws)(P.ws)(expr))(input)
  I.interpretMany(I.defaultEnvironment)(...R.unwrap(exprs)[1])
})
