/**
 * corporate/org-seed.ts — a concrete organization, ported from the reference catalog.
 *
 * The hats, ids, levels, departments and `reportsTo` edges are taken from
 * `agentic-organization/packages/application/src/org-seed.ts` rather than invented, so the canonical
 * register runs the same shape the corporate register describes — including the parts that surprised
 * this port:
 *
 *   - **The C-suite reports to itself.** `cto → ceo` and `chief_architect → cto` are peer edges.
 *   - **The RMO is a Director**, not an executive function floating outside the chart. Resource
 *     procurement happens inside the reporting line, under the COO.
 *   - **`initiative_planner` is an IC reporting to the Program Director**, not to a manager — the
 *     hat that converts goals into initiatives sits beside the director who prioritizes them.
 *
 * This is a SUBSET (the reference has 117 hats across 16 departments). What it is not is a sample:
 * every level is populated and every level is reachable from every other, because the point of the
 * seed is to exercise the chain, and a chain with a missing rung proves nothing about the rungs
 * either side of it.
 */

import type { OrgHat } from "./org-chart";
import { GateKind } from "./quality-gate";

const G = GateKind;

/** Departments present in this seed. Ids match the reference catalog. */
export const Department = {
  ExecutiveBoardAndGovernance: "executive_board_and_governance",
  ProgramAndInitiativeManagement: "program_and_initiative_management",
  ProductAndCustomerDiscovery: "product_and_customer_discovery",
  Architecture: "architecture",
  Engineering: "engineering",
  QaAndVerification: "qa_and_verification",
  SecurityAndCompliance: "security_and_compliance",
  OperationsAndInfrastructure: "operations_and_infrastructure",
} as const;

export type Department = (typeof Department)[keyof typeof Department];

const D = Department;

/**
 * The seed hats.
 *
 * `executive_board_member` is the single root — the only hat with no `reportsTo`, which is what
 * `buildOrgChart` requires and what makes every escalation terminate somewhere real.
 */
export const SEED_HATS: readonly OrgHat[] = [
  // ── Executive Board and Governance ──
  { id: "executive_board_member", name: "Executive Board Member", level: "executive_board", departmentId: D.ExecutiveBoardAndGovernance },
  { id: "ceo", name: "CEO", level: "c_suite", departmentId: D.ExecutiveBoardAndGovernance, reportsTo: "executive_board_member" },
  // Peer edges inside the C-suite — the reference shape, and the reason the chart validator allows
  // same-level reporting.
  { id: "cto", name: "CTO", level: "c_suite", departmentId: D.ExecutiveBoardAndGovernance, reportsTo: "ceo" },
  { id: "coo", name: "COO", level: "c_suite", departmentId: D.ExecutiveBoardAndGovernance, reportsTo: "ceo" },
  { id: "cfo", name: "CFO", level: "c_suite", departmentId: D.ExecutiveBoardAndGovernance, reportsTo: "ceo" },
  { id: "chief_architect", name: "Chief Architect", level: "c_suite", departmentId: D.ExecutiveBoardAndGovernance, reportsTo: "cto", approvalScopes: [G.ArchitectureApproval] },
  { id: "hat_approval_steward", name: "Hat Approval Steward", level: "director", departmentId: D.ExecutiveBoardAndGovernance, reportsTo: "ceo" },

  // ── Program and Initiative Management ──
  { id: "program_director", name: "Program Director", level: "director", departmentId: D.ProgramAndInitiativeManagement, reportsTo: "coo" },
  { id: "senior_tpm", name: "Senior TPM", level: "manager", departmentId: D.ProgramAndInitiativeManagement, reportsTo: "program_director", approvalScopes: [G.ReleaseReadiness] },
  { id: "tpm", name: "TPM", level: "manager", departmentId: D.ProgramAndInitiativeManagement, reportsTo: "senior_tpm", approvalScopes: [G.ReleaseReadiness] },
  { id: "mission_control_lead", name: "Mission Control Lead", level: "lead", departmentId: D.ProgramAndInitiativeManagement, reportsTo: "tpm" },
  { id: "initiative_planner", name: "Initiative Planner", level: "individual_contributor", departmentId: D.ProgramAndInitiativeManagement, reportsTo: "program_director" },

  // ── Product and Customer Discovery ──
  { id: "product_director", name: "Product Director", level: "director", departmentId: D.ProductAndCustomerDiscovery, reportsTo: "ceo", approvalScopes: [G.CustomerRfpReview, G.BrdApproval, G.FinalBusinessValidation] },
  { id: "product_manager", name: "Product Manager", level: "manager", departmentId: D.ProductAndCustomerDiscovery, reportsTo: "product_director", approvalScopes: [G.CustomerRfpReview, G.BrdApproval, G.FinalBusinessValidation] },

  // ── Architecture ──
  { id: "architecture_director", name: "Architecture Director", level: "director", departmentId: D.Architecture, reportsTo: "cto", approvalScopes: [G.ArchitectureApproval] },
  { id: "solution_architect", name: "Solution Architect", level: "individual_contributor", departmentId: D.Architecture, reportsTo: "architecture_director", approvalScopes: [G.ArchitectureApproval] },

  // ── Engineering ──
  { id: "engineering_director", name: "Engineering Director", level: "director", departmentId: D.Engineering, reportsTo: "cto" },
  { id: "engineering_manager", name: "Engineering Manager", level: "manager", departmentId: D.Engineering, reportsTo: "engineering_director", approvalScopes: [G.ImplementationReview] },
  { id: "tech_lead", name: "Tech Lead", level: "lead", departmentId: D.Engineering, reportsTo: "engineering_manager", approvalScopes: [G.ImplementationReview] },
  { id: "backend_implementer", name: "Backend Implementer", level: "individual_contributor", departmentId: D.Engineering, reportsTo: "tech_lead" },
  { id: "frontend_implementer", name: "Frontend Implementer", level: "individual_contributor", departmentId: D.Engineering, reportsTo: "tech_lead" },

  // ── QA and Verification ──
  { id: "qa_director", name: "QA Director", level: "director", departmentId: D.QaAndVerification, reportsTo: "coo", approvalScopes: [G.RuntimeValidation] },
  { id: "qa_manager", name: "QA Manager", level: "manager", departmentId: D.QaAndVerification, reportsTo: "qa_director", approvalScopes: [G.RuntimeValidation] },
  { id: "qa_engineer", name: "QA Engineer", level: "individual_contributor", departmentId: D.QaAndVerification, reportsTo: "qa_manager", approvalScopes: [G.RuntimeValidation] },

  // ── Security and Compliance ──
  { id: "security_director", name: "Security Director", level: "director", departmentId: D.SecurityAndCompliance, reportsTo: "cto" },
  { id: "security_engineer", name: "Security Engineer", level: "individual_contributor", departmentId: D.SecurityAndCompliance, reportsTo: "security_director" },

  // ── Operations and Infrastructure ──
  // The Resource Management Office. A Director under the COO — resource procurement is inside the
  // reporting line, which is what makes a capacity request routable rather than a special case.
  { id: "rmo_office", name: "Resource Management Office", level: "director", departmentId: D.OperationsAndInfrastructure, reportsTo: "coo" },
  { id: "operations_director", name: "Operations Director", level: "director", departmentId: D.OperationsAndInfrastructure, reportsTo: "coo" },
  { id: "sre", name: "Site Reliability Engineer", level: "individual_contributor", departmentId: D.OperationsAndInfrastructure, reportsTo: "operations_director" },
];
