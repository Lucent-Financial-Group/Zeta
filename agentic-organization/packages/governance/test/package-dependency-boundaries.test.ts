import { equal } from "node:assert/strict";
import { describe, test } from "node:test";

import {
  PackageBoundaryRule,
  PackageSourceLayoutViolationReason,
  validatePackageDependencyBoundaries,
  validatePackageSourceLayout,
} from "../src/package-dependency-boundaries.ts";

const packagesRootDirectory = new URL("../..", import.meta.url);

describe("package dependency boundaries", () => {
  test("keeps application independent from state and runtime adapters", async () => {
    const violations = await validatePackageDependencyBoundaries({
      rootDirectory: packagesRootDirectory,
      rules: [
        {
          packageName: PackageBoundaryRule.Application,
          sourceGlob: "application/src/**/*.ts",
          forbiddenImportFragments: [
            "../../state",
            "../../../state",
            "state-cockroach",
            "nestjs",
            "@nestjs",
            "nats",
            "dapr",
            "temporal",
            "drizzle",
            "pg",
            "postgres",
          ],
        },
        {
          packageName: PackageBoundaryRule.Messaging,
          sourceGlob: "messaging/src/**/*.ts",
          forbiddenImportFragments: ["../messaging-nats", "../../messaging-nats", "nats"],
        },
        {
          packageName: PackageBoundaryRule.StateAdapter,
          sourceGlob: "state-cockroach/src/**/*.ts",
          forbiddenImportFragments: [
            "../../messaging",
            "../messaging",
            "../../runtime",
            "../runtime",
            "nats",
            "jetstream",
          ],
        },
      ],
    });

    equal(violations.length, 0, violations.map((violation) => violation.message).join("\n"));
  });

  test("keeps tests out of production source directories", async () => {
    const violations = await validatePackageSourceLayout({
      rootDirectory: packagesRootDirectory,
      rules: [
        {
          packageName: PackageBoundaryRule.ProductionSource,
          sourceGlob: "application/src/**/*.ts",
          forbiddenFileSuffix: ".test.ts",
          reason: PackageSourceLayoutViolationReason.TestFileInProductionSource,
        },
        {
          packageName: PackageBoundaryRule.ProductionSource,
          sourceGlob: "domain/src/**/*.ts",
          forbiddenFileSuffix: ".test.ts",
          reason: PackageSourceLayoutViolationReason.TestFileInProductionSource,
        },
        {
          packageName: PackageBoundaryRule.ProductionSource,
          sourceGlob: "governance/src/**/*.ts",
          forbiddenFileSuffix: ".test.ts",
          reason: PackageSourceLayoutViolationReason.TestFileInProductionSource,
        },
        {
          packageName: PackageBoundaryRule.ProductionSource,
          sourceGlob: "messaging/src/**/*.ts",
          forbiddenFileSuffix: ".test.ts",
          reason: PackageSourceLayoutViolationReason.TestFileInProductionSource,
        },
        {
          packageName: PackageBoundaryRule.ProductionSource,
          sourceGlob: "messaging-nats/src/**/*.ts",
          forbiddenFileSuffix: ".test.ts",
          reason: PackageSourceLayoutViolationReason.TestFileInProductionSource,
        },
        {
          packageName: PackageBoundaryRule.ProductionSource,
          sourceGlob: "observability/src/**/*.ts",
          forbiddenFileSuffix: ".test.ts",
          reason: PackageSourceLayoutViolationReason.TestFileInProductionSource,
        },
        {
          packageName: PackageBoundaryRule.ProductionSource,
          sourceGlob: "runtime/src/**/*.ts",
          forbiddenFileSuffix: ".test.ts",
          reason: PackageSourceLayoutViolationReason.TestFileInProductionSource,
        },
        {
          packageName: PackageBoundaryRule.ProductionSource,
          sourceGlob: "state/src/**/*.ts",
          forbiddenFileSuffix: ".test.ts",
          reason: PackageSourceLayoutViolationReason.TestFileInProductionSource,
        },
        {
          packageName: PackageBoundaryRule.ProductionSource,
          sourceGlob: "state-cockroach/src/**/*.ts",
          forbiddenFileSuffix: ".test.ts",
          reason: PackageSourceLayoutViolationReason.TestFileInProductionSource,
        },
      ],
    });

    equal(violations.length, 0, violations.map((violation) => violation.message).join("\n"));
  });
});
