/**
 * Caregiver Permission Enforcement Module
 * ========================================
 *
 * This module provides a centralized place for checking caregiver permissions
 * based on their status (active/inactive/pending).
 *
 * STATUS DEFINITIONS (derived from home connections):
 * - active = connected to >= 1 home in the family
 * - inactive = connected to 0 homes in the family (access paused)
 * - pending = invite not yet accepted
 *
 * CURRENT STATE:
 * - Status is now derived from home_access table (not a stored flag)
 * - Permission enforcement is NOT yet fully active
 *
 * FUTURE IMPLEMENTATION:
 * - When a caregiver is "inactive", they should:
 *   - See a "Your access has been paused" screen OR
 *   - Have very limited visibility
 * - These behaviors will be implemented in a future update
 */

import { CaregiverStatus, CaregiverProfile } from "./AppStateContextV2";

/**
 * Check if a caregiver has active access (connected to at least 1 home)
 */
export function isCaregiverActive(caregiver: CaregiverProfile): boolean {
    return caregiver.status === "active";
}

/**
 * Check if a caregiver's access is currently inactive (no home connections)
 */
export function isCaregiverInactive(caregiver: CaregiverProfile): boolean {
    return caregiver.status === "inactive";
}

/**
 * Check if a caregiver invite is still pending
 */
export function isCaregiverPending(caregiver: CaregiverProfile): boolean {
    return caregiver.status === "pending";
}

/**
 * Check if a caregiver can view family data
 *
 * FUTURE: This will return false for inactive caregivers
 * CURRENT: Returns true for active caregivers only
 */
export function canViewFamilyData(caregiver: CaregiverProfile): boolean {
    return caregiver.status === "active";
}

/**
 * Check if a caregiver can edit family data
 *
 * FUTURE: This will return false for inactive caregivers
 * CURRENT: Returns true for active caregivers only
 */
export function canEditFamilyData(caregiver: CaregiverProfile): boolean {
    return caregiver.status === "active";
}

/**
 * Get a user-friendly message for the caregiver's access level
 */
export function getAccessLevelMessage(status: CaregiverStatus): string {
    switch (status) {
        case "active":
            return "Full access to family information";
        case "inactive":
            return "Access paused (not connected to any homes)";
        case "pending":
            return "Waiting to accept invite";
        default:
            return "Unknown access level";
    }
}

/**
 * Check if we should show the "access paused" screen to a caregiver
 *
 * FUTURE: This will be used to show a blocked screen for inactive caregivers
 * CURRENT: Always returns false (enforcement not yet active)
 */
export function shouldShowAccessPausedScreen(caregiver: CaregiverProfile): boolean {
    // TODO: Return true when enforcement is implemented
    // return caregiver.status === "inactive";
    return false;
}

/**
 * Check if a caregiver has access to a specific home
 */
export function hasAccessToHome(caregiver: CaregiverProfile, homeId: string): boolean {
    return caregiver.accessibleHomeIds?.includes(homeId) || false;
}

/**
 * Get the number of homes a caregiver has access to
 */
export function getHomeAccessCount(caregiver: CaregiverProfile): number {
    return caregiver.accessibleHomeIds?.length || 0;
}
