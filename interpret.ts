import { Expr } from './index.ts'

export type Environment = {
  variables: Record<string, Value>
}

export type Func = {
  environment: () => Environment
  body: Expr
  arg: string
}

type BuiltInFunction = (arg: Value) => Value

export type Value =
  { type: "number", value: number }
  | { type: "func", value: Func }
  | { type: "builtin", value: BuiltInFunction }
  | { type: "object", value: Map<string, Value> }
  | { type: "string", value: string }
  | { type: "boolean", value: boolean }

const callFn = (arg: Value) => (f: Func): Value => {
  return interpret({
    variables: {
      ...f.environment().variables,
      [f.arg]: arg
    },
  })(f.body)[1]
}

export const interpret = (environment: Environment) => (expr: Expr): [Environment, Value] => {
  if (expr.type === "literal") {
    if (expr.value.type === "string") return [environment, { type: "string", value: expr.value.value }]
    if (expr.value.type === "boolean") return [environment, { type: "boolean", value: expr.value.value }]
    return [environment, { type: "number", value: expr.value.value }]
  } else if (expr.type === "call") {
    const [newEnvironment, f] = interpret(environment)(expr.f)
    if (f.type === "builtin") {
      //console.log(expr)
      return [newEnvironment, f.value(interpret(environment)(expr.arg)[1])]
    }
    if (f.type !== "func") throw new Error(`cannot call ${f.type}`)
    return [environment, callFn(interpret(environment)(expr.arg)[1])(f.value)]
  } else if (expr.type === "variable") {
    const v = environment.variables[expr.ident]
    if (v === undefined) throw new Error(`variable not found ${expr.ident}`)
    return [environment, v]
  } else if (expr.type === "decl") {
    const [_, value] = interpret(environment)(expr.value)
    return [{
      variables: {
        ...environment.variables,
        [expr.ident]: value
      }
    }, value]
  } else if (expr.type === "func") {
    return [environment, {
      type: "func",
      value: {
        environment: () => environment,
        body: expr.body,
        arg: expr.arg,
      }
    }]
  } else if (expr.type === "objExpr") {
    const arr = expr.fields.map(([k, expr]): [string, Value] => [k, interpret(environment)(expr)[1]])
    return [environment, {
      type: "object",
      value: new Map(arr)
    }]
  } else {
    const ident = expr.ident
    const [_, f] = interpret(environment)(expr.func)
    if (f.type !== "func") throw new Error("internal error expected func")
    const func: Value = {
      type: "func",
      value: {
        environment: () => envWithFunc,
        arg: f.value.arg,
        body: f.value.body
      }
    }
    const envWithFunc: Environment = {
      variables: {
        ...environment.variables,
        [ident]: func
      }
    }
    return [envWithFunc, func]
  }
}

export const interpretMany = (environment: Environment) => (...exprs: Expr[]) => {
  return exprs.reduce<[Environment, Value[]]>(([environment, values], expr) => {
    const [newEnvironment, value] = interpret(environment)(expr)
    return [newEnvironment, [...values, value]]
  }, [environment, []])
}

export const defaultEnvironment: Environment = {
  variables: {
    add: {
      type: "builtin",
      value: a => {
        return {
          type: "builtin", value: b => {
            if (a.type !== "number" || b.type !== "number") throw new Error(`tried to add ${a.type} to ${b.type}`)
            return { type: "number", value: a.value + b.value }
          }
        }
      }
    },
    sub: {
      type: "builtin",
      value: a => {
        return {
          type: "builtin",
          value: b => {
            if (a.type !== "number" || b.type !== "number") throw new Error(`tried to subtract ${b.type} from ${a.type}`)
            return { type: "number", value: a.value - b.value }
          }
        }
      }
    },
    mul: {
      type: "builtin",
      value: a => {
        return {
          type: "builtin",
          value: b => {
            if (a.type !== "number" || b.type !== "number") throw new Error(`tried to multiply ${a.type} with ${b.type}`)
            return { type: "number", value: a.value * b.value }
          }
        }
      }
    },
    getField: {
      type: "builtin",
      value: field => {
        if (field.type !== "string") throw new Error("expected string")
        return {
          type: "builtin",
          value: obj => {
            if (obj.type !== "object") throw new Error(`tried to access field of ${obj.type}`)
            const value = obj.value.get(field.value)
            if (value === undefined) throw new Error(`field ${field.value} does not exist`)
            return value
          }
        }
      }
    },
    setField: {
      type: "builtin",
      value: field => {
        if (field.type !== "string") throw new Error("expected string")
        return {
          type: "builtin",
          value: value => {
            return {
              type: "builtin",
              value: obj => {
                if (obj.type !== "object") throw new Error(`tried to set field of ${obj.type}`)
                return {
                  type: "object",
                  value: new Map(obj.value).set(field.value, value)
                }
              }
            }
          }
        }
      }
    },
    print: {
      type: "builtin",
      value: value => {
        console.log(Deno.inspect(value.value, { depth: Infinity }))
        return value
      }
    },
    ["if"]: {
      type: "builtin",
      value: value => {
        if (value.type !== "boolean") throw new Error(`cannot use ${value.type} in if`)
        return {
          type: "builtin",
          value: onTrue => {
            if (onTrue.type !== "func") throw new Error(`tried use ${onTrue.type} as branch in if`)
            return {
              type: "builtin",
              value: onFalse => {
                const res = value.value ? onTrue : onFalse
                if (res.type === "func") {
                  return callFn({ type: "boolean", value: value.value })(res.value)
                }
                return res
              }
            }
          }
        }
      }
    },
    eq: {
      type: "builtin",
      value: a => {
        return {
          type: "builtin",
          value: b => {
            const value: boolean = (() => {
              if (a.type !== b.type) throw new Error(`tried to compare ${a.type} with ${b.type}`)
              if (a.type === "string" && b.type === "string") return a.value === b.value
              if (a.type === "number" && b.type === "number") return a.value === b.value
              if (a.type === "boolean" && b.type === "boolean") return a.value === b.value
              throw new Error(`cannot compare ${a.type}`)
            })()
            return {
              type: "boolean",
              value
            }
          }
        }
      }
    },
    le: {
      type: "builtin",
      value: a => {
        return {
          type: "builtin",
          value: b => {
            const value: boolean = (() => {
              if (a.type !== b.type) throw new Error(`tried to compare ${a.type} with ${b.type}`)
              if (a.type === "string" && b.type === "string") return a.value < b.value
              if (a.type === "number" && b.type === "number") return a.value < b.value
              if (a.type === "boolean" && b.type === "boolean") return a.value < b.value
              throw new Error(`cannot compare ${a.type}`)
            })()
            return {
              type: "boolean",
              value
            }
          }
        }
      }
    },
    type: {
      type: "builtin",
      value: a => {
        return {
          type: "string",
          value: a.type
        }
      }
    }
  }
}