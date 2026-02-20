/**
 * MathJax/LaTeX Rendering Service
 *
 * Server-side and client-side rendering of LaTeX mathematical expressions
 * in flashcard content. Detects LaTeX delimiters in card content and
 * renders them to HTML or SVG.
 *
 * Supported delimiters:
 *   - \( inline math \)
 *   - \[ display math \]
 *   - $ inline math $
 *   - $$ display math $$
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MathJaxConfig {
  tex: {
    /** Pairs of delimiters for inline math, e.g., [['\\(', '\\)'], ['$', '$']] */
    inlineMath: string[][];
    /** Pairs of delimiters for display math, e.g., [['\\[', '\\]'], ['$$', '$$']] */
    displayMath: string[][];
    /** Whether to process escape sequences like \$ */
    processEscapes: boolean;
    /** Additional TeX packages to load */
    packages: string[];
  };
  svg: {
    /** Font cache strategy */
    fontCache: 'global' | 'local';
  };
  options: {
    /** CSS class name to skip processing */
    ignoreHtmlClass: string;
    /** CSS class name to force processing */
    processHtmlClass: string;
  };
}

/**
 * Result of rendering a LaTeX expression.
 */
export interface RenderedMath {
  /** The rendered output (HTML or SVG) */
  output: string;
  /** Whether this was inline or display math */
  displayMode: boolean;
  /** The original LaTeX source */
  source: string;
}

// ---------------------------------------------------------------------------
// Regex patterns for LaTeX detection and extraction
// ---------------------------------------------------------------------------

/** Matches \( ... \) for inline math (non-greedy) */
const INLINE_PAREN_RE = /\\\((.+?)\\\)/gs;

/** Matches \[ ... \] for display math (non-greedy) */
const DISPLAY_BRACKET_RE = /\\\[(.+?)\\\]/gs;

/**
 * Matches $...$ for inline math.
 * Negative lookbehind for \ to avoid matching escaped dollars.
 * Negative lookbehind and lookahead for $ to avoid matching $$.
 */
const INLINE_DOLLAR_RE = /(?<!\$)(?<!\\)\$(?!\$)(.+?)(?<!\\)\$(?!\$)/gs;

/** Matches $$...$$ for display math (non-greedy) */
const DISPLAY_DOLLAR_RE = /\$\$(.+?)\$\$/gs;

// ---------------------------------------------------------------------------
// LaTeX to HTML/SVG rendering via string manipulation
// (Server-side lightweight rendering without MathJax Node dependency)
// ---------------------------------------------------------------------------

/**
 * Escapes HTML special characters in a string.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Converts a LaTeX expression into an HTML representation using
 * semantic markup that MathJax can process on the client, or that
 * displays reasonably even without MathJax loaded.
 *
 * Common LaTeX constructs are translated to HTML/Unicode:
 *   - \frac{a}{b} -> fraction display
 *   - \sqrt{x} -> square root
 *   - ^{exp} -> superscript
 *   - _{sub} -> subscript
 *   - Greek letters -> Unicode
 *   - \sum, \int, \prod -> Unicode symbols
 */
function latexToHtml(latex: string, displayMode: boolean): string {
  let html = latex.trim();

  // Greek letters mapping
  const greekLetters: Record<string, string> = {
    '\\alpha': '\u03B1', '\\beta': '\u03B2', '\\gamma': '\u03B3',
    '\\delta': '\u03B4', '\\epsilon': '\u03B5', '\\zeta': '\u03B6',
    '\\eta': '\u03B7', '\\theta': '\u03B8', '\\iota': '\u03B9',
    '\\kappa': '\u03BA', '\\lambda': '\u03BB', '\\mu': '\u03BC',
    '\\nu': '\u03BD', '\\xi': '\u03BE', '\\pi': '\u03C0',
    '\\rho': '\u03C1', '\\sigma': '\u03C3', '\\tau': '\u03C4',
    '\\upsilon': '\u03C5', '\\phi': '\u03C6', '\\chi': '\u03C7',
    '\\psi': '\u03C8', '\\omega': '\u03C9',
    '\\Alpha': '\u0391', '\\Beta': '\u0392', '\\Gamma': '\u0393',
    '\\Delta': '\u0394', '\\Epsilon': '\u0395', '\\Zeta': '\u0396',
    '\\Eta': '\u0397', '\\Theta': '\u0398', '\\Iota': '\u0399',
    '\\Kappa': '\u039A', '\\Lambda': '\u039B', '\\Mu': '\u039C',
    '\\Nu': '\u039D', '\\Xi': '\u039E', '\\Pi': '\u03A0',
    '\\Rho': '\u03A1', '\\Sigma': '\u03A3', '\\Tau': '\u03A4',
    '\\Upsilon': '\u03A5', '\\Phi': '\u03A6', '\\Chi': '\u03A7',
    '\\Psi': '\u03A8', '\\Omega': '\u03A9',
  };

  // Mathematical operators and symbols
  const mathSymbols: Record<string, string> = {
    '\\sum': '\u2211',       // Summation
    '\\prod': '\u220F',      // Product
    '\\int': '\u222B',       // Integral
    '\\iint': '\u222C',      // Double integral
    '\\iiint': '\u222D',     // Triple integral
    '\\oint': '\u222E',      // Contour integral
    '\\infty': '\u221E',     // Infinity
    '\\partial': '\u2202',   // Partial derivative
    '\\nabla': '\u2207',     // Nabla/Del
    '\\pm': '\u00B1',        // Plus-minus
    '\\mp': '\u2213',        // Minus-plus
    '\\times': '\u00D7',     // Multiplication
    '\\div': '\u00F7',       // Division
    '\\cdot': '\u00B7',      // Center dot
    '\\ldots': '\u2026',     // Ellipsis
    '\\cdots': '\u22EF',     // Center dots
    '\\vdots': '\u22EE',     // Vertical dots
    '\\ddots': '\u22F1',     // Diagonal dots
    '\\leq': '\u2264',       // Less than or equal
    '\\geq': '\u2265',       // Greater than or equal
    '\\neq': '\u2260',       // Not equal
    '\\approx': '\u2248',    // Approximately equal
    '\\equiv': '\u2261',     // Identical to
    '\\sim': '\u223C',       // Tilde operator
    '\\subset': '\u2282',    // Subset
    '\\supset': '\u2283',    // Superset
    '\\subseteq': '\u2286',  // Subset or equal
    '\\supseteq': '\u2287',  // Superset or equal
    '\\in': '\u2208',        // Element of
    '\\notin': '\u2209',     // Not element of
    '\\cup': '\u222A',       // Union
    '\\cap': '\u2229',       // Intersection
    '\\emptyset': '\u2205',  // Empty set
    '\\forall': '\u2200',    // For all
    '\\exists': '\u2203',    // There exists
    '\\neg': '\u00AC',       // Logical not
    '\\land': '\u2227',      // Logical and
    '\\lor': '\u2228',       // Logical or
    '\\Rightarrow': '\u21D2', // Right double arrow
    '\\Leftarrow': '\u21D0',  // Left double arrow
    '\\Leftrightarrow': '\u21D4', // Left-right double arrow
    '\\rightarrow': '\u2192', // Right arrow
    '\\leftarrow': '\u2190',  // Left arrow
    '\\leftrightarrow': '\u2194', // Left-right arrow
    '\\to': '\u2192',        // Right arrow (alias)
    '\\mapsto': '\u21A6',    // Maps to
    '\\quad': '\u2003',      // Em space
    '\\qquad': '\u2003\u2003', // Double em space
    '\\,': '\u2009',         // Thin space
    '\\;': '\u2004',         // Medium space
    '\\!': '',               // Negative thin space (ignored)
    '\\left': '',            // Left delimiter sizing (handled by client)
    '\\right': '',           // Right delimiter sizing (handled by client)
    '\\langle': '\u27E8',    // Left angle bracket
    '\\rangle': '\u27E9',    // Right angle bracket
    '\\lceil': '\u2308',     // Left ceiling
    '\\rceil': '\u2309',     // Right ceiling
    '\\lfloor': '\u230A',    // Left floor
    '\\rfloor': '\u230B',    // Right floor
  };

  // Replace Greek letters (must come before general symbol replacement)
  for (const [cmd, unicode] of Object.entries(greekLetters)) {
    // Ensure we match the command as a whole word (followed by non-alpha or end)
    const escapedCmd = cmd.replace(/\\/g, '\\\\');
    const re = new RegExp(escapedCmd + '(?![a-zA-Z])', 'g');
    html = html.replace(re, unicode);
  }

  // Replace math symbols
  for (const [cmd, unicode] of Object.entries(mathSymbols)) {
    const escapedCmd = cmd.replace(/\\/g, '\\\\');
    const re = new RegExp(escapedCmd + '(?![a-zA-Z])', 'g');
    html = html.replace(re, unicode);
  }

  // Handle \frac{numerator}{denominator}
  html = html.replace(
    /\\frac\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g,
    '<span class="math-frac"><span class="math-frac-num">$1</span><span class="math-frac-bar"></span><span class="math-frac-den">$2</span></span>'
  );

  // Handle \sqrt{expression} and \sqrt[n]{expression}
  html = html.replace(
    /\\sqrt\[([^\]]+)\]\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g,
    '<span class="math-root"><sup>$1</sup>\u221A<span class="math-sqrt-content">$2</span></span>'
  );
  html = html.replace(
    /\\sqrt\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g,
    '<span class="math-sqrt">\u221A<span class="math-sqrt-content">$1</span></span>'
  );

  // Handle \overline{expression}
  html = html.replace(
    /\\overline\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g,
    '<span style="text-decoration:overline">$1</span>'
  );

  // Handle \underline{expression}
  html = html.replace(
    /\\underline\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g,
    '<span style="text-decoration:underline">$1</span>'
  );

  // Handle \hat{x}, \bar{x}, \vec{x}, \dot{x}, \ddot{x}, \tilde{x}
  const accents: Record<string, string> = {
    '\\hat': '\u0302',
    '\\bar': '\u0304',
    '\\vec': '\u20D7',
    '\\dot': '\u0307',
    '\\ddot': '\u0308',
    '\\tilde': '\u0303',
  };
  for (const [cmd, combining] of Object.entries(accents)) {
    const escapedCmd = cmd.replace(/\\/g, '\\\\');
    const re = new RegExp(escapedCmd + '\\{([^{}])\\}', 'g');
    html = html.replace(re, `$1${combining}`);
  }

  // Handle \text{...} and \mathrm{...} (roman text inside math)
  html = html.replace(
    /\\(?:text|mathrm)\{([^{}]*)\}/g,
    '<span class="math-text">$1</span>'
  );

  // Handle \mathbf{...} (bold)
  html = html.replace(
    /\\mathbf\{([^{}]*)\}/g,
    '<strong>$1</strong>'
  );

  // Handle \mathit{...} (italic)
  html = html.replace(
    /\\mathit\{([^{}]*)\}/g,
    '<em>$1</em>'
  );

  // Handle \mathbb{...} (blackboard bold) - approximate with bold
  html = html.replace(
    /\\mathbb\{([^{}]*)\}/g,
    '<span class="math-bb">$1</span>'
  );

  // Handle \mathcal{...} (calligraphic)
  html = html.replace(
    /\\mathcal\{([^{}]*)\}/g,
    '<span class="math-cal">$1</span>'
  );

  // Handle superscripts: ^{content} and ^single_char
  html = html.replace(/\^\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, '<sup>$1</sup>');
  html = html.replace(/\^([a-zA-Z0-9\u0370-\u03FF])/g, '<sup>$1</sup>');

  // Handle subscripts: _{content} and _single_char
  html = html.replace(/_\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, '<sub>$1</sub>');
  html = html.replace(/_([a-zA-Z0-9\u0370-\u03FF])/g, '<sub>$1</sub>');

  // Handle \begin{matrix}...\end{matrix} style environments
  html = html.replace(
    /\\begin\{(?:pmatrix|bmatrix|matrix|vmatrix|Vmatrix)\}([\s\S]*?)\\end\{(?:pmatrix|bmatrix|matrix|vmatrix|Vmatrix)\}/g,
    (_match, content: string) => {
      const rows = content.split('\\\\').map((row: string) => row.trim()).filter(Boolean);
      const tableRows = rows.map((row: string) => {
        const cells = row.split('&').map((cell: string) =>
          `<td class="math-matrix-cell">${cell.trim()}</td>`
        ).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<table class="math-matrix"><tbody>${tableRows}</tbody></table>`;
    }
  );

  // Handle \begin{cases}...\end{cases}
  html = html.replace(
    /\\begin\{cases\}([\s\S]*?)\\end\{cases\}/g,
    (_match, content: string) => {
      const rows = content.split('\\\\').map((row: string) => row.trim()).filter(Boolean);
      const caseRows = rows.map((row: string) => {
        const parts = row.split('&').map((p: string) => p.trim());
        const expr = parts[0] || '';
        const condition = parts[1] || '';
        return `<tr><td class="math-case-expr">${expr}</td><td class="math-case-cond">${condition}</td></tr>`;
      }).join('');
      return `<table class="math-cases"><tbody>${caseRows}</tbody></table>`;
    }
  );

  // Handle \begin{align}...\end{align} and \begin{aligned}...\end{aligned}
  html = html.replace(
    /\\begin\{(?:align|aligned)\*?\}([\s\S]*?)\\end\{(?:align|aligned)\*?\}/g,
    (_match, content: string) => {
      const rows = content.split('\\\\').map((row: string) => row.trim()).filter(Boolean);
      const alignRows = rows.map((row: string) => {
        const cells = row.split('&').map((cell: string) =>
          `<td class="math-align-cell">${cell.trim()}</td>`
        ).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<table class="math-align"><tbody>${alignRows}</tbody></table>`;
    }
  );

  // Clean up remaining LaTeX braces that were just for grouping
  html = html.replace(/(?<!\\)\{/g, '');
  html = html.replace(/(?<!\\)\}/g, '');

  // Clean up remaining backslash commands we did not handle (show as-is)
  html = html.replace(/\\([a-zA-Z]+)/g, '<span class="math-unknown-cmd">\\$1</span>');

  // Wrap in appropriate container
  const tag = displayMode ? 'div' : 'span';
  const displayClass = displayMode ? 'math-display' : 'math-inline';
  return `<${tag} class="math-rendered ${displayClass}">${html}</${tag}>`;
}

// ---------------------------------------------------------------------------
// LaTeX to SVG rendering (lightweight server-side)
// ---------------------------------------------------------------------------

/**
 * Generates an SVG representation of a LaTeX expression.
 * This produces a basic SVG with the rendered text for offline or static use.
 * For full fidelity, use the client-side MathJax rendering.
 */
function latexToSvg(latex: string, displayMode: boolean): string {
  // Estimate dimensions based on expression length
  const fontSize = displayMode ? 20 : 16;
  const charWidth = fontSize * 0.6;
  const estimatedWidth = Math.max(40, latex.length * charWidth);
  const height = displayMode ? 60 : 30;
  const y = displayMode ? 35 : 20;

  // Process the LaTeX to a simplified text representation
  let text = latex.trim();

  // Simple replacements for SVG text
  const svgReplacements: Record<string, string> = {
    '\\alpha': '\u03B1', '\\beta': '\u03B2', '\\gamma': '\u03B3',
    '\\delta': '\u03B4', '\\pi': '\u03C0', '\\sigma': '\u03C3',
    '\\theta': '\u03B8', '\\lambda': '\u03BB', '\\mu': '\u03BC',
    '\\omega': '\u03C9', '\\phi': '\u03C6', '\\psi': '\u03C8',
    '\\sum': '\u2211', '\\prod': '\u220F', '\\int': '\u222B',
    '\\infty': '\u221E', '\\partial': '\u2202',
    '\\pm': '\u00B1', '\\times': '\u00D7', '\\div': '\u00F7',
    '\\leq': '\u2264', '\\geq': '\u2265', '\\neq': '\u2260',
    '\\approx': '\u2248', '\\rightarrow': '\u2192',
    '\\Rightarrow': '\u21D2', '\\leftarrow': '\u2190',
    '\\in': '\u2208', '\\forall': '\u2200', '\\exists': '\u2203',
    '\\sqrt': '\u221A', '\\nabla': '\u2207',
  };

  for (const [cmd, unicode] of Object.entries(svgReplacements)) {
    text = text.replace(new RegExp(cmd.replace(/\\/g, '\\\\') + '(?![a-zA-Z])', 'g'), unicode);
  }

  // Remove remaining LaTeX commands for SVG text
  text = text.replace(/\\[a-zA-Z]+/g, '');
  text = text.replace(/[{}]/g, '');
  text = text.replace(/\^(.)/g, '$1'); // simplified superscript
  text = text.replace(/_(.)/g, '$1');  // simplified subscript

  const escapedText = escapeHtml(text);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${estimatedWidth}" height="${height}" role="img" aria-label="LaTeX: ${escapeHtml(latex)}">`,
    `  <title>${escapeHtml(latex)}</title>`,
    `  <style>`,
    `    .math-svg-text { font-family: 'Latin Modern Math', 'STIX Two Math', 'Cambria Math', serif; }`,
    `  </style>`,
    `  <text x="4" y="${y}" font-size="${fontSize}" class="math-svg-text" fill="currentColor">${escapedText}</text>`,
    `</svg>`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// MathJaxRenderer Class
// ---------------------------------------------------------------------------

export class MathJaxRenderer {
  // -----------------------------------------------------------------------
  // Detection
  // -----------------------------------------------------------------------

  /**
   * Check if text contains LaTeX expressions.
   * Looks for common LaTeX delimiters: \(...\), \[...\], $...$, $$...$$
   */
  containsLatex(text: string): boolean {
    if (!text || typeof text !== 'string') return false;

    // Check for \(...\) or \[...\]
    if (/\\\([\s\S]+?\\\)/.test(text)) return true;
    if (/\\\[[\s\S]+?\\\]/.test(text)) return true;

    // Check for $$...$$ (display math)
    if (/\$\$[\s\S]+?\$\$/.test(text)) return true;

    // Check for $...$ (inline math) -- exclude escaped dollars
    if (/(?<!\$)(?<!\\)\$(?!\$)[\s\S]+?(?<!\\)\$(?!\$)/.test(text)) return true;

    // Check for common LaTeX commands even without delimiters
    if (/\\(?:frac|sqrt|sum|int|prod|begin|end)\b/.test(text)) return true;

    return false;
  }

  // -----------------------------------------------------------------------
  // HTML Rendering
  // -----------------------------------------------------------------------

  /**
   * Render LaTeX expressions in HTML content.
   *
   * Scans the HTML for LaTeX delimiters and replaces each expression with
   * rendered HTML. Processing order ensures display math ($$, \[...\]) is
   * handled before inline math ($, \(...\)) to avoid ambiguity.
   *
   * The rendered HTML includes CSS classes for styling:
   *   - .math-rendered: all math expressions
   *   - .math-display: display (block) math
   *   - .math-inline: inline math
   *   - .math-frac, .math-frac-num, .math-frac-den: fractions
   *   - .math-sqrt, .math-sqrt-content: square roots
   */
  renderLatex(html: string): string {
    if (!html || !this.containsLatex(html)) {
      return html;
    }

    let result = html;

    // 1. Display math: $$ ... $$
    result = result.replace(DISPLAY_DOLLAR_RE, (_match, expr: string) => {
      return latexToHtml(expr, true);
    });

    // 2. Display math: \[ ... \]
    result = result.replace(DISPLAY_BRACKET_RE, (_match, expr: string) => {
      return latexToHtml(expr, true);
    });

    // 3. Inline math: \( ... \)
    result = result.replace(INLINE_PAREN_RE, (_match, expr: string) => {
      return latexToHtml(expr, false);
    });

    // 4. Inline math: $ ... $ (processed last to avoid conflicts with $$)
    result = result.replace(INLINE_DOLLAR_RE, (_match, expr: string) => {
      return latexToHtml(expr, false);
    });

    return result;
  }

  // -----------------------------------------------------------------------
  // SVG Rendering
  // -----------------------------------------------------------------------

  /**
   * Pre-render a LaTeX expression to SVG for offline or static use.
   *
   * @param latex - The LaTeX expression (without delimiters)
   * @param displayMode - Whether to render in display mode (default: false)
   * @returns SVG string
   */
  renderToSVG(latex: string, displayMode: boolean = false): string {
    return latexToSvg(latex, displayMode);
  }

  // -----------------------------------------------------------------------
  // Client Configuration
  // -----------------------------------------------------------------------

  /**
   * Get MathJax configuration for client-side rendering.
   *
   * Returns a config object that should be set as `window.MathJax` before
   * loading the MathJax script. This enables client-side rendering with
   * full fidelity for all LaTeX expressions.
   *
   * Usage in a script tag:
   * ```html
   * <script>
   *   window.MathJax = renderer.getClientConfig();
   * </script>
   * <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js" async></script>
   * ```
   */
  getClientConfig(): MathJaxConfig {
    return {
      tex: {
        inlineMath: [['\\(', '\\)'], ['$', '$']],
        displayMath: [['\\[', '\\]'], ['$$', '$$']],
        processEscapes: true,
        packages: ['base', 'ams', 'noerrors', 'noenvironments', 'boldsymbol'],
      },
      svg: {
        fontCache: 'global',
      },
      options: {
        ignoreHtmlClass: 'no-mathjax',
        processHtmlClass: 'mathjax-process',
      },
    };
  }

  // -----------------------------------------------------------------------
  // CSS for server-rendered math
  // -----------------------------------------------------------------------

  /**
   * Returns CSS styles needed for server-side rendered math expressions.
   * Include this in the page <style> or a stylesheet.
   */
  getStyles(): string {
    return `
/* MathJax Server-Side Rendered Math Styles */
.math-rendered {
  font-family: 'Latin Modern Math', 'STIX Two Math', 'Cambria Math', 'Times New Roman', serif;
  font-style: italic;
}
.math-display {
  display: block;
  text-align: center;
  margin: 1em 0;
  font-size: 1.2em;
}
.math-inline {
  display: inline;
  font-size: 1em;
}
.math-text {
  font-style: normal;
  font-family: inherit;
}
.math-frac {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  vertical-align: middle;
  margin: 0 0.1em;
}
.math-frac-num {
  border-bottom: 1px solid currentColor;
  padding: 0 0.2em 0.1em;
  font-size: 0.85em;
}
.math-frac-bar {
  display: none;
}
.math-frac-den {
  padding: 0.1em 0.2em 0;
  font-size: 0.85em;
}
.math-sqrt {
  display: inline;
  white-space: nowrap;
}
.math-sqrt-content {
  border-top: 1px solid currentColor;
  padding: 0 0.15em;
}
.math-root {
  display: inline;
  white-space: nowrap;
}
.math-root sup {
  font-size: 0.6em;
  vertical-align: super;
  margin-right: -0.2em;
}
.math-bb {
  font-weight: bold;
  font-family: 'Latin Modern Math', serif;
}
.math-cal {
  font-family: 'Latin Modern Math', cursive, serif;
}
.math-matrix {
  display: inline-table;
  border-collapse: collapse;
  margin: 0.5em 0;
}
.math-matrix-cell {
  padding: 0.2em 0.5em;
  text-align: center;
}
.math-cases {
  display: inline-table;
  border-collapse: collapse;
  border-left: 2px solid currentColor;
  margin: 0.5em 0;
}
.math-case-expr {
  padding: 0.2em 0.5em;
  text-align: right;
}
.math-case-cond {
  padding: 0.2em 0.5em;
  text-align: left;
  font-style: normal;
}
.math-align {
  display: inline-table;
  border-collapse: collapse;
  margin: 0.5em auto;
}
.math-align-cell {
  padding: 0.2em 0.3em;
}
.math-unknown-cmd {
  color: #c00;
  font-style: normal;
  font-size: 0.85em;
}
`.trim();
  }

  // -----------------------------------------------------------------------
  // MathJax Script Tag
  // -----------------------------------------------------------------------

  /**
   * Returns the HTML script tags needed to load MathJax on the client.
   * This includes the config and the MathJax library itself.
   */
  getScriptTags(): string {
    const config = JSON.stringify(this.getClientConfig(), null, 2);
    return [
      '<script>',
      `  window.MathJax = ${config};`,
      '</script>',
      '<script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>',
    ].join('\n');
  }

  // -----------------------------------------------------------------------
  // Utility: Strip LaTeX from text (for search indexing, etc.)
  // -----------------------------------------------------------------------

  /**
   * Remove LaTeX delimiters and commands from text, leaving only the
   * plain text content. Useful for search indexing.
   */
  stripLatex(text: string): string {
    if (!text) return '';

    let result = text;

    // Remove display delimiters
    result = result.replace(/\$\$([\s\S]+?)\$\$/g, '$1');
    result = result.replace(/\\\[([\s\S]+?)\\\]/g, '$1');

    // Remove inline delimiters
    result = result.replace(/\\\(([\s\S]+?)\\\)/g, '$1');
    result = result.replace(/(?<!\$)(?<!\\)\$([\s\S]+?)(?<!\\)\$(?!\$)/g, '$1');

    // Remove common commands, keeping their arguments
    result = result.replace(/\\(?:frac|sqrt|text|mathrm|mathbf|mathit|overline|underline)\{([^{}]*)\}/g, '$1');
    result = result.replace(/\\(?:hat|bar|vec|dot|tilde)\{([^{}])\}/g, '$1');

    // Remove remaining LaTeX commands
    result = result.replace(/\\[a-zA-Z]+/g, ' ');

    // Remove braces
    result = result.replace(/[{}]/g, '');

    // Normalize whitespace
    result = result.replace(/\s+/g, ' ').trim();

    return result;
  }
}
