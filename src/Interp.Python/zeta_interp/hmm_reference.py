"""Independent batched NumPy filtering and Baum-Welch for edge-emitting HMMs."""

from __future__ import annotations

import itertools

import numpy as np

from zeta_interp.mess3_replay import Stream, domain


def initialize(alphabet, states, seed):
    rng = Stream(domain(seed, 11))
    prior = np.array([0.1 + rng.next() for _ in range(states)])
    prior /= prior.sum()
    edges = np.array([0.1 + rng.next() for _ in range(alphabet * states * states)])
    edges = edges.reshape(alphabet, states, states)
    edges /= edges.sum(axis=(0, 2))[None, :, None]
    return prior, edges


def forward(prior, edges, corpus):
    batch, length = corpus.shape
    alpha = np.empty((length + 1, batch, len(prior)))
    scales = np.empty((length, batch))
    alpha[0] = prior
    for t, tokens in enumerate(corpus.T):
        alpha[t + 1] = np.einsum("bi,bij->bj", alpha[t], edges[tokens])
        scales[t] = alpha[t + 1].sum(axis=1)
        if np.any(scales[t] <= 0):
            raise ValueError("impossible history")
        alpha[t + 1] /= scales[t, :, None]
    return alpha, scales


def em_step(prior, edges, corpus):
    alpha, scales = forward(prior, edges, corpus)
    beta = np.ones_like(alpha[0])
    counts = np.zeros_like(edges)
    for t in reversed(range(corpus.shape[1])):
        symbol_edges = edges[corpus[:, t]]
        suffix = symbol_edges * (beta / scales[t, :, None])[:, None, :]
        xi = alpha[t, :, :, None] * suffix
        for symbol in range(len(edges)):
            counts[symbol] += xi[corpus[:, t] == symbol].sum(axis=0)
        beta = suffix.sum(axis=2)
    initial = (alpha[0] * beta).sum(axis=0)
    initial /= initial.sum()
    totals = counts.sum(axis=(0, 2))[None, :, None]
    updated = np.divide(counts, totals, out=edges.copy(), where=totals > 0)
    return initial, updated, -np.log(scales).sum()


def predict(prior, edges, contexts, horizon=4):
    state = forward(prior, edges, contexts)[0][-1]
    emissions = edges.sum(axis=2).T
    futures = []
    for word in itertools.product(range(len(edges)), repeat=horizon):
        vector = np.ones(len(prior))
        for token in reversed(word):
            vector = edges[token] @ vector
        futures.append(state @ vector)
    return state, state @ emissions, np.stack(futures, axis=1)
