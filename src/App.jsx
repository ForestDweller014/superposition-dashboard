import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
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
    <div className="overflow-x-auto rounded-xl bg-slate-50 p-3">
      {String.raw`\[${children}\]`}
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
        <CardTitle>Sparse Superposition Capacity Under a Welch-Style Approximation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 text-sm leading-7 text-slate-700">
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">Setup</h2>
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
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">Welch-style sparse approximation</h2>
          <p>The pairwise overlaps of distinct vectors satisfy the approximation</p>
          <MathBlock>{String.raw`\langle v_i, v_j \rangle \approx \mathcal{N}(0,\epsilon^2), \qquad i \ne j,`}</MathBlock>
          <p>with variance modeled by the sparse Welch-style expression</p>
          <MathBlock>{String.raw`\epsilon^2 \approx \max\!\left(0,\frac{M-d_{\mathrm{eff}}}{d_{\mathrm{eff}}(M-1)}\right).`}</MathBlock>
          <p>
            This is a heuristic substitution of the ambient dimension by an effective sparse dimension. It should be
            interpreted as an approximation rather than a sharp theorem for arbitrary sparse ensembles.
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
    const thresholdK = dEff > 0 && mFactor > 0 ? dEff / mFactor : NaN;
    const asymptoticE = dEff > 0 ? 1 / Math.sqrt(dEff) : 1;
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
      thresholdK,
      asymptoticE,
      eMax,
      points,
    };
  }, [N, s, mFactor]);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Sparse superposition capacity: K(E)</h1>
          <p className="max-w-4xl text-sm text-slate-600">
            This tool plots the recovered capacity K as a function of the tolerated readout-error standard deviation E,
            using a sparse Welch-style approximation with an effective dimension d_eff.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="rounded-2xl shadow-sm lg:col-span-1">
            <CardHeader>
              <CardTitle>Controls</CardTitle>
              <CardDescription>Each parameter has both a slider and a free-form input.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-3">
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Label htmlFor="Ninput" style={{ minWidth: 18 }}>N</Label>
                  <Input
                    id="Ninput"
                    value={NText}
                    onChange={(e) => setNText(e.target.value)}
                    className="max-w-[180px]"
                  />
                </div>
                <input
                  type="range"
                  min="1"
                  max="4096"
                  step="1"
                  value={Number.isFinite(N) ? clamp(N, 1, 4096) : 1024}
                  onChange={(e) => setNText(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="space-y-3">
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Label htmlFor="sinput" style={{ minWidth: 18 }}>s</Label>
                  <Input
                    id="sinput"
                    value={sText}
                    onChange={(e) => setSText(e.target.value)}
                    className="max-w-[180px]"
                  />
                </div>
                <input
                  type="range"
                  min="0.001"
                  max="1"
                  step="0.001"
                  value={Number.isFinite(s) ? clamp(s, 0.001, 1) : 0.25}
                  onChange={(e) => setSText(e.target.value)}
                  style={{ width: '100%' }}
                />
                <p className="text-xs text-slate-500">
                  If s is between 0 and 1, it is treated as a density so the support size is s times N. If s is greater
                  than 1, it is treated as a direct support count.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="minput">M_factor</Label>
                  <Input
                    id="minput"
                    value={mText}
                    onChange={(e) => setMText(e.target.value)}
                    className="max-w-[180px]"
                  />
                </div>
                <input
                  type="range"
                  min="1"
                  max="1000"
                  step="1"
                  value={Number.isFinite(mFactor) ? clamp(mFactor, 1, 1000) : 4}
                  onChange={(e) => setMText(e.target.value)}
                  style={{ width: '100%' }}
                />
                <p className="text-xs text-slate-500">The app imposes M = M_factor × K.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle>Plot of K(E)</CardTitle>
              <CardDescription>
                The curve is generated from the closed-form quadratic branch implied by the sparse Welch-style error model.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {valid ? (
                <div style={{ width: '100%', height: 420 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={derived.points} margin={{ top: 10, right: 24, left: 6, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="E"
                        type="number"
                        domain={[0, 1]}
                        ticks={[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]}
                        tickFormatter={fmtAxisDecimal}
                        label={{ value: 'E', position: 'insideBottom', offset: -2 }}
                      />
                      <YAxis tickFormatter={fmt} label={{ value: 'K', angle: -90, position: 'insideLeft' }} />
                      <Tooltip
                        formatter={(value, name) => [fmt(Number(value)), name]}
                        labelFormatter={(label) => 'E = ' + fmtAxisDecimal(Number(label))}
                      />
                      <ReferenceLine
                        x={derived.asymptoticE}
                        strokeDasharray="4 4"
                        label={derived.asymptoticE <= 1 ? '1/sqrt(d_eff)' : undefined}
                      />
                      <Line type="monotone" dataKey="K" dot={false} strokeWidth={2} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-sm text-slate-600">Enter positive values for N, s, and M_factor.</div>
              )}
            </CardContent>
          </Card>
        </div>

        <TeXDocument />
      </div>
    </div>
  );
}
