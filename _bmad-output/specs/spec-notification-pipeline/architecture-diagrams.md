# Architecture Diagrams — Notification Pipeline

## One pipeline, three callers

```mermaid
flowchart TD
    subgraph Callers
        C46["#46 registration nudge<br/>RegistrationWindowPanel (web)"]
        C31["#31 pending-orders bat-signal<br/>Shavings page (web)"]
        CDR["Delivery reminder<br/>SendDeliveryReminder(shavingsOrderId)<br/>(called by Shavings track — BLOCKED)"]
    end

    C46 --> CONFIRM
    C31 --> CONFIRM
    CDR -. no confirm gate .-> SEND

    CONFIRM["Confirm-before-send gate (shared, two-step)<br/>shows recipient count + ranch + exact text"] --> SEND

    SEND["Send path: controller → BL → DAL → DBServices.cs → stored procs"]
    SEND --> THROTTLE{"Throttle check<br/>ranch + type + competition<br/>+ sentdate > now()-N min"}
    THROTTLE -- "duplicate: suppress" --> DROP["No push"]
    THROTTLE -- "clear" --> RESOLVE

    RESOLVE["Recipient resolution SPs<br/>@ranchid, rolestatus='Approved'"]
    RESOLVE --> TOKENS["Push-token table<br/>(keyed on personid)"]
    TOKENS --> EXPO["Expo transport<br/>(swappable leg, keyed off notificationtype)"]
    EXPO --> AUDIT["Sent-notification row<br/>(audit + dedupe source)"]
    EXPO --> PHONE["Push lands on device"]
```

## Recipient resolution per caller

```mermaid
flowchart LR
    R46["#46"] --> PRR46["personranchrole<br/>roleid=2 (admins), Approved"] --> PID["personid set"]
    R31["#31"] --> PRR31["personranchrole<br/>roleid=4 (field workers), Approved"] --> PID
    RDR["Delivery reminder"] --> SO["shavingsorder.workersystemuserid<br/>(a systemuserid)"]
    SO --> BRIDGE["personmanagedbysystemuser<br/>systemuserid → personid"]
    BRIDGE --> PID1["single personid"]
    PID --> TOK["push-token lookup (personid)"]
    PID1 --> TOK
```

**Note the asymmetry:** #46 and #31 resolve straight to `personid` (login and roles are personid). Only the delivery reminder crosses the `systemuserid → personid` bridge, and that translation is confined to its edge — it is not a system-wide concern.
