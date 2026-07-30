# Sparse Superposition Capacity

An interactive explanation of how many features can share a finite-dimensional representation before a simple linear readout becomes noisy.

**[Open the interactive dashboard](https://forestdweller014.github.io/superposition-dashboard/)**

## What question does this project answer?

Neural networks often represent more possible features than they have activation dimensions. They can do this through **superposition**: each feature is assigned a direction in activation space, and the directions for all currently active features are added together.

This saves dimensions, but it creates interference. If two feature directions are not orthogonal, reading one feature also picks up a little of the others. This project explores the resulting trade-off:

> Given a representation width, feature sparsity, and acceptable readout noise, approximately how many features can be active at the same time?

The dashboard is an analytic calculator for a deliberately simplified model. It is useful for building intuition about superposition; it is not a measurement of a trained neural network and it does not establish a universal capacity theorem.

## The mechanism in three steps

### 1. Encode each possible feature as a direction

There are `M` possible features. Feature `i` has a unit vector `v_i` in an `N`-dimensional activation space. A sparse feature direction uses only some of the `N` coordinates.

### 2. Add the active features together

If `K` features are active with strengths `a_j`, the network state is modeled as

```math
X = \sum_{j=1}^{K} a_j v_j.
```

This is superposition: several feature signals occupy the same activation vector `X`.

### 3. Read a feature back out

To estimate feature `i`, take the dot product of `X` with its direction `v_i`:

```math
\langle X,v_i\rangle
= a_i + \underbrace{\sum_{j\ne i} a_j\langle v_j,v_i\rangle}_{\text{cross-talk }\eta_i}.
```

The desired signal is `a_i`. Every other active feature contributes cross-talk according to the overlap between its direction and `v_i`. The project calls the standard deviation of this readout error `E`.

## Parameters

| Symbol | Meaning | Mechanistic interpretation |
| --- | --- | --- |
| `N` | Ambient dimension | Number of available activation coordinates, such as neurons or channels. |
| `s` | Sparsity setting | Fraction of coordinates used by each feature, restricted to `0 < s <= 1`. |
| `d_eff` | Effective dimension | The model's estimate of how many coordinates are effectively available to each sparse direction. |
| `M` | Dictionary size | Fixed total number of possible feature directions. Set it directly or derive it from `M = cN`. |
| `K` | Active-feature count | Number of features simultaneously present in one state `X`. This is the plotted capacity. |
| `c` | Dictionary/width ratio | The dashboard uses `M = cN`. A value of `c = 4` means four possible feature directions per embedding dimension. |
| `epsilon` | Pairwise overlap scale | Typical correlation between two distinct feature directions. |
| `E` | Readout-error scale | Standard deviation of the accumulated cross-talk when one feature is decoded. |

The effective dimension used by the approximation is

```math
d_{\mathrm{eff}} =
\min(N,sN)=sN,
\qquad 0 < s \le 1.
```

For example, `N = 1024` and `s = 0.25` give `d_eff = 256`: each feature direction effectively uses 256 of the 1024 coordinates.

## How to read the dashboard

- The horizontal axis is `E`, the tolerated standard deviation of readout cross-talk. Moving right means accepting noisier feature estimates.
- The vertical axis is `K`, the approximate number of simultaneously active features at that error level.
- Increasing `N` usually increases capacity because there is more representational room.
- Decreasing fractional `s` reduces `d_eff` in this heuristic, which increases overlap and reduces capacity.
- Increasing `c` increases the fixed dictionary size `M = cN`, creating more possible feature directions in the same embedding.
- Editing `c` updates `M`; editing `M` directly updates `c = M/N`.

Every point on the curve uses the same fixed `N` and `M`; only the tolerated error and resulting active count change. Points below the error boundary are interpreted as feasible under the approximation. The curve is not an empirical confidence interval or a guaranteed maximum.

## Where the curve comes from

The ordinary Welch bound lower-bounds the average squared overlap of `M` unit vectors in `d` dimensions. This project makes a **Welch-style sparse approximation** by substituting `d_eff` for `d` and treating the bound as the variance of approximately Gaussian pairwise overlaps:

```math
\langle v_i,v_j\rangle \approx \mathcal{N}(0,\epsilon^2),
\qquad
\epsilon^2 \approx \max\!\left(0,\frac{M-d_{\mathrm{eff}}}{d_{\mathrm{eff}}(M-1)}\right).
```

When `M <= d_eff`, the positive part is zero: this idealized model allows the directions to be orthogonal. When `M > d_eff`, overlap is unavoidable.

Assuming unit-scale coefficients and approximately independent cross-talk terms, the variances from the other `K - 1` active features add:

```math
\eta_i \approx \mathcal{N}\!\left(0,(K-1)\epsilon^2\right),
\qquad
E = \sqrt{K-1}\,\epsilon.
```

The dashboard fixes the dictionary using

```math
M=cN.
```

Because `M` is independent of `K`, solving for `K` gives

```math
K(E)=\min\!\left(M,1+\frac{E^2}{\epsilon^2}\right)
=\min\!\left(M,1+\frac{E^2 d_{\mathrm{eff}}(M-1)}{M-d_{\mathrm{eff}}}\right).
```

The cap at `M` enforces that no more features can be active than exist in the dictionary. The fraction form applies when `M > d_eff`. When `M <= d_eff`, the approximation gives zero overlap and permits all `M` dictionary features to be active without cross-talk.

## Assumptions and limitations

The model is intentionally heuristic:

- Replacing ambient dimension with `d_eff` is not a sharp sparse-vector theorem. The actual overlap also depends on how supports are chosen and shared.
- The Gaussian, zero-mean, and independence assumptions need not hold for learned feature directions.
- The readout calculation assumes unit-scale, roughly independent coefficients. Other coefficient variances rescale the error.
- The Welch expression concerns average squared overlap; treating it as the exact overlap variance assumes a well-spread, near-bound-achieving dictionary.
- Real networks can use nonlinear decoding, structured features, correlated activations, and learned error correction that this model omits.
- `K(E)` is an approximate equality boundary, not a certified capacity guarantee.

## Run locally

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run lint
npm run build
```
