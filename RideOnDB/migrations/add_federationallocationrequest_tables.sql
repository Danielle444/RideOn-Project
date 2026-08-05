-- Federation allocation idempotency (Revision 3).
-- Parent/child evidence tables for usp_AllocateFederationCreditToChargeIdempotent,
-- usp_BulkAllocateFederationCreditToChargesIdempotent and
-- usp_ApproveFederationMatchingSuggestionIdempotent.
--
-- A row's existence means the operation it represents completed successfully -
-- there is no durable Failed/InProgress state. Any failure inside the owning
-- function aborts the whole implicit transaction, including the request-row
-- insert itself, so nothing partial is ever committed. See the design report
-- for the full rationale.

CREATE TABLE public.federationallocationrequest (
    requestid                      text PRIMARY KEY,
    operationtype                  character varying NOT NULL
        CHECK (operationtype IN ('DirectAllocation', 'BulkAllocation', 'MatchingSuggestionApproval')),
    competitionid                  integer NOT NULL REFERENCES public.competition(competitionid),
    federationexternalcreditid     integer NOT NULL REFERENCES public.federationexternalcredit(federationexternalcreditid),
    requestedbysystemuserid        integer NOT NULL REFERENCES public.systemuser(systemuserid),
    paidbypersonid                 integer NULL REFERENCES public.person(personid),
    requestedamount                numeric NULL,
    notes                          text NULL,
    payloadfingerprint             text NOT NULL,
    createdat                      timestamptz NOT NULL DEFAULT now(),
    -- Aggregate result snapshot, MatchingSuggestionApproval only - mirrors
    -- usp_approvefederationmatchingsuggestion's (199) own 4-column return shape.
    -- NULL for DirectAllocation/BulkAllocation, which replay from their item
    -- row(s) instead (federationallocationrequestitem).
    snapshot_approvedamount        numeric NULL,
    snapshot_allocationscount      integer NULL,
    snapshot_remainingcreditamount numeric NULL,
    snapshot_message               text NULL
);

CREATE INDEX ix_federationallocationrequest_credit ON public.federationallocationrequest(federationexternalcreditid);
CREATE INDEX ix_federationallocationrequest_competition ON public.federationallocationrequest(competitionid);

ALTER TABLE public.federationallocationrequest ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.federationallocationrequestitem (
    federationallocationrequestitemid  integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    requestid                          text NOT NULL REFERENCES public.federationallocationrequest(requestid),
    billchargeid                       integer NOT NULL REFERENCES public.billcharge(billchargeid),
    requestedamount                    numeric NOT NULL,
    -- Live convenience pointer only - dies with the row on release (SP 223's
    -- hard DELETE), never read for replay. ON DELETE SET NULL is deliberate
    -- and narrow: it exists so 223's unconditional DELETE FROM
    -- federationcreditallocation is never blocked by this new FK, without
    -- weakening the FK to the point of allowing an orphaned id to be reused.
    resultfederationcreditallocationid integer NULL
        REFERENCES public.federationcreditallocation(federationcreditallocationid) ON DELETE SET NULL,
    -- Frozen snapshot of usp_allocatefederationcredittocharge's (193) actual
    -- 11-column RETURNS TABLE shape, immutable, survives release. Replay
    -- reads exclusively from these columns, never from the live FK above.
    snapshot_federationcreditallocationid integer NULL,
    snapshot_entryid                      integer NULL,
    snapshot_allocatedamount              numeric NULL,
    snapshot_creditusedamount             numeric NULL,
    snapshot_creditavailableamount        numeric NULL,
    snapshot_creditstatus                 character varying NULL,
    snapshot_billchargeamount             numeric NULL,
    snapshot_billchargecoveredamount      numeric NULL,
    snapshot_billchargestatus             character varying NULL,
    createdat                             timestamptz NOT NULL DEFAULT now(),

    -- Deterministic item key, scoped under one requestid only - creates no
    -- constraint spanning different parent operations, so a new requestid
    -- allocating to the same charge again is completely unaffected. This is
    -- NOT a unique constraint on (federationexternalcreditid, billchargeid).
    CONSTRAINT ux_federationallocationrequestitem_request_charge UNIQUE (requestid, billchargeid)
);

CREATE INDEX ix_federationallocationrequestitem_charge ON public.federationallocationrequestitem(billchargeid);

ALTER TABLE public.federationallocationrequestitem ENABLE ROW LEVEL SECURITY;
