md
# Sparse Superposition Capacity Under a Welch-Style Approximation

## Setup

Let

$$
X = \sum_{j=1}^{K} a_j v_j,
$$

where $V = \{v_1,\dots,v_M\}$ is a collection of unit vectors in $\mathbb{R}^N$. We assume each $v_i$ is sparse, with sparsity parameter $s$, interpreted as follows:

- if $0 < s \le 1$, then each vector has support size at most $sN$;
- if $s > 1$, then each vector has support size at most $s$.

Define the effective dimension

$$
d_{\mathrm{eff}} =
\begin{cases}
\min(N,sN), & 0 < s \le 1, \\
\min(N,s), & s > 1.
\end{cases}
$$

We study the pairwise overlap distribution and the readout error incurred when recovering a coefficient $a_i$ from the superposed vector $X$.

## Assumption: Welch-style sparse approximation

The pairwise overlaps of distinct vectors satisfy the approximation

$$
\langle v_i, v_j \rangle \approx \mathcal{N}(0,\epsilon^2), \qquad i \ne j,
$$

with variance modeled by the sparse Welch-style expression

$$
\epsilon^2 \approx \max\left(0,\frac{M-d_{\mathrm{eff}}}{d_{\mathrm{eff}}(M-1)}\right).
$$

This is a heuristic substitution of the ambient dimension by an effective sparse dimension. It should be interpreted as an approximation rather than a sharp theorem for arbitrary sparse ensembles.

## Main Result

### Theorem: Sparse superposition capacity

Under the Welch-style sparse approximation above, the following hold.

1. The pairwise overlap distribution is approximated by

$$
\alpha := \langle v_i, v_j \rangle \approx \mathcal{N}(0,\epsilon^2), \qquad i \ne j,
$$

where

$$
\epsilon^2 \approx \max\left(0,\frac{M-d_{\mathrm{eff}}}{d_{\mathrm{eff}}(M-1)}\right).
$$

2. The readout error for coefficient $a_i$ is approximately Gaussian:

$$
\beta \approx \mathcal{N}\left(0,(K-1)\epsilon^2\right).
$$

Therefore the readout-error standard deviation is

$$
E = \sqrt{K-1}\,\epsilon.
$$

3. If $M$ is treated as free, then

$$
K = 1 + \frac{E^2}{\epsilon^2}
= 1 + \frac{E^2 d_{\mathrm{eff}}(M-1)}{M-d_{\mathrm{eff}}}.
$$

4. If one imposes the relation

$$
M = cK
\qquad \text{with } c = M_{\mathrm{factor}} > 0,
$$

then $K$ obeys the quadratic equation

$$
cK^2
- \left((c+d_{\mathrm{eff}}) + cE^2 d_{\mathrm{eff}}\right)K
+ \left(d_{\mathrm{eff}} + E^2 d_{\mathrm{eff}}\right)
= 0,
$$

and the relevant branch is

$$
K(E) =
\frac{
(c+d_{\mathrm{eff}}) + cE^2 d_{\mathrm{eff}}
+
\sqrt{
\left((c+d_{\mathrm{eff}}) + cE^2 d_{\mathrm{eff}}\right)^2
- 4c\left(d_{\mathrm{eff}} + E^2 d_{\mathrm{eff}}\right)
}
}{2c}.
$$

## Proof

### Step 1: Pairwise overlap distribution

By assumption, for distinct $i \ne j$ we approximate the pairwise overlap by

$$
\alpha = \langle v_i, v_j \rangle \approx \mathcal{N}(0,\epsilon^2),
$$

with variance

$$
\epsilon^2 \approx \max\left(0,\frac{M-d_{\mathrm{eff}}}{d_{\mathrm{eff}}(M-1)}\right).
$$

This establishes the first claim.

### Step 2: Readout error distribution

To recover feature $a_i$, take the inner product with $v_i$:

$$
Xv_i^\top
=
\left(\sum_{j=1}^{K} a_j v_j\right)v_i^\top
=
a_i\langle v_i,v_i\rangle
+
\sum_{j \ne i} a_j\langle v_j,v_i\rangle.
$$

Since $v_i$ is unit norm, $\langle v_i,v_i\rangle = 1$, so

$$
Xv_i^\top = a_i + \eta_i,
\qquad
\eta_i := \sum_{j \ne i} a_j\langle v_j,v_i\rangle.
$$

Under the standard approximation that the coefficients $a_j$ are unit-scale and the cross-terms are approximately independent with variance $\epsilon^2$, the variance of $\eta_i$ is

$$
\mathrm{Var}(\eta_i) \approx (K-1)\epsilon^2.
$$

Hence

$$
\beta := \eta_i \approx \mathcal{N}\left(0,(K-1)\epsilon^2\right).
$$

The associated standard deviation is therefore

$$
E = \sqrt{(K-1)\epsilon^2} = \sqrt{K-1}\,\epsilon.
$$

This proves the second claim.

### Step 3: Solve for $K$ when $M$ is free

From

$$
E^2 = (K-1)\epsilon^2,
$$

we immediately obtain

$$
K = 1 + \frac{E^2}{\epsilon^2}.
$$

Substituting the Welch-style approximation for $\epsilon^2$ gives

$$
K
=
1
+
\frac{E^2}{\frac{M-d_{\mathrm{eff}}}{d_{\mathrm{eff}}(M-1)}}
=
1
+
\frac{E^2 d_{\mathrm{eff}}(M-1)}{M-d_{\mathrm{eff}}}.
$$

This proves the third claim.

### Step 4: Impose $M=cK$

Now suppose

$$
M = cK.
$$

Then the overlap variance becomes

$$
\epsilon^2
=
\frac{cK-d_{\mathrm{eff}}}{d_{\mathrm{eff}}(cK-1)}
$$

whenever the positive part is active. Substituting into

$$
E^2 = (K-1)\epsilon^2
$$

yields

$$
E^2
=
(K-1)
\frac{cK-d_{\mathrm{eff}}}{d_{\mathrm{eff}}(cK-1)}.
$$

Multiplying through by $d_{\mathrm{eff}}(cK-1)$ gives

$$
E^2 d_{\mathrm{eff}}(cK-1)
=
(K-1)(cK-d_{\mathrm{eff}}).
$$

Expand both sides:

$$
cE^2 d_{\mathrm{eff}}K
-
E^2 d_{\mathrm{eff}}
=
cK^2
-
(c+d_{\mathrm{eff}})K
+
d_{\mathrm{eff}}.
$$

Move all terms to one side:

$$
0
=
cK^2
-
\left((c+d_{\mathrm{eff}}) + cE^2 d_{\mathrm{eff}}\right)K
+
\left(d_{\mathrm{eff}} + E^2 d_{\mathrm{eff}}\right).
$$

Thus $K$ satisfies the quadratic

$$
cK^2
-
\left((c+d_{\mathrm{eff}}) + cE^2 d_{\mathrm{eff}}\right)K
+
\left(d_{\mathrm{eff}} + E^2 d_{\mathrm{eff}}\right)
=
0.
$$

Applying the quadratic formula and taking the larger branch gives

$$
K(E)
=
\frac{
(c+d_{\mathrm{eff}}) + cE^2 d_{\mathrm{eff}}
+
\sqrt{
\left((c+d_{\mathrm{eff}}) + cE^2 d_{\mathrm{eff}}\right)^2
-
4c\left(d_{\mathrm{eff}} + E^2 d_{\mathrm{eff}}\right)
}
}{2c}.
$$

This proves the final claim.

## Corollary: Readout error in terms of $M$ and $d_{\mathrm{eff}}$

If one wishes to express the readout error distribution directly in terms of $M$ and $d_{\mathrm{eff}}$, then substituting the overlap variance into the Gaussian approximation gives

$$
\beta
\approx
\mathcal{N}\left(
0,
(K-1)
\frac{M-d_{\mathrm{eff}}}{d_{\mathrm{eff}}(M-1)}
\right).
$$

Hence the readout-error standard deviation is

$$
E
=
\sqrt{
(K-1)
\frac{M-d_{\mathrm{eff}}}{d_{\mathrm{eff}}(M-1)}
}.
$$

If, in addition, $M=cK$, then $K=M/c$ and this becomes

$$
\beta
\approx
\mathcal{N}\left(
0,
\left(\frac{M}{c}-1\right)
\frac{M-d_{\mathrm{eff}}}{d_{\mathrm{eff}}(M-1)}
\right).
$$

## Compact Summary

$$
d_{\mathrm{eff}}
=
\begin{cases}
\min(N,sN), & 0 < s \le 1, \\
\min(N,s), & s > 1,
\end{cases}
$$

$$
\alpha
\approx
\mathcal{N}(0,\epsilon^2),
\qquad
\epsilon^2
\approx
\max\left(
0,
\frac{M-d_{\mathrm{eff}}}{d_{\mathrm{eff}}(M-1)}
\right),
$$

$$
\beta
\approx
\mathcal{N}\left(0,(K-1)\epsilon^2\right),
\qquad
E
=
\sqrt{K-1}\,\epsilon,
$$

$$
K
=
1
+
\frac{E^2}{\epsilon^2}
=
1
+
\frac{E^2 d_{\mathrm{eff}}(M-1)}{M-d_{\mathrm{eff}}},
$$

$$
K(E)
=
\frac{
(c+d_{\mathrm{eff}}) + cE^2 d_{\mathrm{eff}}
+
\sqrt{
\left((c+d_{\mathrm{eff}}) + cE^2 d_{\mathrm{eff}}\right)^2
-
4c\left(d_{\mathrm{eff}} + E^2 d_{\mathrm{eff}}\right)
}
}{2c}
\qquad
(M=cK).
$$
