# Changes

## Caregiver action flows

### Fixed: caregiver refill request entry point
- `/caregiver/refills/new` no longer redirects back to `/caregiver/refills` merely because no `customerId` query parameter was supplied.
- When the caregiver has exactly one patient with refill permission, the page opens that patient's refill form automatically.
- When the caregiver has multiple eligible patients, the page now presents a patient selector containing only patients for whom refill permission is active.
- When the caregiver has no eligible patients, the existing safe return to `/caregiver/refills` remains in place.

### Fixed: prescription selection from patient context
- Refill links that include `prescriptionId` now preselect that prescription in the refill form instead of silently defaulting to the first prescription.
- Server-side authorization and prescription ownership checks remain enforced; the UI changes do not weaken caregiver permissions.

### Authorization preserved
- Caregiver refill submission still requires an active caregiver relationship and `canRequestRefills` permission.
- The API still verifies that the selected prescription belongs to the selected patient and is active, and that refills remain available.
- Caregivers still cannot approve or prepare refills themselves.

## Validation
- Reviewed caregiver refill, adherence, patient-detail, notification, and caregiver API flows for the same authorization/entry-point pattern.
- The caregiver adherence API already enforces `canLogAdherence` and prescription ownership.
- Pickup notifications are correctly restricted to linked patients with `canReceivePickupNotifications`.
- Full lint/build could not be executed in the supplied archive because `node_modules` is not present in the project and package installation was not performed.
