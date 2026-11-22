import test from "node:test";
import assert from "node:assert/strict";
import { scoreToFiveScale } from "./innovation-metrics.ts";

test("scoreToFiveScale converts 0-100 system scores to 5-segment scale safely", () => {
  assert.deepEqual(scoreToFiveScale(undefined), {
    segments: 0,
    fiveScaleLabel: "—",
    percent: null,
  });
  assert.deepEqual(scoreToFiveScale(0), {
    segments: 0,
    fiveScaleLabel: "0,0",
    percent: 0,
  });
  assert.deepEqual(scoreToFiveScale(92), {
    segments: 5,
    fiveScaleLabel: "4,6",
    percent: 92,
  });
  assert.deepEqual(scoreToFiveScale(76), {
    segments: 4,
    fiveScaleLabel: "3,8",
    percent: 76,
  });
  assert.deepEqual(scoreToFiveScale(140), {
    segments: 5,
    fiveScaleLabel: "5,0",
    percent: 100,
  });
});
