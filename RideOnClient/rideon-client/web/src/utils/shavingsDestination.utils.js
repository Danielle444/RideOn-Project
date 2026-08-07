// Delivery-destination presentation — HostSecretary UX slice (2026-08-07).
//
// The implementation moved to shared/shavings/shavingsDestination.utils.js when the
// RanchWorker mobile slice landed, so both apps read one formatter instead of growing a
// second implementation (see the task brief: "do not duplicate destination formatting in
// Secretary and Worker"). This file is a compatibility re-export only — no behavior change,
// no import path change for anything that already imports from "./shavingsDestination.utils".
export * from "../../../shared/shavings/shavingsDestination.utils";
