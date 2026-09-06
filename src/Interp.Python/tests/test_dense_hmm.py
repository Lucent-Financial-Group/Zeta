"""Brute-force hidden-path witness for the independent EM reference."""

import itertools

import numpy as np

from zeta_interp.hmm_reference import em_step, predict


def test_em_counts_match_hidden_path_enumeration():
    prior = np.array([0.6, 0.4])
    edges = np.array([0.4, 0.1, 0.2, 0.1, 0.1, 0.4, 0.3, 0.4]).reshape(2, 2, 2)
    corpus = np.array([[0, 1, 0], [1, 1, 0], [0, 0, 1]])
    counts = np.zeros_like(edges)
    initials = np.zeros_like(prior)
    for word in corpus:
        paths = list(itertools.product(range(2), repeat=4))
        weights = np.array(
            [
                prior[p[0]]
                * np.prod([edges[x, p[t], p[t + 1]] for t, x in enumerate(word)])
                for p in paths
            ]
        )
        for path, weight in zip(paths, weights / weights.sum(), strict=True):
            initials[path[0]] += weight
            for t, x in enumerate(word):
                counts[x, path[t], path[t + 1]] += weight
    expected = counts / counts.sum(axis=(0, 2))[None, :, None]
    fitted_prior, fitted_edges, _ = em_step(prior, edges, corpus)
    np.testing.assert_allclose(fitted_prior, initials / initials.sum(), atol=1e-14)
    np.testing.assert_allclose(fitted_edges, expected, atol=1e-14)
    state, prediction, futures = predict(prior, edges, corpus)
    for values in (state, prediction, futures):
        np.testing.assert_allclose(values.sum(axis=1), 1, atol=1e-14)


def test_native_fixture_matches_independent_variable_length_em():
    prior = np.array([0.6, 0.4])
    edges = np.array([0.4, 0.1, 0.2, 0.1, 0.1, 0.4, 0.3, 0.4]).reshape(2, 2, 2)
    corpus = [[0, 1, 0], [1, 1], [0, 0, 1, 1]]
    for _ in range(3):
        counts = np.zeros_like(edges)
        initials = np.zeros_like(prior)
        for word in corpus:
            paths = list(itertools.product(range(2), repeat=len(word) + 1))
            weights = np.array(
                [
                    prior[p[0]]
                    * np.prod([edges[x, p[t], p[t + 1]] for t, x in enumerate(word)])
                    for p in paths
                ]
            )
            for path, weight in zip(paths, weights / weights.sum(), strict=True):
                initials[path[0]] += weight
                for t, x in enumerate(word):
                    counts[x, path[t], path[t + 1]] += weight
        prior = initials / initials.sum()
        edges = counts / counts.sum(axis=(0, 2))[None, :, None]
    np.testing.assert_allclose(
        prior, [0.7289050672631926, 0.2710949327368074], atol=1e-14
    )
    np.testing.assert_allclose(
        edges.ravel(),
        [
            0.3944266772873601,
            0.1387344860585561,
            0.20562851502306864,
            0.12235873645787698,
            0.08931893840408917,
            0.37751989824999466,
            0.275587663334462,
            0.39642508518459246,
        ],
        atol=1e-14,
    )
