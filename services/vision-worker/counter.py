"""Vehicle counting along a normalized count line (MVP: motion across line)."""

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


class LineCrossCounter:
    """Motion-based line crossing estimator (upgrade path: YOLO track IDs)."""

    def __init__(self, line: CountLine, min_area: int = 400) -> None:
        self.line = line
        self.min_area = min_area
        self._prev_gray: np.ndarray | None = None
        self._cross_total = 0

    def _line_px(self, w: int, h: int) -> tuple[tuple[int, int], tuple[int, int]]:
        return (
            (int(self.line.x1 * w), int(self.line.y1 * h)),
            (int(self.line.x2 * w), int(self.line.y2 * h)),
        )

    def process_frame(self, frame: np.ndarray) -> int:
        h, w = frame.shape[:2]
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (5, 5), 0)

        if self._prev_gray is None:
            self._prev_gray = gray
            return 0

        diff = cv2.absdiff(self._prev_gray, gray)
        _, thresh = cv2.threshold(diff, 25, 255, cv2.THRESH_BINARY)
        thresh = cv2.dilate(thresh, None, iterations=2)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        p1, p2 = self._line_px(w, h)
        crosses = 0

        for c in contours:
            if cv2.contourArea(c) < self.min_area:
                continue
            m = cv2.moments(c)
            if m["m00"] == 0:
                continue
            cx = int(m["m10"] / m["m00"])
            cy = int(m["m01"] / m["m00"])
            if _point_near_segment(cx, cy, p1, p2, tol=18):
                crosses += 1

        self._prev_gray = gray
        self._cross_total += crosses
        return crosses

    @property
    def session_total(self) -> int:
        return self._cross_total


def _point_near_segment(px: int, py: int, a: tuple[int, int], b: tuple[int, int], tol: float) -> bool:
    ax, ay = a
    bx, by = b
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay) <= tol
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    proj_x = ax + t * dx
    proj_y = ay + t * dy
    return math.hypot(px - proj_x, py - proj_y) <= tol
