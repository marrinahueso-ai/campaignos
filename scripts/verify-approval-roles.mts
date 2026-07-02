/**
 * Verifies role-based approval UI permissions (no database required).
 * Run: npx tsx scripts/verify-approval-roles.mts
 */
import {
  canApproveDraft,
  canDraftCommunications,
  canSubmitForApproval,
} from "../src/lib/auth/campaign-roles";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

assert(canApproveDraft("president"), "President should approve");
assert(canApproveDraft("admin"), "Admin should approve");
assert(canApproveDraft("vp_communications"), "VP Communications should approve");
assert(!canApproveDraft("contributor"), "Contributor should not approve");
assert(!canApproveDraft("view_only"), "View only should not approve");

assert(canSubmitForApproval("contributor"), "Contributor should submit");
assert(canSubmitForApproval("committee_chair"), "Committee chair should submit");
assert(!canSubmitForApproval("view_only"), "View only should not submit");
assert(canSubmitForApproval("president"), "President can also submit");

assert(canDraftCommunications("contributor"), "Contributor should draft");
assert(!canDraftCommunications("view_only"), "View only should not draft");

console.log("Approver role: Approve button expected (canApproveDraft=true)");
console.log("Contributor role: Send for approval expected (canSubmit && !canApprove)");
console.log("All role helper checks passed.");
