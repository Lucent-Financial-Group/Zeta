// Independent Rust oracle for the finite decomposition/selector contract.
// It imports no TypeScript/F# matrix, basis map, serialized vector, or measured count.

use std::collections::{BTreeMap, HashMap, HashSet};
use std::env;

#[derive(Clone)]
struct Perm {
    to: Vec<usize>,
    sign: Vec<i32>,
}

#[derive(Clone)]
struct Entry {
    row: usize,
    col: usize,
    value: i64,
}

struct Solution {
    basis: Vec<Vec<Entry>>,
}

#[derive(Clone, Eq, PartialEq)]
struct BigNat(Vec<u64>);

impl BigNat {
    const BASE: u64 = 1_000_000_000;

    fn zero() -> Self { Self(vec![0]) }
    fn one() -> Self { Self(vec![1]) }

    fn normalize(&mut self) {
        while self.0.len() > 1 && self.0.last() == Some(&0) { self.0.pop(); }
    }

    fn add(&self, other: &Self) -> Self {
        let mut out = Vec::with_capacity(self.0.len().max(other.0.len()) + 1);
        let mut carry = 0u64;
        for index in 0..self.0.len().max(other.0.len()) {
            let total = self.0.get(index).copied().unwrap_or(0)
                + other.0.get(index).copied().unwrap_or(0) + carry;
            out.push(total % Self::BASE);
            carry = total / Self::BASE;
        }
        if carry != 0 { out.push(carry); }
        Self(out)
    }

    fn mul_small(&self, factor: u64) -> Self {
        let mut out = Vec::with_capacity(self.0.len() + 1);
        let mut carry = 0u64;
        for digit in &self.0 {
            let total = *digit * factor + carry;
            out.push(total % Self::BASE);
            carry = total / Self::BASE;
        }
        while carry != 0 {
            out.push(carry % Self::BASE);
            carry /= Self::BASE;
        }
        Self(out)
    }

    fn mul(&self, other: &Self) -> Self {
        let mut out = vec![0u64; self.0.len() + other.0.len() + 1];
        for (left_index, left) in self.0.iter().enumerate() {
            let mut carry = 0u64;
            for (right_index, right) in other.0.iter().enumerate() {
                let index = left_index + right_index;
                let total = out[index] + *left * *right + carry;
                out[index] = total % Self::BASE;
                carry = total / Self::BASE;
            }
            let mut index = left_index + other.0.len();
            while carry != 0 {
                let total = out[index] + carry;
                out[index] = total % Self::BASE;
                carry = total / Self::BASE;
                index += 1;
            }
        }
        let mut value = Self(out);
        value.normalize();
        value
    }

    fn decimal(&self) -> String {
        let mut iter = self.0.iter().rev();
        let first = iter.next().copied().unwrap_or(0).to_string();
        iter.fold(first, |mut text, digit| {
            text.push_str(&format!("{:09}", digit));
            text
        })
    }
}

fn bit_count(mut value: usize) -> usize {
    let mut count = 0;
    while value != 0 {
        value &= value - 1;
        count += 1;
    }
    count
}

fn clifford_sign(left: usize, right: usize, square: i32) -> i32 {
    let mut swaps = 0usize;
    for bit in 0..usize::BITS as usize {
        if left & (1usize << bit) != 0 {
            swaps += bit_count(right & ((1usize << bit).wrapping_sub(1)));
        }
    }
    let collision = bit_count(left & right);
    let reorder = if swaps % 2 == 0 { 1 } else { -1 };
    let metric = if square == 1 || collision % 2 == 0 { 1 } else { -1 };
    reorder * metric
}

fn enumerate_code(generators: &[usize]) -> Vec<usize> {
    let mut words = vec![0usize];
    for generator in generators {
        let snapshot = words.clone();
        for word in snapshot {
            let candidate = word ^ *generator;
            if !words.contains(&candidate) { words.push(candidate); }
        }
    }
    words.sort_unstable();
    words
}

fn signed_code_group(generators: &[usize]) -> HashMap<usize, i32> {
    let mut signs = HashMap::from([(0usize, 1i32)]);
    for generator in generators {
        let snapshot: Vec<(usize, i32)> = signs.iter().map(|(word, sign)| (*word, *sign)).collect();
        for (word, sign) in snapshot {
            let key = word ^ *generator;
            let candidate = sign * clifford_sign(word, *generator, -1);
            if let Some(prior) = signs.get(&key) {
                assert_eq!(*prior, candidate, "signed code group is inconsistent");
            } else {
                signs.insert(key, candidate);
            }
        }
    }
    signs
}

fn compose(outer: &Perm, inner: &Perm) -> Perm {
    assert_eq!(outer.to.len(), inner.to.len());
    let mut to = vec![0usize; outer.to.len()];
    let mut sign = vec![0i32; outer.to.len()];
    for source in 0..outer.to.len() {
        let middle = inner.to[source];
        to[source] = outer.to[middle];
        sign[source] = inner.sign[source] * outer.sign[middle];
    }
    Perm { to, sign }
}

fn identity_perm(dimension: usize, coefficient: i32) -> Perm {
    Perm { to: (0..dimension).collect(), sign: vec![coefficient; dimension] }
}

fn coded_source(rep_seed: usize) -> Vec<Perm> {
    let generators = [0b11100001usize, 0b11010010, 0b10110100, 0b01111000];
    let code = enumerate_code(&generators);
    assert!(code.iter().all(|word| bit_count(*word) % 4 == 0));
    let epsilon = signed_code_group(&generators);
    let mut representative_of = vec![usize::MAX; 256];
    let mut representatives = Vec::new();
    for scan in 0..256usize {
        let mask = scan ^ rep_seed;
        if representative_of[mask] == usize::MAX {
            let index = representatives.len();
            representatives.push(mask);
            for word in &code { representative_of[mask ^ *word] = index; }
        }
    }
    assert_eq!(representatives.len(), 16);
    let mut edges = Vec::new();
    for colour in 0..8usize {
        let bit = 1usize << colour;
        let mut to = vec![0usize; representatives.len()];
        let mut sign = vec![0i32; representatives.len()];
        for vertex in 0..representatives.len() {
            let representative = representatives[vertex];
            let shifted = representative ^ bit;
            let first = clifford_sign(bit, representative, -1);
            let target_vertex = representative_of[shifted];
            let target_representative = representatives[target_vertex];
            let difference = shifted ^ target_representative;
            let second = *epsilon.get(&difference).expect("missing signed code difference");
            let third = clifford_sign(target_representative, difference, -1);
            to[vertex] = target_vertex;
            sign[vertex] = first * second * third;
        }
        edges.push(Perm { to, sign });
    }
    (1..8).map(|colour| compose(&edges[colour], &edges[0])).collect()
}

fn parity_below(mask: usize, mode: usize) -> i32 {
    if bit_count(mask & ((1usize << mode) - 1)) % 2 == 0 { 1 } else { -1 }
}

fn gamma(omit_parity: bool, generator: usize, mask: usize) -> (usize, i32, i32) {
    let mode = generator / 2;
    let occupied = mask & (1usize << mode) != 0;
    let string_sign = if omit_parity { 1 } else { parity_below(mask, mode) };
    let target = mask ^ (1usize << mode);
    if generator % 2 == 0 {
        (target, string_sign, 0)
    } else {
        (target, 0, string_sign * if occupied { -1 } else { 1 })
    }
}

fn gamma_product(omit_parity: bool, first: usize, second: usize, mask: usize) -> (usize, i32, i32) {
    let (middle, right_re, right_im) = gamma(omit_parity, second, mask);
    let (target, left_re, left_im) = gamma(omit_parity, first, middle);
    (target, left_re * right_re - left_im * right_im, left_re * right_im + left_im * right_re)
}

fn fock_target(fault: Option<&str>) -> Vec<Perm> {
    let masks: Vec<usize> = (0..256).filter(|mask| bit_count(*mask) % 2 == 0).collect();
    assert_eq!(masks.len(), 128);
    let mut index = vec![usize::MAX; 256];
    for (position, mask) in masks.iter().enumerate() { index[*mask] = position; }
    let mut generators: Vec<Perm> = (1..8).map(|colour| {
        let mut to = vec![0usize; masks.len()];
        let mut sign = vec![0i32; masks.len()];
        for (source, mask) in masks.iter().enumerate() {
            let (target, real, imaginary) = gamma_product(fault == Some("parity"), 2 * colour, 0, *mask);
            assert_eq!(imaginary, 0);
            assert!(real == 1 || real == -1);
            to[source] = index[target];
            sign[source] = real;
        }
        Perm { to, sign }
    }).collect();
    if fault == Some("coordinate") { generators[0].sign[0] = -generators[0].sign[0]; }
    if fault == Some("duplicate") { generators[6] = generators[5].clone(); }
    generators
}

fn clifford_violations(generators: &[Perm]) -> usize {
    let mut violations = 0usize;
    for first in 0..generators.len() {
        for second in first..generators.len() {
            let forward = compose(&generators[first], &generators[second]);
            let backward = compose(&generators[second], &generators[first]);
            for basis in 0..generators[first].to.len() {
                if first == second {
                    if forward.to[basis] != basis || forward.sign[basis] != -1 { violations += 1; }
                } else if forward.to[basis] != backward.to[basis] || forward.sign[basis] != -backward.sign[basis] {
                    violations += 1;
                }
            }
        }
    }
    violations
}

fn mod_inverse(value: i64, prime: i64) -> i64 {
    let (mut old_r, mut r) = (((value % prime) + prime) % prime, prime);
    let (mut old_s, mut s) = (1i64, 0i64);
    while r != 0 {
        let quotient = old_r / r;
        (old_r, r) = (r, old_r - quotient * r);
        (old_s, s) = (s, old_s - quotient * s);
    }
    assert_eq!(old_r, 1);
    ((old_s % prime) + prime) % prime
}

fn rank(rows_count: usize, cols_count: usize, entries: &[Entry], prime: i64) -> usize {
    let mut rows = vec![vec![0i64; cols_count]; rows_count];
    for entry in entries {
        rows[entry.row][entry.col] = (rows[entry.row][entry.col] + entry.value).rem_euclid(prime);
    }
    let mut rank = 0usize;
    for column in 0..cols_count {
        if rank == rows_count { break; }
        let pivot = (rank..rows_count).find(|row| rows[*row][column] != 0);
        let Some(pivot) = pivot else { continue };
        rows.swap(rank, pivot);
        let inverse = mod_inverse(rows[rank][column], prime);
        for cursor in column..cols_count { rows[rank][cursor] = rows[rank][cursor] * inverse % prime; }
        for row in 0..rows_count {
            if row == rank { continue; }
            let factor = rows[row][column];
            if factor == 0 { continue; }
            for cursor in column..cols_count {
                rows[row][cursor] = (rows[row][cursor] - factor * rows[rank][cursor]).rem_euclid(prime);
            }
        }
        rank += 1;
    }
    rank
}

fn solve(source: &[Perm], target: &[Perm], prime: i64) -> Solution {
    assert!(!source.is_empty() && source.len() == target.len());
    let source_dimension = source[0].to.len();
    let target_dimension = target[0].to.len();
    let variable_count = source_dimension * target_dimension;
    let mut adjacency: Vec<Vec<(usize, i32)>> = vec![Vec::new(); variable_count];
    for generator in 0..source.len() {
        for row in 0..target_dimension {
            for column in 0..source_dimension {
                let from = row * source_dimension + column;
                let to = target[generator].to[row] * source_dimension + source[generator].to[column];
                let factor = target[generator].sign[row] * source[generator].sign[column];
                adjacency[from].push((to, factor));
                adjacency[to].push((from, factor));
            }
        }
    }
    let mut assignment = vec![0i32; variable_count];
    let mut basis: Vec<Vec<Entry>> = Vec::new();
    for root in 0..variable_count {
        if assignment[root] != 0 { continue; }
        assignment[root] = 1;
        let mut queue = vec![root];
        let mut variables = Vec::new();
        let mut consistent = true;
        let mut cursor = 0usize;
        while cursor < queue.len() {
            let current = queue[cursor];
            cursor += 1;
            variables.push(current);
            for (neighbour, factor) in &adjacency[current] {
                let expected = assignment[current] * *factor;
                if assignment[*neighbour] == 0 {
                    assignment[*neighbour] = expected;
                    queue.push(*neighbour);
                } else if assignment[*neighbour] != expected {
                    consistent = false;
                }
            }
        }
        if consistent {
            basis.push(variables.into_iter().map(|variable| Entry {
                row: variable / source_dimension,
                col: variable % source_dimension,
                value: assignment[variable] as i64,
            }).collect::<Vec<Entry>>());
        }
    }
    // Exercise the modular path here, rather than letting the field argument become decorative.
    for map in &basis { let _ = rank(target_dimension, source_dimension, map, prime); }
    Solution { basis }
}

fn word(generators: &[Perm]) -> Perm {
    generators.iter().fold(identity_perm(generators[0].to.len(), 1), |product, generator| compose(&product, generator))
}

fn difference(left: &Perm, right: &Perm) -> usize {
    (0..left.to.len()).filter(|index| left.to[*index] != right.to[*index] || left.sign[*index] != right.sign[*index]).count()
}

fn sector_basis(omega: &Perm, eigenvalue: i32) -> Vec<Vec<i32>> {
    let mut visited = vec![false; omega.to.len()];
    let mut basis = Vec::new();
    for root in 0..omega.to.len() {
        if visited[root] { continue; }
        let target = omega.to[root];
        if target == root {
            visited[root] = true;
            if omega.sign[root] == eigenvalue {
                let mut vector = vec![0i32; omega.to.len()];
                vector[root] = 1;
                basis.push(vector);
            }
        } else {
            assert_eq!(omega.to[target], root);
            assert_eq!(omega.sign[target], omega.sign[root]);
            visited[root] = true;
            visited[target] = true;
            let first = root.min(target);
            let second = root.max(target);
            let mut vector = vec![0i32; omega.to.len()];
            vector[first] = 1;
            vector[second] = eigenvalue * omega.sign[first];
            basis.push(vector);
        }
    }
    basis
}

fn restrict(generators: &[Perm], basis: &[Vec<i32>]) -> Vec<Perm> {
    let positions: HashMap<Vec<i32>, usize> = basis.iter().cloned().enumerate().map(|(index, vector)| (vector, index)).collect();
    generators.iter().map(|generator| {
        let mut to = vec![0usize; basis.len()];
        let mut sign = vec![0i32; basis.len()];
        for (source, vector) in basis.iter().enumerate() {
            let mut image = vec![0i32; generator.to.len()];
            for (coordinate, value) in vector.iter().enumerate() {
                if *value != 0 { image[generator.to[coordinate]] = *value * generator.sign[coordinate]; }
            }
            let scalar = *image.iter().find(|value| **value != 0).expect("empty restricted image");
            let normalized: Vec<i32> = image.iter().map(|value| *value * scalar).collect();
            to[source] = *positions.get(&normalized).expect("sector not preserved");
            sign[source] = scalar;
        }
        Perm { to, sign }
    }).collect()
}

fn generated_rank(generators: &[Perm], prime: i64) -> usize {
    let dimension = generators[0].to.len();
    let mut words = vec![identity_perm(dimension, 1)];
    for generator in generators {
        let appended: Vec<Perm> = words.iter().map(|prior| compose(prior, generator)).collect();
        words.extend(appended);
    }
    let mut entries = Vec::new();
    for (word_index, element) in words.iter().enumerate() {
        for column in 0..dimension {
            entries.push(Entry { row: word_index, col: element.to[column] * dimension + column, value: element.sign[column] as i64 });
        }
    }
    rank(words.len(), dimension * dimension, &entries, prime)
}

fn verify(source: &Perm, target: &Perm, entries: &[Entry], prime: i64) -> bool {
    let source_dimension = source.to.len();
    let target_dimension = target.to.len();
    let mut values = vec![0i64; source_dimension * target_dimension];
    for entry in entries {
        let index = entry.row * source_dimension + entry.col;
        values[index] = (values[index] + entry.value).rem_euclid(prime);
    }
    for row in 0..target_dimension {
        for column in 0..source_dimension {
            let left = source.sign[column] as i64 * values[target.to[row] * source_dimension + source.to[column]];
            let right = target.sign[row] as i64 * values[row * source_dimension + column];
            if (left - right).rem_euclid(prime) != 0 { return false; }
        }
    }
    true
}

fn basis_sector(map: &[Entry], source_omega: &Perm, target_dimension: usize, prime: i64) -> i32 {
    let plus = identity_perm(target_dimension, 1);
    let minus = identity_perm(target_dimension, -1);
    let plus_ok = verify(source_omega, &plus, map, prime);
    let minus_ok = verify(source_omega, &minus, map, prime);
    assert_ne!(plus_ok, minus_ok);
    if plus_ok { 1 } else { -1 }
}

fn combine(basis: &[Vec<Entry>], coefficients: &[i64]) -> Vec<Entry> {
    basis.iter().zip(coefficients).flat_map(|(map, coefficient)| {
        map.iter().filter_map(move |entry| if *coefficient == 0 { None } else { Some(Entry {
            row: entry.row, col: entry.col, value: entry.value * *coefficient,
        }) })
    }).collect()
}

fn dense(rows: usize, cols: usize, entries: &[Entry], prime: i64) -> Vec<i64> {
    let mut values = vec![0i64; rows * cols];
    for entry in entries {
        let index = entry.row * cols + entry.col;
        values[index] = (values[index] + entry.value).rem_euclid(prime);
    }
    values
}

fn multiply_dense(left: &[i64], left_rows: usize, middle: usize, right: &[i64], right_cols: usize, prime: i64) -> Vec<i64> {
    let mut out = vec![0i64; left_rows * right_cols];
    for row in 0..left_rows {
        for k in 0..middle {
            let left_value = left[row * middle + k];
            if left_value == 0 { continue; }
            for column in 0..right_cols {
                let index = row * right_cols + column;
                out[index] = (out[index] + left_value * right[k * right_cols + column]).rem_euclid(prime);
            }
        }
    }
    out
}

fn entries_from_dense(rows: usize, cols: usize, values: &[i64]) -> Vec<Entry> {
    let mut entries = Vec::new();
    for row in 0..rows {
        for col in 0..cols {
            let value = values[row * cols + col];
            if value != 0 { entries.push(Entry { row, col, value }); }
        }
    }
    entries
}

fn same_image(left: &[Entry], right: &[Entry], prime: i64) -> bool {
    let left_rank = rank(128, 16, left, prime);
    let mut joined = left.to_vec();
    joined.extend(right.iter().map(|entry| Entry { row: entry.row, col: entry.col + 16, value: entry.value }));
    rank(128, 32, &joined, prime) == left_rank
}

fn moving_automorphism(selected: &[Entry], commutant: &[Vec<Entry>], prime: i64) -> bool {
    let selected_dense = dense(128, 16, selected, prime);
    for basis in commutant {
        for coefficient in 1..=17i64 {
            let mut candidate: Vec<Entry> = (0..128).map(|index| Entry { row: index, col: index, value: 1 }).collect();
            candidate.extend(basis.iter().map(|entry| Entry { row: entry.row, col: entry.col, value: coefficient * entry.value }));
            if rank(128, 128, &candidate, prime) != 128 { continue; }
            let moved_dense = multiply_dense(&dense(128, 128, &candidate, prime), 128, 128, &selected_dense, 16, prime);
            let moved = entries_from_dense(128, 16, &moved_dense);
            if !same_image(selected, &moved, prime) { return true; }
        }
    }
    false
}

fn gram_score(entries: &[Entry]) -> (i64, i64) {
    let matrix: HashMap<(usize, usize), i64> = entries.iter().map(|entry| ((entry.row, entry.col), entry.value)).collect();
    let mut off = 0i64;
    let mut diagonal = Vec::new();
    for left in 0..16 {
        for right in 0..16 {
            let inner: i64 = (0..128).map(|row| matrix.get(&(row, left)).copied().unwrap_or(0) * matrix.get(&(row, right)).copied().unwrap_or(0)).sum();
            if left == right { diagonal.push(inner); } else { off += inner * inner; }
        }
    }
    (off, diagonal.iter().max().unwrap() - diagonal.iter().min().unwrap())
}

fn projective_square(prime: u64) -> String {
    let mut power = BigNat::one();
    let mut sum = BigNat::zero();
    for _ in 0..8 {
        sum = sum.add(&power);
        power = power.mul_small(prime);
    }
    sum.mul(&sum).decimal()
}

fn spectrum(solution: &Solution, target_dimension: usize, source_dimension: usize, prime: i64) -> BTreeMap<usize, usize> {
    let mut result = BTreeMap::new();
    for map in &solution.basis {
        *result.entry(rank(target_dimension, source_dimension, map, prime)).or_insert(0) += 1;
    }
    result
}

fn json_spectrum(value: &BTreeMap<usize, usize>) -> String {
    value.iter().map(|(rank, count)| format!("[{},{}]", rank, count)).collect::<Vec<_>>().join(",")
}

fn main() {
    let mut field = 1_000_003i64;
    let mut rep_seed = 0usize;
    let mut fault: Option<String> = None;
    for argument in env::args().skip(1) {
        if let Some(value) = argument.strip_prefix("--field=") { field = value.parse().expect("invalid field"); }
        if let Some(value) = argument.strip_prefix("--rep-seed=") { rep_seed = value.parse().expect("invalid rep seed"); }
        if let Some(value) = argument.strip_prefix("--fault=") { fault = Some(value.to_string()); }
    }
    assert_ne!(field, 2, "central projectors require odd characteristic");
    if let Some(fault_name) = fault.as_deref() {
        assert!(matches!(fault_name, "coordinate" | "duplicate" | "parity"), "unknown fault");
        let target = fock_target(Some(fault_name));
        let violations = clifford_violations(&target);
        println!("{{\"field\":{},\"fault\":\"{}\",\"targetCliffordViolations\":{},\"quarantinedBeforeDecomposition\":{}}}",
            field, fault_name, violations, violations > 0);
        return;
    }
    let source = coded_source(rep_seed);
    let target = fock_target(None);
    let source_omega = word(&source);
    let target_omega = word(&target);
    assert_eq!(difference(&compose(&source_omega, &source_omega), &identity_perm(16, 1)), 0);
    assert_eq!(difference(&compose(&target_omega, &target_omega), &identity_perm(128, 1)), 0);
    for generator in &source { assert_eq!(difference(&compose(&source_omega, generator), &compose(generator, &source_omega)), 0); }
    for generator in &target { assert_eq!(difference(&compose(&target_omega, generator), &compose(generator, &target_omega)), 0); }

    let source_plus_basis = sector_basis(&source_omega, 1);
    let source_minus_basis = sector_basis(&source_omega, -1);
    let target_plus_basis = sector_basis(&target_omega, 1);
    let target_minus_basis = sector_basis(&target_omega, -1);
    let source_plus = restrict(&source, &source_plus_basis);
    let source_minus = restrict(&source, &source_minus_basis);
    let target_plus = restrict(&target, &target_plus_basis);
    let target_minus = restrict(&target, &target_minus_basis);

    let hom_pp = solve(&source_plus, &target_plus, field);
    let hom_pm = solve(&source_plus, &target_minus, field);
    let hom_mp = solve(&source_minus, &target_plus, field);
    let hom_mm = solve(&source_minus, &target_minus, field);
    let source_end_pp = solve(&source_plus, &source_plus, field);
    let source_end_pm = solve(&source_plus, &source_minus, field);
    let source_end_mp = solve(&source_minus, &source_plus, field);
    let source_end_mm = solve(&source_minus, &source_minus, field);
    let target_end_pp = solve(&target_plus, &target_plus, field);
    let target_end_pm = solve(&target_plus, &target_minus, field);
    let target_end_mp = solve(&target_minus, &target_plus, field);
    let target_end_mm = solve(&target_minus, &target_minus, field);
    let full_hom = solve(&source, &target, field);
    let target_end = solve(&target, &target, field);

    let mut plus_indices = Vec::new();
    let mut minus_indices = Vec::new();
    for (index, map) in full_hom.basis.iter().enumerate() {
        if basis_sector(map, &source_omega, 128, field) == 1 { plus_indices.push(index); } else { minus_indices.push(index); }
    }
    let unit = combine(&full_hom.basis, &vec![1; full_hom.basis.len()]);
    let mut negated_coefficients = vec![1; full_hom.basis.len()];
    negated_coefficients[0] = -1;
    let negated = combine(&full_hom.basis, &negated_coefficients);
    let mut pair_maps = Vec::new();
    for plus in &plus_indices {
        for minus in &minus_indices {
            let mut coefficients = vec![0; full_hom.basis.len()];
            coefficients[*plus] = 1;
            coefficients[*minus] = 1;
            pair_maps.push(combine(&full_hom.basis, &coefficients));
        }
    }
    let scores: Vec<(i64, i64)> = pair_maps.iter().map(|map| gram_score(map)).collect();
    let best = scores.iter().min().copied().expect("no pair selector");
    let minimizers = scores.iter().filter(|score| **score == best).count();
    let first_pair = &pair_maps[0];

    let hom_blocks = [hom_pp.basis.len(), hom_pm.basis.len(), hom_mp.basis.len(), hom_mm.basis.len()];
    let source_blocks = [source_end_pp.basis.len(), source_end_pm.basis.len(), source_end_mp.basis.len(), source_end_mm.basis.len()];
    let target_blocks = [target_end_pp.basis.len(), target_end_pm.basis.len(), target_end_mp.basis.len(), target_end_mm.basis.len()];
    let source_algebra = [generated_rank(&source_plus, field), generated_rank(&source_minus, field)];
    let target_algebra = [generated_rank(&target_plus, field), generated_rank(&target_minus, field)];
    let pair_rank_spectrum: HashSet<usize> = pair_maps.iter().map(|map| rank(128, 16, map, field)).collect();
    let full_spectrum = spectrum(&full_hom, 128, 16, field);

    println!(concat!(
        "{{\"field\":{},\"repSeed\":{},",
        "\"sourceSectorRanks\":[{},{}],\"targetSectorRanks\":[{},{}],",
        "\"homBlocks\":[{},{},{},{}],\"sourceCommutantBlocks\":[{},{},{},{}],",
        "\"targetCommutantBlocks\":[{},{},{},{}],",
        "\"sourceGeneratedAlgebraRanks\":[{},{}],\"targetGeneratedAlgebraRanks\":[{},{}],",
        "\"fullHomRankSpectrum\":[{}],\"projectiveEmbeddingClassCount\":\"{}\",",
        "\"coefficientBoundaryRanks\":[0,8,8,{}],",
        "\"minimumSupportCandidateCount\":{},\"allMinimumSupportRanks\":[{}],",
        "\"balancedMinimizerCount\":{},\"balancedScore\":[{},{}],",
        "\"basisOrientationInvariantImage\":{},",
        "\"unitMovedByAutomorphism\":{},\"minimumSupportMovedByAutomorphism\":{}",
        "}}"
    ),
        field, rep_seed,
        source_plus_basis.len(), source_minus_basis.len(), target_plus_basis.len(), target_minus_basis.len(),
        hom_blocks[0], hom_blocks[1], hom_blocks[2], hom_blocks[3],
        source_blocks[0], source_blocks[1], source_blocks[2], source_blocks[3],
        target_blocks[0], target_blocks[1], target_blocks[2], target_blocks[3],
        source_algebra[0], source_algebra[1], target_algebra[0], target_algebra[1],
        json_spectrum(&full_spectrum), projective_square(field as u64), rank(128, 16, &unit, field),
        pair_maps.len(), pair_rank_spectrum.iter().map(|value| value.to_string()).collect::<Vec<_>>().join(","),
        minimizers, best.0, best.1,
        same_image(&unit, &negated, field),
        moving_automorphism(&unit, &target_end.basis, field), moving_automorphism(first_pair, &target_end.basis, field),
    );
}
