/**
 * Domain-specific errors for the Verified Compatibility Engine.
 */

export class CompatibilityDomainError extends Error {
  public readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class CompatibilityNotFoundError extends CompatibilityDomainError {
  constructor(id: string) {
    super(`Compatibility record with id "${id}" was not found.`, "COMPATIBILITY_NOT_FOUND");
  }
}

export class DeviceNotFoundError extends CompatibilityDomainError {
  constructor(id: string) {
    super(`Device with id "${id}" was not found.`, "DEVICE_NOT_FOUND");
  }
}

export class DeviceAlreadyExistsArchivedError extends CompatibilityDomainError {
  constructor(brand: string, modelNumber: string, id: string) {
    super(
      `Device "${brand} ${modelNumber}" already exists in the system as an ARCHIVED record (id: "${id}"). Use restoreDevice() instead of creating a duplicate.`,
      "DEVICE_ALREADY_EXISTS_ARCHIVED"
    );
  }
}

export class PartNotFoundError extends CompatibilityDomainError {
  constructor(id: string) {
    super(`Part with id "${id}" was not found.`, "PART_NOT_FOUND");
  }
}

export class DuplicateCompatibilityError extends CompatibilityDomainError {
  constructor(deviceId: string, partId: string) {
    super(
      `A compatibility relationship already exists for device "${deviceId}" and part "${partId}".`,
      "DUPLICATE_COMPATIBILITY"
    );
  }
}

export class CompatibilityAlreadyArchivedError extends CompatibilityDomainError {
  constructor(id: string) {
    super(`Compatibility record "${id}" is already archived.`, "COMPATIBILITY_ALREADY_ARCHIVED");
  }
}

export class ArchivedCompatibilityCannotBeVerifiedError extends CompatibilityDomainError {
  constructor(id: string) {
    super(
      `Cannot verify compatibility record "${id}" because it is archived. Restore it first before initiating verification.`,
      "ARCHIVED_COMPATIBILITY_CANNOT_BE_VERIFIED"
    );
  }
}

export class InsufficientVerificationPermissionError extends CompatibilityDomainError {
  constructor(userId: string, role?: string) {
    super(
      `User "${userId}" (role: ${role ?? "none"}) does not have authorized privileges to perform technical compatibility verification.`,
      "INSUFFICIENT_VERIFICATION_PERMISSION"
    );
  }
}

export class VerificationEvidenceRequiredError extends CompatibilityDomainError {
  constructor(details?: string) {
    super(
      details ?? `Verification requires at least one valid, non-empty CompatibilityEvidence record with sourceReference and evidenceDetails.`,
      "VERIFICATION_EVIDENCE_REQUIRED"
    );
  }
}

export class InvalidVerificationLevelError extends CompatibilityDomainError {
  constructor(level: string) {
    super(
      `VerificationLevel "${level}" is insufficient for final VERIFIED status. Only OEM_OFFICIAL, ENGINEERING_VERIFIED, or PHYSICAL_TEST_VERIFIED are eligible for final verification.`,
      "INVALID_VERIFICATION_LEVEL"
    );
  }
}

export class InvalidCompatibilityStateTransitionError extends CompatibilityDomainError {
  constructor(from: string, to: string, reason?: string) {
    super(
      `Invalid state transition from "${from}" to "${to}"${reason ? ": " + reason : "."}`,
      "INVALID_STATE_TRANSITION"
    );
  }
}

export class CannotDeleteVerifiedCompatibilityError extends CompatibilityDomainError {
  constructor(id: string) {
    super(
      `Cannot hard-delete verified compatibility record "${id}". Approved engineering knowledge must be preserved. Use archiveCompatibility() instead.`,
      "CANNOT_DELETE_VERIFIED_COMPATIBILITY"
    );
  }
}

export class ImmutableVerifiedStateError extends CompatibilityDomainError {
  constructor(field: string) {
    super(
      `Field "${field}" of a VERIFIED record cannot be modified directly via generic update. A re-verification workflow must be used to protect data integrity.`,
      "IMMUTABLE_VERIFIED_STATE"
    );
  }
}
