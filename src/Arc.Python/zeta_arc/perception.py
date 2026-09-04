"""Pixels to objects — the bottom rung of the perception ladder, on ARC frames.

`FrameData.frame` is `list[list[list[int]]]`: one or more layers of colour
integers. MEASURED on ZetaChase (2026-08-24): one layer, 64x64, colours
{5: background 3968px, 9: agent 64px, 4: goal 64px}, and it changes after a
single action.

WHAT THIS DELIBERATELY DOES NOT DO. It never asks the engine where anything is.
`play.py`'s existing agents call `game.current_level.get_sprites_by_tag(...)`
and read `sprite.x`, which is the ARC equivalent of reading V0/V1 out of the
CHIP-8 emulator — ground truth, not perception. An agent built on that is
scored on a problem it was handed the answer to. Everything here comes off the
grid.

BACKGROUND IS MEASURED, NOT NAMED. The most common colour in the frame is the
background. Hardcoding `5` would work today on this one environment and would
be exactly the kind of cart-specific constant that has to be unlearned later.
"""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass

Grid = list[list[int]]


@dataclass(frozen=True)
class Component:
    """One connected blob of a single colour."""

    colour: int
    area: int
    cx: float
    cy: float

    def distance_to(self, other: Component) -> float:
        return abs(self.cx - other.cx) + abs(self.cy - other.cy)


@dataclass(frozen=True)
class ComponentRegion:
    """A component plus geometry used by temporal feature layers."""

    component: Component
    cells: frozenset[tuple[int, int]]
    min_x: int
    min_y: int
    width: int
    height: int
    perimeter: int
    shape: tuple[tuple[int, int], ...]


def background_colour(grid: Grid) -> int:
    """The most common colour. Measured per frame, never assumed."""
    counts: Counter[int] = Counter(v for row in grid for v in row)
    return counts.most_common(1)[0][0]


def component_regions(
    grid: Grid, background: int | None = None
) -> list[ComponentRegion]:
    """Four-connected same-colour regions, background excluded.

    Deterministic: cells are visited in row-major order and the returned list
    is sorted by (colour, cy, cx), so the same grid always yields the same list
    in the same order. Nothing here draws on a clock or a random source.
    """
    if not grid or not grid[0]:
        return []
    bg = background_colour(grid) if background is None else background
    height, width = len(grid), len(grid[0])
    seen = [[False] * width for _ in range(height)]
    found: list[ComponentRegion] = []

    for y in range(height):
        for x in range(width):
            if seen[y][x] or grid[y][x] == bg:
                continue
            colour = grid[y][x]
            queue: deque[tuple[int, int]] = deque([(x, y)])
            seen[y][x] = True
            cells: list[tuple[int, int]] = []
            while queue:
                cxi, cyi = queue.popleft()
                cells.append((cxi, cyi))
                for nx, ny in (
                    (cxi + 1, cyi),
                    (cxi - 1, cyi),
                    (cxi, cyi + 1),
                    (cxi, cyi - 1),
                ):
                    if not (0 <= nx < width and 0 <= ny < height):
                        continue
                    if seen[ny][nx] or grid[ny][nx] != colour:
                        continue
                    seen[ny][nx] = True
                    queue.append((nx, ny))
            min_x = min(cx for cx, _ in cells)
            max_x = max(cx for cx, _ in cells)
            min_y = min(cy for _, cy in cells)
            max_y = max(cy for _, cy in cells)
            cell_set = frozenset(cells)
            component = Component(
                colour=colour,
                area=len(cells),
                cx=sum(cx for cx, _ in cells) / len(cells),
                cy=sum(cy for _, cy in cells) / len(cells),
            )
            found.append(
                ComponentRegion(
                    component=component,
                    cells=cell_set,
                    min_x=min_x,
                    min_y=min_y,
                    width=max_x - min_x + 1,
                    height=max_y - min_y + 1,
                    perimeter=sum(
                        (nx, ny) not in cell_set
                        for cx, cy in cells
                        for nx, ny in (
                            (cx + 1, cy),
                            (cx - 1, cy),
                            (cx, cy + 1),
                            (cx, cy - 1),
                        )
                    ),
                    shape=tuple(sorted((cx - min_x, cy - min_y) for cx, cy in cells)),
                )
            )

    found.sort(
        key=lambda region: (
            region.component.colour,
            region.component.cy,
            region.component.cx,
        )
    )
    return found


def components(grid: Grid, background: int | None = None) -> list[Component]:
    """The compact component view used by the acting policies."""
    return [region.component for region in component_regions(grid, background)]
