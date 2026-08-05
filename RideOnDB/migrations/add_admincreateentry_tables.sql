-- Admin Create Entry: DB schema (Stage B).
--
-- Three tables, created in strict FK-dependency order:
--   1. createentryrequest              -- secretary-bound "Proposed" request (no FK to the other two)
--   2. admincreateentryoperation       -- idempotency parent claim (no FK to either sibling)
--   3. admincreateentryoperationresult -- idempotency result, FKs to BOTH of the above
--
-- Mirrors the proven, live federationallocationrequest / federationallocationrequestitem
-- pattern (PR #257, feature/federation-allocation-idempotency): a parent claim row
-- inserted first via INSERT ... ON CONFLICT DO NOTHING, a result row inserted only
-- once, as the unconditional last statement of the successful path. A row's
-- existence means the operation it represents completed successfully -- there is
-- no durable Failed/InProgress state. Any failure inside usp_admincreateentry
-- aborts the whole implicit transaction, including the claim-row insert itself,
-- so nothing partial is ever committed.
--
-- Owner: inherited from the role that runs this migration (postgres, matching
-- every comparable table -- entry, changeentryrequest, federationallocationrequest*).
-- No explicit ownership-change statement is issued anywhere in this file.
--
-- RLS: ENABLE ROW LEVEL SECURITY, no policies -- matching changeentryrequest and
-- federationallocationrequest/federationallocationrequestitem exactly (verified
-- live: those three, and only those three among the comparable tables checked,
-- carry this combination). Access is exclusively through the backend's own
-- connection role, which bypasses RLS.

CREATE TABLE public.createentryrequest (
    createentryrequestid   integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    proposedentryid         integer     NOT NULL REFERENCES public.entry(entryid),
    status                   varchar     NOT NULL DEFAULT 'Pending'
                                          CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    requestdatetime           timestamptz NOT NULL DEFAULT now(),
    answeredbysystemuserid     integer     NULL REFERENCES public.systemuser(systemuserid),
    answeredat                  timestamptz NULL,
    fineid                        integer     NULL REFERENCES public.fine(fineid),
    fineamountsnapshot             numeric     NULL
);

CREATE INDEX ix_createentryrequest_proposedentry ON public.createentryrequest(proposedentryid);
CREATE INDEX ix_createentryrequest_status ON public.createentryrequest(status);

ALTER TABLE public.createentryrequest ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.admincreateentryoperation (
    operationid            text        NOT NULL PRIMARY KEY,
    competitionid            integer     NOT NULL REFERENCES public.competition(competitionid),
    requestedbypersonid       integer     NOT NULL REFERENCES public.person(personid),
    payloadfingerprint          text        NOT NULL,
    createdat                     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_admincreateentryoperation_competition ON public.admincreateentryoperation(competitionid);

ALTER TABLE public.admincreateentryoperation ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.admincreateentryoperationresult (
    operationid               text        NOT NULL PRIMARY KEY
                                            REFERENCES public.admincreateentryoperation(operationid),
    resulttype                  text        NOT NULL
                                              CHECK (resulttype IN ('DirectCreated', 'PendingCreateApproval')),
    entryid                       integer     NOT NULL REFERENCES public.entry(entryid),
    createentryrequestid            integer     NULL REFERENCES public.createentryrequest(createentryrequestid),
    createdat                         timestamptz NOT NULL DEFAULT now(),

    -- Result-shape integrity: a DirectCreated row can never carry a pending
    -- request id (nothing was ever created to answer), and a
    -- PendingCreateApproval row can never be missing one (usp_admincreateentry
    -- always inserts exactly one createentryrequest row on that branch,
    -- before this result row). entryId itself stays NOT NULL above for both
    -- result types -- every branch always produces a real entry, only
    -- whether it's already Active or still Proposed differs.
    CONSTRAINT ck_admincreateentryoperationresult_createentryrequestid_matches_type
        CHECK (
            (resulttype = 'DirectCreated' AND createentryrequestid IS NULL)
            OR (resulttype = 'PendingCreateApproval' AND createentryrequestid IS NOT NULL)
        )
);

CREATE INDEX ix_admincreateentryoperationresult_entry ON public.admincreateentryoperationresult(entryid);

ALTER TABLE public.admincreateentryoperationresult ENABLE ROW LEVEL SECURITY;
