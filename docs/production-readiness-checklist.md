# Pharmacy platform production acceptance checklist

This is a release gate, not a declaration that production is ready. Automated checks, browser checks and real provider checks are separate evidence. Do not mark a real provider check complete based on a mocked callback or email response.

## Joining, billing and verification

- [ ] A new owner can register, verify their email, resume a saved application and recover their account.
- [ ] Pharmacy identity, location and verification information survive reloads; field errors explain how to correct them.
- [ ] Verification documents upload to private storage and are accessible only to the owner and authorised reviewers.
- [ ] KES 100 verification checkout opens in IntaSend and returns to the correct pharmacy application.
- [ ] An actual IntaSend callback reaches the deployed `/api/webhooks/intasend` endpoint (the `/api/payments/intasend/webhook` alias is also supported).
- [ ] Invalid challenges and amounts cannot settle an invoice; concurrent duplicate callbacks settle once; a late failure cannot undo payment.
- [ ] After payment, the owner explicitly reviews and submits the application. Payment is neither submission nor approval.
- [ ] Submission atomically records `submitted`, the onboarding event and a `pharmacy.application.review` email job.
- [ ] The review email reaches **omondielvin@gmail.com**. Check `PLATFORM_APPLICATION_REVIEW_EMAIL` if a recipient override is set.
- [ ] A temporary email outage leaves a retryable job. Confirm `/api/cron/platform` runs with `CRON_SECRET`, and inspect `/platform/jobs` for failed/dead-letter jobs.
- [ ] Email links use the deployed `NEXT_PUBLIC_APP_URL` and open the correct authenticated review screen.
- [ ] Approval, requests for more information, resubmission and rejection display the correct next action. An unapproved pharmacy remains unavailable for public transactions.

## Setup and plan boundaries

- [ ] Required verified contact/location, opening hours and public description are validated before launch.
- [ ] Medicines and services can each be added now or explicitly deferred. Deferring publishes no placeholder stock or service.
- [ ] Returning to setup preserves saved data and allows continuing with existing services without creating another.
- [ ] Photos, gallery, online payments and Premium are clearly optional at launch.
- [ ] Free supports 5 public medicine listings, 2 active services and 10 direct Afyvia prescription referrals per month.
- [ ] A limit error identifies what is full, how to free a slot, and where to upgrade.
- [ ] Premium is optional at KES 500/month. Expiry/downgrade retains operational data and applies the documented listing limits.
- [ ] IntaSend collects platform fees. Each pharmacy connects its own M-Pesa credentials separately for customer online payments.
- [ ] A pharmacy without online payment configuration can use the supported reservation/pay-at-visit journey; an online-payment-required service explains why it is unavailable.

## Pharmacy operations

- [ ] Create/edit medicines, add from the shared library, set prices and publish/unpublish listings.
- [ ] Receive stock with batches/expiry, adjust stock, prevent negative stock, and record the stock ledger.
- [ ] Reservation holds reduce sellable availability without reducing physical stock.
- [ ] Payment alone does not deduct reserved stock; fulfilment deducts once, including concurrent repeated clicks.
- [ ] Cancellation/expiry releases holds; returns/refunds and dispatch reversal reconcile financial and stock records.
- [ ] Create/edit/deactivate services; enforce Free limits; inactive services disappear publicly.
- [ ] Review bookings, confirm/reject/reschedule, and collect the appropriate payment without duplicating bookings/orders.
- [ ] Review prescriptions, request clarification, approve dispensing and handle refill requests through completion.
- [ ] Orders, payment receipts and reconciliation agree on amounts, customer and pharmacy.
- [ ] Staff permissions and tenant isolation prevent another pharmacy from reading or changing these records.

## Customer journeys

- [ ] Browse/search pharmacies and medicines on desktop and mobile; filters, location and empty states work.
- [ ] Only eligible pharmacies/listings are actionable, with accurate stock and service availability.
- [ ] Phone/WhatsApp/contact links target the selected pharmacy.
- [ ] Register/sign in and resume the original intended action without losing pharmacy context.
- [ ] Guests can submit supported requests without being attached to someone else's account by a guessed phone/email.
- [ ] Refill requests retain medicine, pharmacy, contact details and a working tracking route.
- [ ] Prescription upload validates files, reports progress/failure, stores media privately and supports retry.
- [ ] Medicine purchase/reservation prevents mixed-pharmacy mistakes, unavailable quantities and unauthorised prescription-only supply.
- [ ] Real M-Pesa success, cancellation, failure, timeout and retry produce correct order and receipt states.
- [ ] Free, pay-at-visit and online-payment-required appointments each have clear confirmation and follow-up states.

## Release evidence

- [ ] Clean-database migrations, Prisma generation, lint, TypeScript, automated tests and production compilation pass.
- [ ] Browser checks cover the critical journeys, mobile layouts and error recovery, with no blocking console errors.
- [ ] A deployed provider smoke test confirms IntaSend delivery, reviewer inbox receipt, private uploads and tenant M-Pesa settlement.
- [ ] Scheduled workers, dead-letter monitoring, production logs, backups and a tested restore/rollback procedure are operational.

Use an explicitly disposable database for integration tests:

```bash
KYP_TEST_DATABASE_URL='postgresql://.../disposable_test_database' npm test
```

The database-backed suites no longer load `.env.local`; absent an explicit test URL, they skip locally. CI uses its disposable `DATABASE_URL`. Never interpret skipped integration tests as a release pass.

The new `tests/production-journeys.integration.test.ts` exercises the HTTP callback against PostgreSQL, concurrent callback replay, durable reviewer-email retry (mock provider), optional service setup, inventory operations and Free service limits. These are local checks and do not prove delivery to a real provider or inbox.
