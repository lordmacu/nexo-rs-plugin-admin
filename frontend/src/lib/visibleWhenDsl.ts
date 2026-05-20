// Phase 99.7 — TypeScript port of the Rust `visible_when` mini-DSL
// (`crates/plugin-manifest/src/visible_when.rs`, Phase 99.2).
//
// Used client-side to reactively show/hide admin-UI contributions
// and fields as form values change. MUST stay grammar- + semantics-
// compatible with the Rust evaluator (the server uses the same DSL
// to drop hidden contributions in `plugin_ui/list`).
//
// Grammar (recursive descent):
//   expr    = or
//   or      = and ('||' and)*
//   and     = cmp ('&&' cmp)*
//   cmp     = unary (('==' | '!=' | '<' | '>' | '<=' | '>=') unary)?
//   unary   = '!'? primary
//   primary = var | literal | '(' expr ')'
//   var     = ident ('.' ident)*        e.g. plugin.enabled
//   literal = string | number | bool    "x" | 'x' | 12.5 | -3 | true
//
// Bounds: source <= MAX_LEN chars, AST depth <= MAX_DEPTH.
// Evaluation never throws — a missing variable resolves to null
// (falsy) and a type-mismatched comparison yields false.

export const MAX_LEN = 200;
export const MAX_DEPTH = 5;

export class VisibleWhenError extends Error {}

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [k: string]: JsonValue };

type Ctx = Record<string, JsonValue>;

// ── AST ──────────────────────────────────────────────────────────

type CmpOp = "==" | "!=" | "<" | ">" | "<=" | ">=";

type Expr =
  | { t: "or"; l: Expr; r: Expr }
  | { t: "and"; l: Expr; r: Expr }
  | { t: "not"; e: Expr }
  | { t: "cmp"; op: CmpOp; l: Expr; r: Expr }
  | { t: "var"; path: string[] }
  | { t: "lit"; v: JsonValue };

// ── Public API ───────────────────────────────────────────────────

/** Parse + bound-check. Throws `VisibleWhenError` on failure. */
export function parse(src: string): Expr {
  if (src.length > MAX_LEN) {
    throw new VisibleWhenError(
      `visible_when exceeds ${MAX_LEN} chars (got ${src.length})`,
    );
  }
  const tokens = lex(src);
  const p = new Parser(tokens);
  const expr = p.parseOr();
  if (!p.atEnd()) {
    throw new VisibleWhenError("unexpected trailing token");
  }
  if (depth(expr) > MAX_DEPTH) {
    throw new VisibleWhenError(`visible_when AST depth exceeds ${MAX_DEPTH}`);
  }
  return expr;
}

/** Evaluate a parsed expression against `ctx` (infallible). */
export function evaluate(expr: Expr, ctx: Ctx): boolean {
  return truthy(evalValue(expr, ctx));
}

/**
 * Parse + eval an optional expression. Absent (undefined/null/empty)
 * = visible (`true`); a parse error = hidden (`false`), matching the
 * Rust server's "invalid -> hidden" rule.
 */
export function isVisible(src: string | null | undefined, ctx: Ctx): boolean {
  if (src === null || src === undefined || src === "") return true;
  try {
    return evaluate(parse(src), ctx);
  } catch {
    return false;
  }
}

// ── Evaluation ───────────────────────────────────────────────────

function evalValue(expr: Expr, ctx: Ctx): JsonValue {
  switch (expr.t) {
    case "lit":
      return expr.v;
    case "var":
      return resolve(expr.path, ctx);
    case "not":
      return !truthy(evalValue(expr.e, ctx));
    case "and":
      return truthy(evalValue(expr.l, ctx)) && truthy(evalValue(expr.r, ctx));
    case "or":
      return truthy(evalValue(expr.l, ctx)) || truthy(evalValue(expr.r, ctx));
    case "cmp":
      return compare(expr.op, evalValue(expr.l, ctx), evalValue(expr.r, ctx));
  }
}

function truthy(v: JsonValue): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return v.length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v).length > 0;
  return false;
}

function compare(op: CmpOp, l: JsonValue, r: JsonValue): boolean {
  if (op === "==") return valuesEqual(l, r);
  if (op === "!=") return !valuesEqual(l, r);
  // Relational: numbers numerically, strings lexicographically, else false.
  if (typeof l === "number" && typeof r === "number") {
    return op === "<"
      ? l < r
      : op === ">"
        ? l > r
        : op === "<="
          ? l <= r
          : l >= r;
  }
  if (typeof l === "string" && typeof r === "string") {
    return op === "<"
      ? l < r
      : op === ">"
        ? l > r
        : op === "<="
          ? l <= r
          : l >= r;
  }
  return false;
}

function valuesEqual(l: JsonValue, r: JsonValue): boolean {
  if (typeof l === "number" && typeof r === "number") return l === r;
  if (typeof l === "boolean" && typeof r === "boolean") return l === r;
  if (typeof l === "string" && typeof r === "string") return l === r;
  if (l === null || r === null) return l === r;
  return JSON.stringify(l) === JSON.stringify(r);
}

function resolve(path: string[], ctx: Ctx): JsonValue {
  let cur: JsonValue = ctx;
  for (const seg of path) {
    if (cur === null || typeof cur !== "object" || Array.isArray(cur)) {
      return null;
    }
    if (!(seg in cur)) return null;
    cur = (cur as { [k: string]: JsonValue })[seg];
  }
  return cur ?? null;
}

function depth(e: Expr): number {
  switch (e.t) {
    case "var":
    case "lit":
      return 1;
    case "not":
      return 1 + depth(e.e);
    case "and":
    case "or":
    case "cmp":
      return 1 + Math.max(depth(e.l), depth(e.r));
  }
}

// ── Lexer ────────────────────────────────────────────────────────

type Token =
  | { k: "and" | "or" | "not" | "lparen" | "rparen" }
  | { k: "op"; op: CmpOp }
  | { k: "ident"; v: string }
  | { k: "num"; v: number }
  | { k: "str"; v: string };

function lex(s: string): Token[] {
  const toks: Token[] = [];
  let i = 0;
  const isDigit = (c: string) => c >= "0" && c <= "9";
  const isAlpha = (c: string) =>
    (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_";
  while (i < s.length) {
    const c = s[i];
    if (c === " " || c === "\t" || c === "\n" || c === "\r") {
      i++;
    } else if (c === "(") {
      toks.push({ k: "lparen" });
      i++;
    } else if (c === ")") {
      toks.push({ k: "rparen" });
      i++;
    } else if (c === "&") {
      if (s[i + 1] === "&") {
        toks.push({ k: "and" });
        i += 2;
      } else throw new VisibleWhenError("expected `&&`");
    } else if (c === "|") {
      if (s[i + 1] === "|") {
        toks.push({ k: "or" });
        i += 2;
      } else throw new VisibleWhenError("expected `||`");
    } else if (c === "!") {
      if (s[i + 1] === "=") {
        toks.push({ k: "op", op: "!=" });
        i += 2;
      } else {
        toks.push({ k: "not" });
        i++;
      }
    } else if (c === "=") {
      if (s[i + 1] === "=") {
        toks.push({ k: "op", op: "==" });
        i += 2;
      } else throw new VisibleWhenError("expected `==`");
    } else if (c === "<") {
      if (s[i + 1] === "=") {
        toks.push({ k: "op", op: "<=" });
        i += 2;
      } else {
        toks.push({ k: "op", op: "<" });
        i++;
      }
    } else if (c === ">") {
      if (s[i + 1] === "=") {
        toks.push({ k: "op", op: ">=" });
        i += 2;
      } else {
        toks.push({ k: "op", op: ">" });
        i++;
      }
    } else if (c === '"' || c === "'") {
      const quote = c;
      i++;
      let buf = "";
      let closed = false;
      while (i < s.length) {
        const ch = s[i++];
        if (ch === quote) {
          closed = true;
          break;
        }
        if (ch === "\n") throw new VisibleWhenError("newline in string literal");
        buf += ch;
      }
      if (!closed) throw new VisibleWhenError("unterminated string literal");
      toks.push({ k: "str", v: buf });
    } else if (c === "-" || isDigit(c)) {
      let buf = "";
      if (c === "-") {
        buf += "-";
        i++;
        if (i >= s.length || !isDigit(s[i])) {
          throw new VisibleWhenError("`-` not followed by a digit");
        }
      }
      while (i < s.length && (isDigit(s[i]) || s[i] === ".")) {
        buf += s[i++];
      }
      const n = Number(buf);
      if (!Number.isFinite(n)) {
        throw new VisibleWhenError(`invalid number \`${buf}\``);
      }
      toks.push({ k: "num", v: n });
    } else if (isAlpha(c)) {
      let buf = "";
      while (
        i < s.length &&
        (isAlpha(s[i]) || isDigit(s[i]) || s[i] === ".")
      ) {
        buf += s[i++];
      }
      toks.push({ k: "ident", v: buf });
    } else {
      throw new VisibleWhenError(`unexpected character \`${c}\``);
    }
  }
  return toks;
}

// ── Parser ───────────────────────────────────────────────────────

class Parser {
  private pos = 0;
  constructor(private readonly toks: Token[]) {}

  atEnd(): boolean {
    return this.pos >= this.toks.length;
  }
  private peek(): Token | undefined {
    return this.toks[this.pos];
  }
  private next(): Token | undefined {
    return this.toks[this.pos++];
  }

  parseOr(): Expr {
    let left = this.parseAnd();
    while (this.peek()?.k === "or") {
      this.next();
      left = { t: "or", l: left, r: this.parseAnd() };
    }
    return left;
  }

  private parseAnd(): Expr {
    let left = this.parseCmp();
    while (this.peek()?.k === "and") {
      this.next();
      left = { t: "and", l: left, r: this.parseCmp() };
    }
    return left;
  }

  private parseCmp(): Expr {
    const left = this.parseUnary();
    const t = this.peek();
    if (t?.k === "op") {
      this.next();
      return { t: "cmp", op: t.op, l: left, r: this.parseUnary() };
    }
    return left;
  }

  private parseUnary(): Expr {
    if (this.peek()?.k === "not") {
      this.next();
      return { t: "not", e: this.parsePrimary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Expr {
    const t = this.next();
    if (!t) throw new VisibleWhenError("unexpected end of expression");
    if (t.k === "lparen") {
      const inner = this.parseOr();
      const close = this.next();
      if (!close || close.k !== "rparen") {
        throw new VisibleWhenError("expected `)`");
      }
      return inner;
    }
    if (t.k === "ident") {
      if (t.v === "true") return { t: "lit", v: true };
      if (t.v === "false") return { t: "lit", v: false };
      const path = t.v.split(".");
      if (path.some((seg) => seg.length === 0)) {
        throw new VisibleWhenError(`invalid variable path \`${t.v}\``);
      }
      return { t: "var", path };
    }
    if (t.k === "num") return { t: "lit", v: t.v };
    if (t.k === "str") return { t: "lit", v: t.v };
    throw new VisibleWhenError("unexpected token");
  }
}
