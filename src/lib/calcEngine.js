/**
 * The brain behind the desk's TI-36X Pro prop (Clutter.jsx). Button presses
 * build a token list; `=` turns the tokens into LaTeX and hands them to a
 * hidden Desmos calculator instance (loaded lazily from the Desmos API with
 * their public demo key) for evaluation. If Desmos can't load — offline dev,
 * blocked CDN — a small local degree-mode evaluator answers instead, so the
 * prop never dies with the network. Everything is DEG mode, like the LCD says.
 *
 * Token kinds:
 *   digit  0-9 or '.'          op     ÷ × − +
 *   pi                         ans    the previous result
 *   post   'sq' | 'inv'        postfix x², x⁻¹
 *   sqrt   √( … opens a radical (closes with `close`)
 *   fn     sin( cos( tan(      open   (        close  )
 */

/* ------------------------------------------------------------------ */
/* state + key presses                                                 */
/* ------------------------------------------------------------------ */

export function initialCalc() {
  return {
    tokens: [],
    ans: null, // last good numeric result
    result: null, // formatted result string currently on the LCD
    error: false,
    evaluated: false, // the LCD is showing a finished calculation
  }
}

/** Unclosed sqrt/fn/paren groups, in order — drives `)` validity + autoclose. */
function openStack(tokens) {
  const st = []
  for (const t of tokens) {
    if (t.k === 'sqrt' || t.k === 'fn' || t.k === 'open') st.push(t.k)
    else if (t.k === 'close') st.pop()
  }
  return st
}

const endsOperand = (k) => k === 'digit' || k === 'pi' || k === 'ans' || k === 'close' || k === 'post'

/** Apply one button to the state. Pure — returns the next state. */
export function pressKey(s, key) {
  if (key.k === 'clear') return { ...initialCalc(), ans: s.ans }
  if (key.k === 'del') {
    return { ...s, tokens: s.tokens.slice(0, -1), result: null, error: false, evaluated: false }
  }

  let tokens = s.tokens
  if (s.evaluated || s.error) {
    // fresh entry after a result — but an operator/postfix continues from Ans
    const continues = !s.error && s.ans != null && (key.k === 'op' || key.k === 'post')
    tokens = continues ? [{ k: 'ans' }] : []
  }

  const last = tokens[tokens.length - 1]
  let tok = null
  switch (key.k) {
    case 'digit':
      tok = { k: 'digit', v: key.v }
      break
    case 'op':
      tok = { k: 'op', v: key.v }
      break
    case 'post':
      if (last && endsOperand(last.k)) tok = { k: 'post', v: key.v }
      break
    case 'pi':
      tok = { k: 'pi' }
      break
    case 'ans':
      if (s.ans != null) tok = { k: 'ans' }
      break
    case 'sqrt':
    case 'fn':
    case 'open':
      tok = key.k === 'fn' ? { k: 'fn', v: key.v } : { k: key.k }
      break
    case 'close':
      if (openStack(tokens).length > 0) tok = { k: 'close' }
      break
    default:
      break
  }
  if (!tok) return tokens === s.tokens ? s : { ...s, tokens, result: null, error: false, evaluated: false }
  return { ...s, tokens: [...tokens, tok], result: null, error: false, evaluated: false }
}

/* ------------------------------------------------------------------ */
/* renderers: LCD string, Desmos LaTeX, local JS                       */
/* ------------------------------------------------------------------ */

export function displayText(tokens) {
  let out = ''
  for (const t of tokens) {
    switch (t.k) {
      case 'digit': out += t.v; break
      case 'op': out += t.v; break
      case 'pi': out += 'π'; break
      case 'ans': out += 'Ans'; break
      case 'post': out += t.v === 'sq' ? '²' : '^-1'; break
      case 'sqrt': out += '√('; break
      case 'fn': out += `${t.v}(`; break
      case 'open': out += '('; break
      case 'close': out += ')'; break
      default: break
    }
  }
  return out
}

/** A plain number as LaTeX (exponent notation → ·10^{}). */
function latexNum(n) {
  const s = String(n)
  const m = s.match(/^(-?[\d.]+)e([+-]\d+)$/i)
  return m ? `(${m[1]}\\cdot10^{${Number(m[2])}})` : `(${s})`
}

export function toLatex(tokens, ans) {
  let out = ''
  const st = []
  const closeOne = () => (st.pop() === 'sqrt' ? '}' : '\\right)')
  for (const t of tokens) {
    switch (t.k) {
      case 'digit': out += t.v; break
      case 'op': out += { '÷': '\\div ', '×': '\\cdot ', '−': '-', '+': '+' }[t.v]; break
      case 'pi': out += '\\pi '; break
      case 'ans': out += latexNum(ans); break
      case 'post': out += t.v === 'sq' ? '^{2}' : '^{-1}'; break
      case 'sqrt': out += '\\sqrt{'; st.push('sqrt'); break
      case 'fn': out += `\\${t.v}\\left(`; st.push('fn'); break
      case 'open': out += '\\left('; st.push('open'); break
      case 'close': out += closeOne(); break
      default: break
    }
  }
  while (st.length) out += closeOne() // autoclose, like the real TI
  return out
}

function toJs(tokens, ans) {
  let out = ''
  let open = 0
  let prev = null
  for (const t of tokens) {
    // implicit multiplication (2π, 3√(…), (1+2)(3)) must be explicit in JS
    const starts = t.k === 'pi' || t.k === 'ans' || t.k === 'sqrt' || t.k === 'fn' || t.k === 'open' || t.k === 'digit'
    if (prev && endsOperand(prev.k) && starts && !(prev.k === 'digit' && t.k === 'digit')) out += '*'
    switch (t.k) {
      case 'digit': out += t.v; break
      case 'op': out += { '÷': '/', '×': '*', '−': '-', '+': '+' }[t.v]; break
      case 'pi': out += '(PI)'; break
      case 'ans': out += `(${ans})`; break
      case 'post': out += t.v === 'sq' ? '**2' : '**(-1)'; break
      case 'sqrt': out += 'SQRT('; open++; break
      case 'fn': out += `${t.v.toUpperCase()}(`; open++; break
      case 'open': out += '('; open++; break
      case 'close': out += ')'; open--; break
      default: break
    }
    prev = t
  }
  while (open-- > 0) out += ')'
  return out
}

/** Local fallback: evaluate the token stream in degree mode. Only characters
 *  we generated ourselves ever reach the Function body. */
function localEval(tokens, ans) {
  const src = toJs(tokens, ans)
  const D = Math.PI / 180
  // eslint-disable-next-line no-new-func
  const v = new Function('SQRT', 'SIN', 'COS', 'TAN', 'PI', `return (${src})`)(
    Math.sqrt,
    (x) => Math.sin(x * D),
    (x) => Math.cos(x * D),
    (x) => Math.tan(x * D),
    Math.PI
  )
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error('calc: not a finite number')
  return v
}

/* ------------------------------------------------------------------ */
/* Desmos                                                              */
/* ------------------------------------------------------------------ */

// Desmos's published demo key — fine for personal/demo use; swap for your own
// key (desmos.com/api) if this ever ships somewhere with real traffic.
const DESMOS_SRC =
  'https://www.desmos.com/api/v1.11/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6'

let desmosPromise = null

/** Lazily load the Desmos API and stand up one hidden calculator instance in
 *  degree mode. Rejects (and forgets, so a later press retries) on failure. */
export function loadDesmos() {
  if (desmosPromise) return desmosPromise
  desmosPromise = new Promise((resolve, reject) => {
    const ready = () => {
      try {
        const elt = document.createElement('div')
        // offscreen but laid out — display:none breaks Desmos's sizing
        elt.style.cssText = 'position:absolute;left:-9999px;top:0;width:400px;height:300px;'
        document.body.appendChild(elt)
        const calc = window.Desmos.GraphingCalculator(elt, {
          keypad: false,
          expressions: false,
          settingsMenu: false,
          zoomButtons: false,
        })
        calc.updateSettings({ degreeMode: true }) // match the LCD's DEG badge
        resolve(calc)
      } catch (e) {
        reject(e)
      }
    }
    if (window.Desmos) return ready()
    const script = document.createElement('script')
    script.src = DESMOS_SRC
    script.async = true
    script.onload = ready
    script.onerror = () => reject(new Error('calc: Desmos script failed to load'))
    document.head.appendChild(script)
  })
  desmosPromise.catch(() => {
    desmosPromise = null
  })
  return desmosPromise
}

function desmosEval(calc, latex) {
  return new Promise((resolve, reject) => {
    const helper = calc.HelperExpression({ latex })
    let done = false
    const finish = (v) => {
      if (done) return
      done = true
      clearTimeout(timer)
      try {
        helper.unobserve('numericValue')
      } catch {
        /* helper already gone */
      }
      Number.isFinite(v) ? resolve(v) : reject(new Error('calc: Desmos returned no value'))
    }
    // invalid/undefined expressions just stay NaN — don't wait on them forever
    const timer = setTimeout(() => finish(NaN), 1500)
    helper.observe('numericValue', () => {
      if (Number.isFinite(helper.numericValue)) finish(helper.numericValue)
    })
    if (Number.isFinite(helper.numericValue)) finish(helper.numericValue)
  })
}

/**
 * Evaluate the current tokens: Desmos first, local degree-mode math if Desmos
 * is unreachable. Throws when the expression is genuinely bad — the LCD shows
 * Error, exactly like the real machine.
 */
export async function evaluate(tokens, ans) {
  try {
    const calc = await loadDesmos()
    return await desmosEval(calc, toLatex(tokens, ans))
  } catch {
    return localEval(tokens, ans)
  }
}

/** Round-trip a result into the string the LCD (and Ans reuse) shows. */
export function formatResult(v) {
  return String(Number(v.toPrecision(12)))
}
