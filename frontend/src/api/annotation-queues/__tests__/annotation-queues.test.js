import { describe, it, expect } from "vitest";
import {
  annotationQueueEndpoints,
  annotationQueueKeys,
  queueItemKeys,
  annotateKeys,
  automationRuleKeys,
} from "../annotation-queues";

describe("Annotation Queues API", () => {
  describe("queue endpoints", () => {
    it("has correct list endpoint", () => {
      expect(annotationQueueEndpoints.list).toBe(
        "/model-hub/annotation-queues/",
      );
    });

    it("generates correct detail endpoint", () => {
      expect(annotationQueueEndpoints.detail("q-123")).toBe(
        "/model-hub/annotation-queues/q-123/",
      );
    });

    it("generates correct restore endpoint", () => {
      expect(annotationQueueEndpoints.restore("q-123")).toBe(
        "/model-hub/annotation-queues/q-123/restore/",
      );
    });

    it("generates correct updateStatus endpoint", () => {
      expect(annotationQueueEndpoints.updateStatus("q-123")).toBe(
        "/model-hub/annotation-queues/q-123/update-status/",
      );
    });
  });

  describe("queue query keys", () => {
    it("has correct all key", () => {
      expect(annotationQueueKeys.all).toEqual(["annotation-queues"]);
    });

    it("generates list key with filters", () => {
      const filters = { status: "active", page: 2 };
      expect(annotationQueueKeys.list(filters)).toEqual([
        "annotation-queues",
        "list",
        filters,
      ]);
    });

    it("generates detail key", () => {
      expect(annotationQueueKeys.detail("q-123")).toEqual([
        "annotation-queues",
        "detail",
        "q-123",
      ]);
    });
  });

  describe("queue item keys", () => {
    it("generates all key for queue", () => {
      expect(queueItemKeys.all("q-1")).toEqual(["queue-items", "q-1"]);
    });

    it("generates list key with filters", () => {
      const filters = { status: "pending" };
      expect(queueItemKeys.list("q-1", filters)).toEqual([
        "queue-items",
        "q-1",
        "list",
        filters,
      ]);
    });
  });

  describe("annotate keys", () => {
    it("generates detail key", () => {
      expect(annotateKeys.detail("q-1", "item-1")).toEqual([
        "annotate-detail",
        "q-1",
        "item-1",
      ]);
    });

    it("generates nextItem key", () => {
      expect(annotateKeys.nextItem("q-1")).toEqual([
        "annotate-next-item",
        "q-1",
      ]);
    });

    it("generates annotations key", () => {
      expect(annotateKeys.annotations("q-1", "item-1")).toEqual([
        "item-annotations",
        "q-1",
        "item-1",
      ]);
    });
  });

  describe("automation rule keys", () => {
    it("generates all key for queue", () => {
      expect(automationRuleKeys.all("q-1")).toEqual([
        "automation-rules",
        "q-1",
      ]);
    });

    it("generates list key for queue", () => {
      expect(automationRuleKeys.list("q-1")).toEqual([
        "automation-rules",
        "q-1",
        "list",
      ]);
    });
  });
});
