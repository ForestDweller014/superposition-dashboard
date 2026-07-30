import { useEffect, useState } from 'react';
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

function fmtInput(x) {
  if (!Number.isFinite(x)) return '';
  if (Number.isInteger(x)) return String(x);
  return trimTrailingZeros(x.toFixed(6));
}

function supportCountFromInput(s, N) {
  if (!Number.isFinite(s) || s <= 0 || s > 1 || !Number.isFinite(N) || N <= 0) return 0;
  return s * N;
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

function solveKFromE(E, M, N, s) {
  const dEff = effectiveDimension(N, s);

  if (!(dEff > 0) || !(M >= 1) || !(E >= 0)) {
    return { K: NaN, dEff, epsilonSquared: NaN };
  }

  const epsilonSquared = epsilonSquaredFromM(M, N, s);

  if (epsilonSquared === 0) {
    return { K: M, dEff, epsilonSquared };
  }

  const K = Math.min(M, 1 + (E * E) / epsilonSquared);
  return { K, dEff, epsilonSquared };
}

function InlineMath({ children }) {
  return <span className="inline-math">{String.raw`\(${children}\)`}</span>;
}

function MathBlock({ children }) {
  return (
    <div className="math-block rounded-xl border border-slate-200 bg-slate-50 text-slate-900">
      <div className="math-scroll">{String.raw`\[${children}\]`}</div>
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
            Let <InlineMath>{String.raw`V=\{v_1,\dots,v_M\}`}</InlineMath> be a collection of unit vectors in{' '}
            <InlineMath>{String.raw`\mathbb{R}^N`}</InlineMath>. Each <InlineMath>{String.raw`v_i`}</InlineMath> is sparse,
            with <InlineMath>{String.raw`0<s\le 1`}</InlineMath> denoting the fraction of its coordinates that are nonzero.
          </p>
          <p>Define the effective dimension</p>
          <MathBlock>{String.raw`d_{\mathrm{eff}}=\min(N,sN)=sN,\qquad 0<s\le 1.`}</MathBlock>
          <p>
            We study the pairwise overlap distribution and the readout error incurred when recovering a coefficient
            {' '}<InlineMath>{String.raw`a_i`}</InlineMath> from the superposed vector{' '}
            <InlineMath>{String.raw`X`}</InlineMath>.
          </p>
          <p>
            Mechanistically, <InlineMath>{String.raw`M`}</InlineMath> counts all feature directions available to the
            representation, while <InlineMath>{String.raw`K`}</InlineMath> counts only the features active in this one
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
          <p>The readout error for coefficient <InlineMath>{String.raw`a_i`}</InlineMath> is approximately Gaussian:</p>
          <MathBlock>{String.raw`\beta \approx \mathcal{N}\!\left(0,(K-1)\epsilon^2\right).`}</MathBlock>
          <p>Therefore the readout-error standard deviation is</p>
          <MathBlock>{String.raw`E = \sqrt{K-1}\,\epsilon.`}</MathBlock>
          <p>
            The dashboard fixes the dictionary size with <InlineMath>{String.raw`M=cN`}</InlineMath>. When{' '}
            <InlineMath>{String.raw`\epsilon>0`}</InlineMath>, solving for the active-feature count gives
          </p>
          <MathBlock>{String.raw`K(E)=\min\!\left(M,\,1+\frac{E^2}{\epsilon^2}\right)
=\min\!\left(M,\,1+\frac{E^2d_{\mathrm{eff}}(M-1)}{M-d_{\mathrm{eff}}}\right),\qquad M=cN.`}</MathBlock>
          <p>
            The cap at <InlineMath>{String.raw`M`}</InlineMath> enforces that no more features can be active than exist in
            the dictionary. If <InlineMath>{String.raw`M\le d_{\mathrm{eff}}`}</InlineMath>, the approximation gives zero
            overlap and the model permits all <InlineMath>{String.raw`M`}</InlineMath> features to be active without
            cross-talk.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">Proof</h2>
          <p>For distinct vectors, the pairwise overlap is approximated by</p>
          <MathBlock>{String.raw`\alpha = \langle v_i, v_j \rangle \approx \mathcal{N}(0,\epsilon^2),`}</MathBlock>
          <p>with variance</p>
          <MathBlock>{String.raw`\epsilon^2 \approx \max\!\left(0,\frac{M-d_{\mathrm{eff}}}{d_{\mathrm{eff}}(M-1)}\right).`}</MathBlock>
          <p>
            To recover feature <InlineMath>{String.raw`a_i`}</InlineMath>, take the inner product with{' '}
            <InlineMath>{String.raw`v_i`}</InlineMath>:
          </p>
          <MathBlock>{String.raw`X v_i^\top
= \left(\sum_{j=1}^K a_j v_j\right) v_i^\top
= a_i \langle v_i, v_i \rangle + \sum_{j \ne i} a_j \langle v_j, v_i \rangle.`}</MathBlock>
          <p>
            Since <InlineMath>{String.raw`v_i`}</InlineMath> is unit norm,{' '}
            <InlineMath>{String.raw`\langle v_i,v_i\rangle=1`}</InlineMath>, so
          </p>
          <MathBlock>{String.raw`X v_i^\top = a_i + \eta_i,
\qquad
\eta_i := \sum_{j \ne i} a_j \langle v_j, v_i \rangle.`}</MathBlock>
          <p>
            Under the standard approximation that the coefficients <InlineMath>{String.raw`a_j`}</InlineMath> are
            unit-scale and the cross-terms are approximately independent with variance{' '}
            <InlineMath>{String.raw`\epsilon^2`}</InlineMath>,
          </p>
          <MathBlock>{String.raw`\operatorname{Var}(\eta_i) \approx (K-1)\epsilon^2.`}</MathBlock>
          <p>Hence</p>
          <MathBlock>{String.raw`\beta := \eta_i \approx \mathcal{N}\!\left(0,(K-1)\epsilon^2\right),
\qquad
E = \sqrt{K-1}\,\epsilon.`}</MathBlock>
          <p>
            Solving <InlineMath>{String.raw`E^2=(K-1)\epsilon^2`}</InlineMath> gives{' '}
            <InlineMath>{String.raw`K=1+E^2/\epsilon^2`}</InlineMath>. Because the dictionary is fixed by{' '}
            <InlineMath>{String.raw`M=cN`}</InlineMath>, no quadratic is required.
          </p>
          <MathBlock>{String.raw`K(E)=\min\!\left(M,\,1+\frac{E^2d_{\mathrm{eff}}(M-1)}{M-d_{\mathrm{eff}}}\right),\qquad M=cN.`}</MathBlock>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">Compact summary</h2>
          <MathBlock>{String.raw`d_{\mathrm{eff}}=\min(N,sN)=sN,\qquad 0<s\le 1.`}</MathBlock>
          <MathBlock>{String.raw`\alpha \approx \mathcal{N}(0,\epsilon^2),
\qquad
\epsilon^2 \approx \max\!\left(0,\frac{M-d_{\mathrm{eff}}}{d_{\mathrm{eff}}(M-1)}\right),`}</MathBlock>
          <MathBlock>{String.raw`\beta \approx \mathcal{N}\!\left(0,(K-1)\epsilon^2\right),
\qquad
E = \sqrt{K-1}\,\epsilon,`}</MathBlock>
          <MathBlock>{String.raw`K = 1 + \frac{E^2}{\epsilon^2}
= 1 + \frac{E^2 d_{\mathrm{eff}}(M-1)}{M-d_{\mathrm{eff}}}.`}</MathBlock>
          <MathBlock>{String.raw`M=cN,\qquad K(E)=\min\!\left(M,\,1+\frac{E^2}{\epsilon^2}\right).`}</MathBlock>
        </section>
      </CardContent>
    </Card>
  );
}

export default function SparseSuperpositionKPlot() {
  const [NText, setNText] = useState('1024');
  const [sText, setSText] = useState('0.25');
  const [cText, setCText] = useState('4');
  const [MText, setMText] = useState('4096');

  const N = parseNumber(NText);
  const s = parseNumber(sText);
  const c = parseNumber(cText);
  const M = parseNumber(MText);

  const validN = Number.isFinite(N) && N > 0;
  const validS = Number.isFinite(s) && s > 0 && s <= 1;
  const validC = Number.isFinite(c) && c > 0;
  const validM = Number.isFinite(M) && M >= 1;
  const valid = validN && validS && validC && validM;

  const updateN = (value) => {
    setNText(value);
    const nextN = parseNumber(value);
    const currentC = parseNumber(cText);
    if (nextN > 0 && currentC > 0) setMText(fmtInput(currentC * nextN));
  };

  const updateC = (value) => {
    setCText(value);
    const nextC = parseNumber(value);
    if (nextC > 0 && validN) setMText(fmtInput(nextC * N));
  };

  const updateM = (value) => {
    setMText(value);
    const nextM = parseNumber(value);
    if (nextM >= 1 && validN) setCText(fmtInput(nextM / N));
  };

  const derived = (() => {
    const dEff = effectiveDimension(N, s);
    const supportSize = supportCountFromInput(s, N);
    const epsilonSquared = epsilonSquaredFromM(M, N, s);
    const epsilon = Math.sqrt(epsilonSquared);
    const exampleE = 0.1;
    const example = solveKFromE(exampleE, M, N, s);
    const eMax = 1;
    const points = [];
    const pointCount = 220;

    for (let i = 0; i < pointCount; i += 1) {
      const E = (i / (pointCount - 1)) * eMax;
      const result = solveKFromE(E, M, N, s);
      if (Number.isFinite(result.K) && result.K >= 1) {
        points.push({
          E,
          K: result.K,
          epsilon,
          M,
        });
      }
    }

    return {
      dEff,
      supportSize,
      epsilon,
      exampleE,
      exampleK: example.K,
      eMax,
      points,
    };
  })();

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
                    onChange={(e) => updateN(e.target.value)}
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
                  onChange={(e) => updateN(e.target.value)}
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
                    aria-invalid={!validS}
                    type="number"
                    min="0.001"
                    max="1"
                    step="0.001"
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
                <p id="shelp" className={`text-xs leading-5 ${validS ? 'text-slate-500' : 'font-medium text-red-600'}`}>
                  {validS
                    ? 's is the fraction of coordinates used by each feature and must be greater than 0 and at most 1.'
                    : 'Enter a sparsity greater than 0 and at most 1. Values outside this interval are invalid.'}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="cinput">c · dictionary/width ratio</Label>
                  <Input
                    id="cinput"
                    aria-describedby="chelp"
                    aria-invalid={!validC}
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={cText}
                    onChange={(e) => updateC(e.target.value)}
                    className="max-w-28"
                  />
                </div>
                <input
                  aria-label="c dictionary to representation width ratio"
                  type="range"
                  min="1"
                  max="1000"
                  step="1"
                  value={Number.isFinite(c) ? clamp(c, 1, 1000) : 4}
                  onChange={(e) => updateC(e.target.value)}
                  className="w-full"
                />
                <p id="chelp" className={`text-xs leading-5 ${validC ? 'text-slate-500' : 'font-medium text-red-600'}`}>
                  {validC
                    ? 'The model sets M = cN. At c = 4, the dictionary contains four possible features per embedding dimension.'
                    : 'Enter a positive dictionary-to-width ratio.'}
                </p>
              </div>

              <div className="space-y-2 rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="Minput">M · dictionary size</Label>
                  <Input
                    id="Minput"
                    aria-describedby="Mhelp"
                    aria-invalid={!validM}
                    type="number"
                    min="1"
                    step="1"
                    value={MText}
                    onChange={(e) => updateM(e.target.value)}
                    className="max-w-32"
                  />
                </div>
                <p id="Mhelp" className={`text-xs leading-5 ${validM ? 'text-slate-500' : 'font-medium text-red-600'}`}>
                  {validM
                    ? 'Set M directly here. The c field updates to preserve c = M/N.'
                    : 'Enter a dictionary containing at least one possible feature.'}
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
                      <dt>Dictionary size M = cN</dt>
                      <dd className="font-medium text-slate-900">{fmt(M)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>Pairwise overlap ε</dt>
                      <dd className="font-medium text-slate-900">{fmt(derived.epsilon)}</dd>
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
                Holding N and M fixed, each point gives the approximate active-feature count K at error scale E.
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
                <div className="py-24 text-center text-sm text-slate-600">
                  Enter positive values for N, c, and M, and a sparsity s greater than 0 and at most 1.
                </div>
              )}
              <p className="text-sm leading-6 text-slate-600">
                Read the curve up and to the right: accepting more typical decoder noise permits more active features.
                Every point describes the same fixed dictionary. Hover over the line for exact values. The curve is the
                model's analytic equality boundary, not observed network performance.
              </p>
              {valid && Number.isFinite(derived.exampleK) && (
                <p className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
                  <strong>Concrete reading:</strong> with the current inputs, an error scale of E = {fmt(derived.exampleE)}
                  {' '}corresponds to about K = {fmt(derived.exampleK)} simultaneously active features out of the fixed
                  dictionary of M = {fmt(M)} possible features.
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
