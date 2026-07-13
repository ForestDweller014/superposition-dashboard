import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function clamp(x, lo, hi) {
  return Math.min(Math.max(x, lo), hi);
}

function parseNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function trimTrailingZeros(value) {
  if (!value.includes('.')) return value;
  let out = value;
  while (out.endsWith('0')) out = out.slice(0, -1);
  if (out.endsWith('.')) out = out.slice(0, -1);
  return out;
}

function fmt(x) {
  if (!Number.isFinite(x)) return '∞';
  if (x === 0) return '0';
  const ax = Math.abs(x);
  if (ax >= 1000) return x.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return trimTrailingZeros(x.toFixed(4));
}

function fmtAxisDecimal(x) {
  if (!Number.isFinite(x)) return '';
  return x.toFixed(1);
}

function supportCountFromInput(s, N) {
  if (!Number.isFinite(s) || s <= 0 || !Number.isFinite(N) || N <= 0) return 0;
  return s <= 1 ? s * N : s;
}

function effectiveDimension(N, s) {
  if (!Number.isFinite(N) || N <= 0) return 0;
  const support = supportCountFromInput(s, N);
  return clamp(support, 0, N);
}

function epsilonSquaredFromM(M, N, s) {
  const dEff = effectiveDimension(N, s);
  if (!(dEff > 0) || !(M > 1)) return 0;
  const numerator = M - dEff;
  const denominator = dEff * (M - 1);
  if (numerator <= 0 || denominator <= 0) return 0;
  return numerator / denominator;
}

function epsilonWelchSparse(K, N, s, mFactor) {
  const M = mFactor * K;
  return Math.sqrt(Math.max(0, epsilonSquaredFromM(M, N, s)));
}

function solveKFromE(E, N, s, mFactor) {
  const dEff = effectiveDimension(N, s);
  const c = mFactor;

  if (!(dEff > 0) || !(c > 0) || !(E >= 0)) {
    return { K: NaN, dEff, discriminant: NaN, thresholdK: NaN };
  }

  const y = E * E * dEff;
  const A = c;
  const B = -((c + dEff) + c * y);
  const C = dEff + y;
  const discriminant = B * B - 4 * A * C;
  const thresholdK = dEff / c;

  if (discriminant < 0) {
    return { K: NaN, dEff, discriminant, thresholdK };
  }

  const sqrtDisc = Math.sqrt(discriminant);
  const root1 = (-B - sqrtDisc) / (2 * A);
  const root2 = (-B + sqrtDisc) / (2 * A);

  let K = Math.max(root1, root2);
  if (E === 0) K = Math.max(1, thresholdK);

  return { K, dEff, discriminant, thresholdK };
}

function MathText({ children }) {
  return <span>{children}</span>;
}

function MathBlock({ children }) {
  return (
    <div className="math-block overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-900">
      {String.raw`\[${children}\]`}
    </div>
  );
}

function ConceptStep({ number, title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
          {number}
        </span>
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      <p className="text-sm leading-6 text-slate-600">{children}</p>
    </div>
  );
}

function TeXDocument() {
  useEffect(() => {
    if (window.MathJax?.typesetPromise) {
      window.MathJax.typesetPromise();
      return;
    }

    window.MathJax = {
      tex: {
        inlineMath: [['\\(', '\\)'], ['$', '$']],
        displayMath: [['\\[', '\\]']],
      },
      svg: {
        fontCache: 'global',
      },
    };

    const existingScript = document.querySelector('script[data-mathjax="true"]');
    if (existingScript) return;

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
    script.async = true;
    script.dataset.mathjax = 'true';
    script.onload = () => window.MathJax?.typesetPromise?.();
    document.head.appendChild(script);
  }, []);

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle>Formal model and derivation</CardTitle>
        <CardDescription>
          The equations behind the curve. The plain-language walkthrough above is enough to use the dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 text-sm leading-7 text-slate-700">
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">Definitions</h2>
          <p>Let</p>
          <MathBlock>{String.raw`X = \sum_{j=1}^K a_j v_j,`}</MathBlock>
          <p>
            <MathText>{String.raw`where \(V = \{v_1,\dots,v_M\}\) is a collection of unit vectors in \(\mathbb{R}^N\). We assume each \(v_i\) is sparse, with sparsity parameter \(s\). If \(0 < s \le 1\), each vector has support size at most \(sN\). If \(s > 1\), each vector has support size at most \(s\).`}</MathText>
          </p>
          <p>Define the effective dimension</p>
          <MathBlock>{String.raw`d_{\mathrm{eff}} =
\begin{cases}
\min(N,sN), & 0 < s \le 1,\\[4pt]
\min(N,s), & s > 1.
\end{cases}`}</MathBlock>
          <p>
            We study the pairwise overlap distribution and the readout error incurred when recovering a coefficient
            <MathText>{String.raw` \(a_i\) `}</MathText>
            from the superposed vector
            <MathText>{String.raw` \(X\)`}</MathText>.
          </p>
          <p>
            Mechanistically, <MathText>{String.raw`\(M\)`}</MathText> counts all feature directions available to the
            representation, while <MathText>{String.raw`\(K\)`}</MathText> counts only the features active in this one
            superposed state.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">Welch-style sparse approximation</h2>
          <p>The pairwise overlaps of distinct vectors satisfy the approximation</p>
          <MathBlock>{String.raw`\langle v_i, v_j \rangle \approx \mathcal{N}(0,\epsilon^2), \qquad i \ne j,`}</MathBlock>
          <p>with variance modeled by the sparse Welch-style expression</p>
          <MathBlock>{String.raw`\epsilon^2 \approx \max\!\left(0,\frac{M-d_{\mathrm{eff}}}{d_{\mathrm{eff}}(M-1)}\right).`}</MathBlock>
          <p>
            This is a heuristic substitution of the ambient dimension by an effective sparse dimension. It should be
            interpreted as an approximation rather than a sharp theorem for arbitrary sparse ensembles. The ordinary
            Welch expression is a bound on average squared overlap; using it as an exact variance assumes a well-spread,
            near-bound-achieving dictionary.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">Main result</h2>
          <p>Under the Welch-style sparse approximation, the pairwise overlap distribution is approximated by</p>
          <MathBlock>{String.raw`\alpha := \langle v_i, v_j \rangle \approx \mathcal{N}(0,\epsilon^2), \qquad i \ne j,`}</MathBlock>
          <p>where</p>
          <MathBlock>{String.raw`\epsilon^2 \approx \max\!\left(0,\frac{M-d_{\mathrm{eff}}}{d_{\mathrm{eff}}(M-1)}\right).`}</MathBlock>
          <p>
            <MathText>{String.raw`The readout error for coefficient \(a_i\) is approximately Gaussian:`}</MathText>
          </p>
          <MathBlock>{String.raw`\beta \approx \mathcal{N}\!\left(0,(K-1)\epsilon^2\right).`}</MathBlock>
          <p>Therefore the readout-error standard deviation is</p>
          <MathBlock>{String.raw`E = \sqrt{K-1}\,\epsilon.`}</MathBlock>
          <p>
            <MathText>{String.raw`If \(M\) is treated as free, then`}</MathText>
          </p>
          <MathBlock>{String.raw`K = 1 + \frac{E^2}{\epsilon^2}
= 1 + \frac{E^2 d_{\mathrm{eff}}(M-1)}{M-d_{\mathrm{eff}}}.`}</MathBlock>
          <p>
            <MathText>{String.raw`If one imposes \(M = cK\) with \(c = \mathrm{M\_factor} > 0\), then \(K\) obeys`}</MathText>
          </p>
          <MathBlock>{String.raw`cK^2 - \bigl((c+d_{\mathrm{eff}}) + cE^2 d_{\mathrm{eff}}\bigr)K + \bigl(d_{\mathrm{eff}} + E^2 d_{\mathrm{eff}}\bigr) = 0,`}</MathBlock>
          <p>and the relevant branch is</p>
          <MathBlock>{String.raw`K(E) = \frac{(c+d_{\mathrm{eff}}) + cE^2 d_{\mathrm{eff}} + \sqrt{\bigl((c+d_{\mathrm{eff}}) + cE^2 d_{\mathrm{eff}}\bigr)^2 - 4c\bigl(d_{\mathrm{eff}} + E^2 d_{\mathrm{eff}}\bigr)}}{2c}.`}</MathBlock>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">Proof</h2>
          <p>For distinct vectors, the pairwise overlap is approximated by</p>
          <MathBlock>{String.raw`\alpha = \langle v_i, v_j \rangle \approx \mathcal{N}(0,\epsilon^2),`}</MathBlock>
          <p>with variance</p>
          <MathBlock>{String.raw`\epsilon^2 \approx \max\!\left(0,\frac{M-d_{\mathrm{eff}}}{d_{\mathrm{eff}}(M-1)}\right).`}</MathBlock>
          <p>
            <MathText>{String.raw`To recover feature \(a_i\), take the inner product with \(v_i\):`}</MathText>
          </p>
          <MathBlock>{String.raw`X v_i^\top
= \left(\sum_{j=1}^K a_j v_j\right) v_i^\top
= a_i \langle v_i, v_i \rangle + \sum_{j \ne i} a_j \langle v_j, v_i \rangle.`}</MathBlock>
          <p>
            <MathText>{String.raw`Since \(v_i\) is unit norm, \(\langle v_i, v_i \rangle = 1\), so`}</MathText>
          </p>
          <MathBlock>{String.raw`X v_i^\top = a_i + \eta_i,
\qquad
\eta_i := \sum_{j \ne i} a_j \langle v_j, v_i \rangle.`}</MathBlock>
          <p>
            <MathText>{String.raw`Under the standard approximation that the coefficients \(a_j\) are unit-scale and the cross-terms are approximately independent with variance \(\epsilon^2\),`}</MathText>
          </p>
          <MathBlock>{String.raw`\operatorname{Var}(\eta_i) \approx (K-1)\epsilon^2.`}</MathBlock>
          <p>Hence</p>
          <MathBlock>{String.raw`\beta := \eta_i \approx \mathcal{N}\!\left(0,(K-1)\epsilon^2\right),
\qquad
E = \sqrt{K-1}\,\epsilon.`}</MathBlock>
          <p>
            <MathText>{String.raw`Solving \(E^2=(K-1)\epsilon^2\) gives \(K=1+E^2/\epsilon^2\). Substituting \(M=cK\) gives`}</MathText>
          </p>
          <MathBlock>{String.raw`E^2 = (K-1)\frac{cK-d_{\mathrm{eff}}}{d_{\mathrm{eff}}(cK-1)}.`}</MathBlock>
          <p>Multiplying through and moving all terms to one side gives</p>
          <MathBlock>{String.raw`0 = cK^2 - \bigl((c+d_{\mathrm{eff}}) + cE^2 d_{\mathrm{eff}}\bigr)K + \bigl(d_{\mathrm{eff}} + E^2 d_{\mathrm{eff}}\bigr).`}</MathBlock>
          <p>Taking the larger quadratic branch gives the plotted formula for <MathText>{String.raw`\(K(E)\)`}</MathText>.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">Corollary</h2>
          <p>
            <MathText>{String.raw`If one wishes to express the readout error distribution directly in terms of \(M\) and \(d_{\mathrm{eff}}\), then`}</MathText>
          </p>
          <MathBlock>{String.raw`\beta \approx \mathcal{N}\!\left(0,(K-1)\frac{M-d_{\mathrm{eff}}}{d_{\mathrm{eff}}(M-1)}\right).`}</MathBlock>
          <p>Hence the readout-error standard deviation is</p>
          <MathBlock>{String.raw`E = \sqrt{(K-1)\frac{M-d_{\mathrm{eff}}}{d_{\mathrm{eff}}(M-1)}}.`}</MathBlock>
          <p>
            <MathText>{String.raw`If, in addition, \(M=cK\), then \(K=M/c\), and this becomes`}</MathText>
          </p>
          <MathBlock>{String.raw`\beta \approx \mathcal{N}\!\left(0,\left(\frac{M}{c}-1\right)\frac{M-d_{\mathrm{eff}}}{d_{\mathrm{eff}}(M-1)}\right).`}</MathBlock>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">Compact summary</h2>
          <MathBlock>{String.raw`d_{\mathrm{eff}}=
\begin{cases}
\min(N,sN), & 0 < s \le 1,\\[4pt]
\min(N,s), & s > 1,
\end{cases}`}</MathBlock>
          <MathBlock>{String.raw`\alpha \approx \mathcal{N}(0,\epsilon^2),
\qquad
\epsilon^2 \approx \max\!\left(0,\frac{M-d_{\mathrm{eff}}}{d_{\mathrm{eff}}(M-1)}\right),`}</MathBlock>
          <MathBlock>{String.raw`\beta \approx \mathcal{N}\!\left(0,(K-1)\epsilon^2\right),
\qquad
E = \sqrt{K-1}\,\epsilon,`}</MathBlock>
          <MathBlock>{String.raw`K = 1 + \frac{E^2}{\epsilon^2}
= 1 + \frac{E^2 d_{\mathrm{eff}}(M-1)}{M-d_{\mathrm{eff}}},`}</MathBlock>
          <MathBlock>{String.raw`K(E) = \frac{(c+d_{\mathrm{eff}}) + cE^2 d_{\mathrm{eff}} + \sqrt{\bigl((c+d_{\mathrm{eff}}) + cE^2 d_{\mathrm{eff}}\bigr)^2 - 4c\bigl(d_{\mathrm{eff}} + E^2 d_{\mathrm{eff}}\bigr)}}{2c}
\qquad (M=cK).`}</MathBlock>
        </section>
      </CardContent>
    </Card>
  );
}

export default function SparseSuperpositionKPlot() {
  const [NText, setNText] = useState('1024');
  const [sText, setSText] = useState('0.25');
  const [mText, setMText] = useState('4');

  const N = parseNumber(NText);
  const s = parseNumber(sText);
  const mFactor = parseNumber(mText);

  const valid = Number.isFinite(N) && N > 0 && Number.isFinite(s) && s > 0 && Number.isFinite(mFactor) && mFactor > 0;

  const derived = useMemo(() => {
    const dEff = effectiveDimension(N, s);
    const supportSize = supportCountFromInput(s, N);
    const thresholdK = dEff > 0 && mFactor > 0 ? dEff / mFactor : NaN;
    const exampleE = 0.1;
    const example = solveKFromE(exampleE, N, s, mFactor);
    const eMax = 1;
    const points = [];
    const pointCount = 220;

    for (let i = 0; i < pointCount; i += 1) {
      const E = (i / (pointCount - 1)) * eMax;
      const result = solveKFromE(E, N, s, mFactor);
      if (Number.isFinite(result.K) && result.K >= 1) {
        const epsilon = epsilonWelchSparse(result.K, N, s, mFactor);
        points.push({
          E,
          K: result.K,
          epsilon,
          M: mFactor * result.K,
        });
      }
    }

    return {
      dEff,
      supportSize,
      thresholdK,
      exampleE,
      exampleK: example.K,
      exampleM: example.K * mFactor,
      eMax,
      points,
    };
  }, [N, s, mFactor]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <main className="mx-auto max-w-7xl space-y-8">
        <header className="max-w-4xl space-y-4">
          <div className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700">
            Mechanistic interpretability · interactive model
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            How many features can share one representation?
          </h1>
          <p className="max-w-3xl text-lg leading-8 text-slate-600">
            Neural networks can encode more possible features than they have activation dimensions by placing feature
            directions in superposition. This calculator shows the cost: unrelated active features leak into a linear
            readout as cross-talk.
          </p>
        </header>

        <Card className="rounded-2xl border-blue-100 bg-blue-50/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">The question this dashboard answers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-slate-700">
            <p>
              Given a representation width, a feature sparsity, and an acceptable amount of readout noise, the model
              estimates how many features can be active at the same time.
            </p>
            <p>
              It is an analytic intuition-builder, not a measurement of a trained network and not a universal capacity
              guarantee. The calculation assumes a simple dot-product decoder and a well-spread dictionary of feature
              directions.
            </p>
          </CardContent>
        </Card>

        <section aria-labelledby="mechanism-heading" className="space-y-4">
          <div className="space-y-1">
            <h2 id="mechanism-heading" className="text-2xl font-semibold text-slate-950">The mechanism</h2>
            <p className="text-sm text-slate-600">Follow one feature from encoding to readout.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <ConceptStep number="1" title="Encode">
              Each possible feature gets a unit direction vᵢ in an N-dimensional activation space. Sparsity controls how
              many coordinates that direction uses.
            </ConceptStep>
            <ConceptStep number="2" title="Superpose">
              One state X adds together the K features that are currently active. M is the larger dictionary of all
              possible feature directions.
            </ConceptStep>
            <ConceptStep number="3" title="Decode">
              Taking the dot product with vᵢ returns the desired coefficient aᵢ plus leakage from every other active
              direction. E measures the typical size of that leakage.
            </ConceptStep>
          </div>
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="grid gap-4 py-6 lg:grid-cols-2">
              <div className="space-y-2">
                <p className="font-semibold text-slate-900">The shared representation</p>
                <MathBlock>{String.raw`X=\sum_{j=1}^{K}a_jv_j`}</MathBlock>
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-slate-900">The readout: signal plus cross-talk</p>
                <MathBlock>{String.raw`\langle X,v_i\rangle=a_i+\underbrace{\sum_{j\ne i}a_j\langle v_j,v_i\rangle}_{\eta_i}`}</MathBlock>
              </div>
            </CardContent>
          </Card>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="rounded-2xl shadow-sm lg:col-span-1">
            <CardHeader>
              <CardTitle>Model inputs</CardTitle>
              <CardDescription>Change the representational setup; the capacity curve updates automatically.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-7">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="Ninput">N · representation width</Label>
                  <Input
                    id="Ninput"
                    aria-describedby="Nhelp"
                    value={NText}
                    onChange={(e) => setNText(e.target.value)}
                    className="max-w-28"
                  />
                </div>
                <input
                  aria-label="N representation width"
                  type="range"
                  min="1"
                  max="4096"
                  step="1"
                  value={Number.isFinite(N) ? clamp(N, 1, 4096) : 1024}
                  onChange={(e) => setNText(e.target.value)}
                  className="w-full"
                />
                <p id="Nhelp" className="text-xs leading-5 text-slate-500">
                  Number of activation coordinates available to the representation—for example, neurons or channels.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="sinput">s · feature sparsity</Label>
                  <Input
                    id="sinput"
                    aria-describedby="shelp"
                    value={sText}
                    onChange={(e) => setSText(e.target.value)}
                    className="max-w-28"
                  />
                </div>
                <input
                  aria-label="s feature sparsity"
                  type="range"
                  min="0.001"
                  max="1"
                  step="0.001"
                  value={Number.isFinite(s) ? clamp(s, 0.001, 1) : 0.25}
                  onChange={(e) => setSText(e.target.value)}
                  className="w-full"
                />
                <p id="shelp" className="text-xs leading-5 text-slate-500">
                  From 0 to 1, s is the fraction of coordinates used by each feature. Above 1, a typed value is treated
                  as the support count directly.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="minput">c · dictionary/activity ratio</Label>
                  <Input
                    id="minput"
                    aria-describedby="chelp"
                    value={mText}
                    onChange={(e) => setMText(e.target.value)}
                    className="max-w-28"
                  />
                </div>
                <input
                  aria-label="c dictionary to activity ratio"
                  type="range"
                  min="1"
                  max="1000"
                  step="1"
                  value={Number.isFinite(mFactor) ? clamp(mFactor, 1, 1000) : 4}
                  onChange={(e) => setMText(e.target.value)}
                  className="w-full"
                />
                <p id="chelp" className="text-xs leading-5 text-slate-500">
                  The model sets M = cK. At c = 4, the full dictionary contains four possible features for every feature
                  active in one state.
                </p>
              </div>

              {valid && (
                <div className="space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
                  <p className="font-semibold text-slate-900">Current setup</p>
                  <dl className="space-y-2 text-slate-600">
                    <div className="flex justify-between gap-4">
                      <dt>Coordinates per direction</dt>
                      <dd className="font-medium text-slate-900">{fmt(derived.supportSize)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>Effective dimension d_eff</dt>
                      <dd className="font-medium text-slate-900">{fmt(derived.dEff)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>Orthogonal-limit K = d_eff/c</dt>
                      <dd className="font-medium text-slate-900">{fmt(derived.thresholdK)}</dd>
                    </div>
                  </dl>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle>Capacity/error trade-off</CardTitle>
              <CardDescription>
                Each point gives the approximate active-feature count K at a tolerated readout-error scale E.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {valid ? (
                <div className="h-[420px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={derived.points} margin={{ top: 10, right: 24, left: 6, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="E"
                        type="number"
                        domain={[0, 1]}
                        ticks={[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]}
                        tickFormatter={fmtAxisDecimal}
                        label={{ value: 'Readout error E', position: 'insideBottom', offset: -2 }}
                      />
                      <YAxis tickFormatter={fmt} label={{ value: 'Active features K', angle: -90, position: 'insideLeft' }} />
                      <Tooltip
                        formatter={(value) => [fmt(Number(value)), 'Active features K']}
                        labelFormatter={(label) => 'Readout error E = ' + fmt(Number(label))}
                      />
                      <Line type="monotone" dataKey="K" dot={false} stroke="#2563eb" strokeWidth={2.5} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-24 text-center text-sm text-slate-600">Enter positive values for N, s, and c.</div>
              )}
              <p className="text-sm leading-6 text-slate-600">
                Read the curve up and to the right: accepting more typical decoder noise permits more active features.
                Hover over the line for exact values. The curve is the model's analytic equality boundary, not observed
                network performance.
              </p>
              {valid && Number.isFinite(derived.exampleK) && (
                <p className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
                  <strong>Concrete reading:</strong> with the current inputs, an error scale of E = {fmt(derived.exampleE)}
                  {' '}corresponds to about K = {fmt(derived.exampleK)} simultaneously active features and a total
                  dictionary size M = cK ≈ {fmt(derived.exampleM)}.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Why interference grows</CardTitle>
              <CardDescription>The causal chain behind the plotted trade-off.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-6 text-slate-600">
              <p>
                Once the dictionary has more directions than the effective dimension can keep orthogonal, distinct
                feature vectors overlap. The model calls the typical pairwise overlap ε.
              </p>
              <p>
                A readout sees cross-talk from K − 1 other active features. If those terms are roughly independent, their
                variances add, giving E = √(K − 1) ε. More representational width lowers overlap; more simultaneous
                features create more noise terms.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Symbol glossary</CardTitle>
              <CardDescription>The same symbols are used in the chart, explanation, and derivation.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                <div><dt className="font-semibold text-slate-900">M · possible features</dt><dd className="text-slate-600">Size of the full feature dictionary.</dd></div>
                <div><dt className="font-semibold text-slate-900">K · active features</dt><dd className="text-slate-600">Features present in one state.</dd></div>
                <div><dt className="font-semibold text-slate-900">d_eff · effective dimension</dt><dd className="text-slate-600">Usable dimension after sparsity.</dd></div>
                <div><dt className="font-semibold text-slate-900">ε · pair overlap</dt><dd className="text-slate-600">Cross-talk scale from one direction.</dd></div>
                <div><dt className="font-semibold text-slate-900">E · readout error</dt><dd className="text-slate-600">Combined cross-talk standard deviation.</dd></div>
                <div><dt className="font-semibold text-slate-900">aᵢ · feature strength</dt><dd className="text-slate-600">Coefficient the readout tries to recover.</dd></div>
              </dl>
            </CardContent>
          </Card>
        </section>

        <Card className="rounded-2xl border-amber-200 bg-amber-50 shadow-sm">
          <CardHeader>
            <CardTitle>What this model assumes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm leading-6 text-amber-950 md:grid-cols-2">
            <p>Feature coefficients are unit-scale, and cross-talk terms are approximately independent and Gaussian.</p>
            <p>Sparsity is summarized by d_eff, so support geometry and correlations between learned features are omitted.</p>
            <p>The Welch-style expression is treated as an overlap variance, which assumes a well-spread dictionary.</p>
            <p>The result describes a dot-product decoder; nonlinear or learned decoders may behave differently.</p>
          </CardContent>
        </Card>

        <TeXDocument />
      </main>
    </div>
  );
}
