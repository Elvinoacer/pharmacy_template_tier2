import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  availabilitySearchFeedback,
  feedbackFromApiPayload,
  packPhotoFeedback,
  photoReadFeedback,
  portalUploadFeedback,
} from "../app/lib/prescription-upload-feedback";

describe("prescription upload feedback", () => {
  it("gives next actions after a successful photo read", () => {
    const feedback = photoReadFeedback({ code: "read_ok", nameCount: 3 });
    assert.equal(feedback.tone, "success");
    assert.ok(feedback.actions.some((action) => action.id === "search"));
    assert.ok(feedback.actions.some((action) => action.id === "refer"));
  });

  it("keeps a next step when the photo cannot be read", () => {
    for (const code of [
      "unreadable",
      "invalid_type",
      "file_too_large",
      "ai_unavailable",
      "read_failed",
      "network",
      "rate_limited",
    ]) {
      const feedback = photoReadFeedback({ code, retryAfterSeconds: 12 });
      assert.ok(
        feedback.actions.length >= 2,
        `${code} should offer more than one next step`,
      );
      assert.ok(
        feedback.actions.some((action) => action.id === "focus_names" || action.id === "refer" || action.href),
        `${code} should let the person continue without the photo reader`,
      );
    }
  });

  it("keeps a next step when availability search fails", () => {
    const feedback = availabilitySearchFeedback({ code: "search_failed" });
    assert.equal(feedback.tone, "error");
    assert.ok(feedback.actions.some((action) => action.id === "retry_search"));
    assert.ok(feedback.actions.some((action) => action.id === "refer"));
  });

  it("keeps a next step when portal upload fails", () => {
    const failed = portalUploadFeedback({ code: "upload_failed" });
    assert.ok(failed.actions.some((action) => action.id === "retry_submit"));
    assert.ok(failed.actions.some((action) => action.href === "/prescription"));
    const signedOut = portalUploadFeedback({ code: "sign_in_required" });
    assert.ok(signedOut.actions.some((action) => action.id === "login"));
  });

  it("keeps a next step when pack photo search fails", () => {
    const feedback = packPhotoFeedback({ code: "search_failed" });
    assert.ok(feedback.actions.some((action) => action.id === "retry_pack"));
    assert.ok(feedback.actions.some((action) => action.href === "/prescription"));
    const invalid = packPhotoFeedback({ code: "invalid_type" });
    assert.ok(invalid.actions.every((action) => action.id === "retry_photo" || action.href));
  });

  it("prefers API title and actions when present", () => {
    const fallback = photoReadFeedback({ code: "read_failed" });
    const merged = feedbackFromApiPayload(
      {
        code: "unreadable",
        tone: "warning",
        title: "We couldn’t read the medicine names",
        message: "Type them instead.",
        actions: [{ id: "focus_names", label: "Type the names" }],
      },
      fallback,
    );
    assert.equal(merged.code, "unreadable");
    assert.equal(merged.actions[0]?.id, "focus_names");
  });
});
