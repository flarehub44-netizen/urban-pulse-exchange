"""Vehicle counting along a normalized count line.

MVP implementation: background subtraction (MOG2) + nearest-centroid tracking
across consecutive frames; a vehicle is counted when the centroid switches
sides relative to the count line.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

import cv2
import numpy as np


@dataclass
class CountLine:
    x1: float
    y1: float
    x2: float
    y2: float

    @classmethod
    def from_json(cls, data: Any) -> CountLine | None:
        if not isinstance(data, dict):
            return None
        try:
            return cls(
                x1=float(data["x1"]),
                y1=float(data["y1"]),
                x2=float(data["x2"]),
                y2=float(data["y2"]),
            )
        except (KeyError, TypeError, ValueError):
            return None


def _side(px: float, py: float, a: tuple[int, int], b: tuple[int, int]) -> int:
    """Sign of cross product — which side of segment AB point P lies on."""
    cross = (b[0] - a[0]) * (py - a[1]) - (b[1] - a[1]) * (px - a[0])
    if cross > 0:
        return 1
    if cross < 0:
        return -1
    return 0


def _dist_to_segment(px: float, py: float, a: tuple[int, int], b: tuple[int, int]) -> float:
    ax, ay = a
    bx, by = b
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


class LineCrossCounter:
    """Motion-based line crossing estimator with centroid tracking."""

    def __init__(self, line: CountLine, min_area: int = 600) -> None:
        self.line = line
        self.min_area = min_area
        self._bg = cv2.createBackgroundSubtractorMOG2(
            history=200, varThreshold=32, detectShadows=False
        )
        # Tracks: list of {"cx","cy","side","missed"}
        self._tracks: list[dict[str, float]] = []
        self._cross_total = 0
        self._match_radius_px = 60.0
        self._near_band_px = 80.0  # only count crossings near the line

    def _line_px(self, w: int, h: int) -> tuple[tuple[int, int], tuple[int, int]]:
        return (
            (int(self.line.x1 * w), int(self.line.y1 * h)),
            (int(self.line.x2 * w), int(self.line.y2 * h)),
        )

    def process_frame(self, frame: np.ndarray) -> int:
        h, w = frame.shape[:2]
        blurred = cv2.GaussianBlur(frame, (5, 5), 0)
        mask = self._bg.apply(blurred)
        # Clean noise
        _, mask = cv2.threshold(mask, 200, 255, cv2.THRESH_BINARY)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        mask = cv2.dilate(mask, np.ones((5, 5), np.uint8), iterations=2)

        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        p1, p2 = self._line_px(w, h)

        detections: list[tuple[float, float, int]] = []
        for c in contours:
            if cv2.contourArea(c) < self.min_area:
                continue
            m = cv2.moments(c)
            if m["m00"] == 0:
                continue
            cx = m["m10"] / m["m00"]
            cy = m["m01"] / m["m00"]
            detections.append((cx, cy, _side(cx, cy, p1, p2)))

        # Match detections to existing tracks (greedy nearest).
        used_tracks: set[int] = set()
        new_tracks: list[dict[str, float]] = []
        crosses = 0

        for cx, cy, side in detections:
            best_idx = -1
            best_dist = self._match_radius_px
            for i, t in enumerate(self._tracks):
                if i in used_tracks:
                    continue
                d = math.hypot(cx - t["cx"], cy - t["cy"])
                if d < best_dist:
                    best_dist = d
                    best_idx = i

            if best_idx >= 0:
                prev = self._tracks[best_idx]
                used_tracks.add(best_idx)
                prev_side = int(prev["side"])
                if (
                    side != 0
                    and prev_side != 0
                    and side != prev_side
                    and _dist_to_segment(cx, cy, p1, p2) <= self._near_band_px
                ):
                    crosses += 1
                new_tracks.append({"cx": cx, "cy": cy, "side": side, "missed": 0})
            else:
                new_tracks.append({"cx": cx, "cy": cy, "side": side, "missed": 0})

        # Keep unmatched tracks for a couple of frames to handle brief occlusion.
        for i, t in enumerate(self._tracks):
            if i in used_tracks:
                continue
            if t["missed"] < 2:
                t["missed"] += 1
                new_tracks.append(t)

        self._tracks = new_tracks
        self._cross_total += crosses
        return crosses

    @property
    def session_total(self) -> int:
        return self._cross_total
