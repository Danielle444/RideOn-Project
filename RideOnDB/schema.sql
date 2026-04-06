-- RideOn Schema - Run this in Supabase SQL Editor
-- Tables are ordered to respect foreign key dependencies

-- 1. No dependencies
CREATE TABLE IF NOT EXISTS public.field (
  fieldid smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  fieldname character varying NOT NULL UNIQUE,
  CONSTRAINT field_pkey PRIMARY KEY (fieldid)
);

CREATE TABLE IF NOT EXISTS public.role (
  roleid smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  rolename character varying NOT NULL UNIQUE,
  CONSTRAINT role_pkey PRIMARY KEY (roleid)
);

CREATE TABLE IF NOT EXISTS public.fine (
  fineid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  finename character varying NOT NULL,
  finedescription character varying,
  fineamount numeric NOT NULL,
  CONSTRAINT fine_pkey PRIMARY KEY (fineid)
);

CREATE TABLE IF NOT EXISTS public.prizetype (
  prizetypeid smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  prizetypename character varying NOT NULL UNIQUE,
  prizedescription character varying,
  CONSTRAINT prizetype_pkey PRIMARY KEY (prizetypeid)
);

CREATE TABLE IF NOT EXISTS public.judge (
  judgeid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  firstnamehebrew character varying NOT NULL,
  lastnamehebrew character varying NOT NULL,
  firstnameenglish character varying,
  lastnameenglish character varying,
  country character varying,
  CONSTRAINT judge_pkey PRIMARY KEY (judgeid)
);

CREATE TABLE IF NOT EXISTS public.maneuver (
  maneuverid smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  maneuvername character varying NOT NULL UNIQUE,
  maneuverdescription character varying NOT NULL,
  CONSTRAINT maneuver_pkey PRIMARY KEY (maneuverid)
);

CREATE TABLE IF NOT EXISTS public.pattern (
  patternnumber smallint NOT NULL,
  CONSTRAINT pattern_pkey PRIMARY KEY (patternnumber)
);

CREATE TABLE IF NOT EXISTS public.paidtimeslot (
  paidtimeslotid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  dayofweek character varying NOT NULL,
  timeofday character varying NOT NULL,
  CONSTRAINT paidtimeslot_pkey PRIMARY KEY (paidtimeslotid)
);

CREATE TABLE IF NOT EXISTS public.paymentmethod (
  paymentmethodid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  paymentmethodtype character varying NOT NULL UNIQUE,
  CONSTRAINT paymentmethod_pkey PRIMARY KEY (paymentmethodid)
);

CREATE TABLE IF NOT EXISTS public.productcategory (
  categoryid smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  categoryname character varying NOT NULL UNIQUE,
  CONSTRAINT productcategory_pkey PRIMARY KEY (categoryid)
);

CREATE TABLE IF NOT EXISTS public.superuser (
  superuserid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  email character varying NOT NULL UNIQUE,
  passwordhash character varying NOT NULL,
  passwordsalt character varying NOT NULL,
  isactive boolean NOT NULL DEFAULT true,
  mustchangepassword boolean NOT NULL DEFAULT false,
  createddate timestamp with time zone NOT NULL DEFAULT now(),
  lastlogindate timestamp with time zone,
  CONSTRAINT superuser_pkey PRIMARY KEY (superuserid)
);

CREATE TABLE IF NOT EXISTS public.person (
  personid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nationalid character varying NOT NULL UNIQUE CHECK (nationalid ~ '^[0-9]{9}$'),
  firstname character varying NOT NULL,
  lastname character varying NOT NULL,
  gender character varying,
  dateofbirth date,
  cellphone character varying CHECK (cellphone IS NULL OR length(cellphone) >= 9 AND length(cellphone) <= 20 AND cellphone ~ '^[0-9+ \-]+$'),
  email character varying CHECK (email IS NULL OR email ~ '^.+@.+\..+'),
  CONSTRAINT person_pkey PRIMARY KEY (personid)
);

CREATE TABLE IF NOT EXISTS public.ranch (
  ranchid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  ranchname character varying NOT NULL UNIQUE,
  contactemail character varying CHECK (contactemail IS NULL OR contactemail ~ '^.+@.+\..+'),
  contactphone character varying CHECK (contactphone IS NULL OR length(contactphone) >= 9 AND length(contactphone) <= 20 AND contactphone ~ '^[0-9+ \-]+$'),
  websiteurl character varying,
  location text,
  ranchstatus character varying NOT NULL DEFAULT 'Pending',
  CONSTRAINT ranch_pkey PRIMARY KEY (ranchid)
);

CREATE TABLE IF NOT EXISTS public.notificationtype (
  notificationtypeid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  notificationtypename character varying NOT NULL,
  notificationtypedescription character varying,
  CONSTRAINT notificationtype_pkey PRIMARY KEY (notificationtypeid)
);

CREATE TABLE IF NOT EXISTS public.messageforcompetition (
  messageid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  messagecontent character varying NOT NULL,
  senddate timestamp with time zone,
  createddatetime timestamp with time zone NOT NULL,
  status character varying,
  CONSTRAINT messageforcompetition_pkey PRIMARY KEY (messageid)
);

-- 2. Depend on base tables
CREATE TABLE IF NOT EXISTS public.systemuser (
  systemuserid integer NOT NULL,
  username character varying NOT NULL UNIQUE,
  passwordhash character varying NOT NULL,
  passwordsalt character varying NOT NULL,
  isactive boolean NOT NULL DEFAULT true,
  mustchangepassword boolean NOT NULL DEFAULT false,
  createddate timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT systemuser_pkey PRIMARY KEY (systemuserid),
  CONSTRAINT fk_systemuser_person FOREIGN KEY (systemuserid) REFERENCES public.person(personid)
);

CREATE TABLE IF NOT EXISTS public.product (
  productid smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  categoryid smallint NOT NULL,
  productname character varying NOT NULL UNIQUE,
  CONSTRAINT product_pkey PRIMARY KEY (productid),
  CONSTRAINT fk_product_productcategory FOREIGN KEY (categoryid) REFERENCES public.productcategory(categoryid)
);

CREATE TABLE IF NOT EXISTS public.federationmember (
  federationmemberid integer NOT NULL,
  hasvalidmembership boolean,
  medicalcheckvaliduntil date,
  certificationlevel character varying,
  CONSTRAINT federationmember_pkey PRIMARY KEY (federationmemberid),
  CONSTRAINT fk_federationmember_person FOREIGN KEY (federationmemberid) REFERENCES public.person(personid)
);

CREATE TABLE IF NOT EXISTS public.judgefield (
  judgeid integer NOT NULL,
  fieldid smallint NOT NULL,
  CONSTRAINT judgefield_pkey PRIMARY KEY (judgeid, fieldid),
  CONSTRAINT judgefield_judgeid_fkey FOREIGN KEY (judgeid) REFERENCES public.judge(judgeid),
  CONSTRAINT judgefield_fieldid_fkey FOREIGN KEY (fieldid) REFERENCES public.field(fieldid)
);

CREATE TABLE IF NOT EXISTS public.classtype (
  classtypeid smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  fieldid smallint NOT NULL,
  classname character varying NOT NULL,
  judgingsheetformat character varying,
  qualificationdescription character varying,
  CONSTRAINT classtype_pkey PRIMARY KEY (classtypeid),
  CONSTRAINT classtype_fieldid_fkey FOREIGN KEY (fieldid) REFERENCES public.field(fieldid)
);

CREATE TABLE IF NOT EXISTS public.patternmaneuver (
  patternnumber smallint NOT NULL,
  maneuverid smallint,
  "Order" smallint NOT NULL,
  CONSTRAINT patternmaneuver_pkey PRIMARY KEY (patternnumber, "Order"),
  CONSTRAINT patternmaneuver_patternnumber_fkey FOREIGN KEY (patternnumber) REFERENCES public.pattern(patternnumber),
  CONSTRAINT patternmaneuver_maneuverid_fkey FOREIGN KEY (maneuverid) REFERENCES public.maneuver(maneuverid)
);

CREATE TABLE IF NOT EXISTS public.personranch (
  personid integer NOT NULL,
  ranchid integer NOT NULL,
  CONSTRAINT personranch_pkey PRIMARY KEY (personid, ranchid),
  CONSTRAINT fk_personranch_person FOREIGN KEY (personid) REFERENCES public.person(personid),
  CONSTRAINT fk_personranch_ranch FOREIGN KEY (ranchid) REFERENCES public.ranch(ranchid)
);

CREATE TABLE IF NOT EXISTS public.arena (
  ranchid integer NOT NULL,
  arenaid smallint NOT NULL,
  arenaname character varying NOT NULL,
  arenalength smallint,
  arenawidth smallint,
  iscovered boolean,
  CONSTRAINT arena_pkey PRIMARY KEY (ranchid, arenaid),
  CONSTRAINT fk_arena_ranch FOREIGN KEY (ranchid) REFERENCES public.ranch(ranchid)
);

CREATE TABLE IF NOT EXISTS public.horse (
  horseid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  ranchid integer NOT NULL,
  horsename character varying NOT NULL,
  barnname character varying,
  federationnumber character varying UNIQUE,
  chipnumber character varying,
  birthyear smallint,
  gender character varying,
  CONSTRAINT horse_pkey PRIMARY KEY (horseid),
  CONSTRAINT fk_horse_ranch FOREIGN KEY (ranchid) REFERENCES public.ranch(ranchid)
);

CREATE TABLE IF NOT EXISTS public.stallcompound (
  ranchid integer NOT NULL,
  compoundid smallint NOT NULL,
  compoundname character varying NOT NULL,
  CONSTRAINT stallcompound_pkey PRIMARY KEY (ranchid, compoundid),
  CONSTRAINT fk_stallcompound_ranch FOREIGN KEY (ranchid) REFERENCES public.ranch(ranchid)
);

CREATE TABLE IF NOT EXISTS public.pricecatalog (
  pricecatalogid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  productid smallint NOT NULL,
  ranchid integer NOT NULL,
  creationdate timestamp with time zone NOT NULL,
  itemprice numeric NOT NULL,
  isactive boolean DEFAULT true,
  CONSTRAINT pricecatalog_pkey PRIMARY KEY (pricecatalogid),
  CONSTRAINT fk_pricecatalog_product FOREIGN KEY (productid) REFERENCES public.product(productid),
  CONSTRAINT fk_pricecatalog_ranch FOREIGN KEY (ranchid) REFERENCES public.ranch(ranchid)
);

CREATE TABLE IF NOT EXISTS public.paidtimeproduct (
  productid smallint NOT NULL,
  durationminutes integer NOT NULL,
  CONSTRAINT paidtimeproduct_pkey PRIMARY KEY (productid),
  CONSTRAINT paidtimeproduct_productid_fkey FOREIGN KEY (productid) REFERENCES public.product(productid)
);

-- 3. Depend on ranch + field + systemuser
CREATE TABLE IF NOT EXISTS public.competition (
  competitionid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  hostranchid integer NOT NULL,
  fieldid smallint NOT NULL,
  createdbysystemuserid integer NOT NULL,
  competitionname character varying NOT NULL UNIQUE,
  competitionstartdate date NOT NULL,
  competitionenddate date NOT NULL,
  registrationopendate date,
  registrationenddate date,
  paidtimeregistrationdate date,
  paidtimepublicationdate date,
  competitionstatus character varying,
  notes character varying,
  stallmapurl character varying,
  CONSTRAINT competition_pkey PRIMARY KEY (competitionid),
  CONSTRAINT fk_competition_ranch FOREIGN KEY (hostranchid) REFERENCES public.ranch(ranchid),
  CONSTRAINT fk_competition_field FOREIGN KEY (fieldid) REFERENCES public.field(fieldid)
);

CREATE TABLE IF NOT EXISTS public.newranchrequest (
  requestid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  ranchid integer NOT NULL UNIQUE,
  submittedbysystemuserid integer NOT NULL,
  requestdate timestamp with time zone NOT NULL DEFAULT now(),
  requeststatus character varying NOT NULL DEFAULT 'Pending',
  resolvedbysuperuserid integer,
  resolveddate timestamp with time zone,
  CONSTRAINT newranchrequest_pkey PRIMARY KEY (requestid),
  CONSTRAINT fk_newranchrequest_ranch FOREIGN KEY (ranchid) REFERENCES public.ranch(ranchid),
  CONSTRAINT fk_newranchrequest_systemuser FOREIGN KEY (submittedbysystemuserid) REFERENCES public.systemuser(systemuserid),
  CONSTRAINT fk_newranchrequest_superuser FOREIGN KEY (resolvedbysuperuserid) REFERENCES public.superuser(superuserid)
);

CREATE TABLE IF NOT EXISTS public.personranchrole (
  personid integer NOT NULL,
  ranchid integer NOT NULL,
  roleid smallint NOT NULL,
  rolestatus character varying NOT NULL DEFAULT 'Pending' CHECK (rolestatus = ANY (ARRAY['Pending', 'Approved', 'Rejected'])),
  CONSTRAINT personranchrole_pkey PRIMARY KEY (personid, ranchid, roleid),
  CONSTRAINT fk_personranchrole_personranch FOREIGN KEY (personid, ranchid) REFERENCES public.personranch(personid, ranchid),
  CONSTRAINT fk_personranchrole_role FOREIGN KEY (roleid) REFERENCES public.role(roleid)
);

CREATE TABLE IF NOT EXISTS public.personmanagedbysystemuser (
  systemuserid integer NOT NULL,
  personid integer NOT NULL,
  requestdate timestamp with time zone NOT NULL DEFAULT now(),
  updatedate timestamp with time zone,
  approvalstatus character varying NOT NULL DEFAULT 'Pending' CHECK (approvalstatus = ANY (ARRAY['Pending', 'Approved', 'Rejected'])),
  CONSTRAINT personmanagedbysystemuser_pkey PRIMARY KEY (systemuserid, personid),
  CONSTRAINT fk_personmanagedbysystemuser_systemuser FOREIGN KEY (systemuserid) REFERENCES public.systemuser(systemuserid),
  CONSTRAINT fk_personmanagedbysystemuser_person FOREIGN KEY (personid) REFERENCES public.person(personid)
);

-- 4. Depend on competition
CREATE TABLE IF NOT EXISTS public.classincompetition (
  classincompid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  competitionid integer NOT NULL,
  classtypeid smallint NOT NULL,
  arenaranchid integer NOT NULL,
  arenaid smallint NOT NULL,
  classdatetime timestamp with time zone,
  organizercost numeric,
  federationcost numeric,
  classnotes character varying,
  starttime time without time zone,
  orderinday smallint,
  CONSTRAINT classincompetition_pkey PRIMARY KEY (classincompid),
  CONSTRAINT fk_classincompetition_competition FOREIGN KEY (competitionid) REFERENCES public.competition(competitionid)
);

CREATE TABLE IF NOT EXISTS public.paidtimeslotincompetition (
  paidtimeslotincompid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  competitionid integer NOT NULL,
  paidtimeslotid integer NOT NULL,
  arenaranchid integer NOT NULL,
  arenaid integer NOT NULL,
  slotdate date NOT NULL,
  starttime time without time zone NOT NULL,
  endtime time without time zone NOT NULL,
  slotstatus character varying,
  slotnotes character varying,
  CONSTRAINT paidtimeslotincompetition_pkey PRIMARY KEY (paidtimeslotincompid),
  CONSTRAINT fk_paidtimeslotincomp_comp FOREIGN KEY (competitionid) REFERENCES public.competition(competitionid)
);

CREATE TABLE IF NOT EXISTS public.productrequest (
  prequestid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  competitionid integer NOT NULL,
  productid smallint NOT NULL,
  quantity smallint NOT NULL DEFAULT 1,
  requestdatetime timestamp with time zone DEFAULT now(),
  CONSTRAINT productrequest_pkey PRIMARY KEY (prequestid),
  CONSTRAINT productrequest_competitionid_fkey FOREIGN KEY (competitionid) REFERENCES public.competition(competitionid),
  CONSTRAINT productrequest_productid_fkey FOREIGN KEY (productid) REFERENCES public.product(productid)
);

CREATE TABLE IF NOT EXISTS public.horseparticipationincompetition (
  horseid integer NOT NULL,
  competitionid integer NOT NULL,
  hcapprovalstatus character varying,
  hcapprovaldate date,
  hcpath character varying,
  hcuploaddate timestamp with time zone,
  hcapproversystemuserid integer,
  CONSTRAINT horseparticipationincompetition_pkey PRIMARY KEY (horseid, competitionid),
  CONSTRAINT horseparticipationincompetition_horseid_fkey FOREIGN KEY (horseid) REFERENCES public.horse(horseid),
  CONSTRAINT horseparticipationincompetition_competitionid_fkey FOREIGN KEY (competitionid) REFERENCES public.competition(competitionid),
  CONSTRAINT horseparticipationincompetition_hcapproversystemuserid_fkey FOREIGN KEY (hcapproversystemuserid) REFERENCES public.systemuser(systemuserid)
);

-- 5. Depend on classincompetition
CREATE TABLE IF NOT EXISTS public.classjudge (
  classincompid integer NOT NULL,
  judgeid integer NOT NULL,
  CONSTRAINT classjudge_pkey PRIMARY KEY (classincompid, judgeid),
  CONSTRAINT fk_classjudge_classincompetition FOREIGN KEY (classincompid) REFERENCES public.classincompetition(classincompid),
  CONSTRAINT fk_classjudge_judge FOREIGN KEY (judgeid) REFERENCES public.judge(judgeid)
);

CREATE TABLE IF NOT EXISTS public.classprize (
  classincompid integer NOT NULL,
  prizetypeid smallint NOT NULL,
  prizeamount numeric NOT NULL,
  CONSTRAINT classprize_pkey PRIMARY KEY (classincompid, prizetypeid),
  CONSTRAINT fk_classprize_classincompetition FOREIGN KEY (classincompid) REFERENCES public.classincompetition(classincompid),
  CONSTRAINT fk_classprize_prizetype FOREIGN KEY (prizetypeid) REFERENCES public.prizetype(prizetypeid)
);

CREATE TABLE IF NOT EXISTS public.reiningtype (
  reiningclassincompid integer NOT NULL,
  patternnumber smallint NOT NULL,
  CONSTRAINT reiningtype_pkey PRIMARY KEY (reiningclassincompid),
  CONSTRAINT fk_reiningtype_class FOREIGN KEY (reiningclassincompid) REFERENCES public.classincompetition(classincompid)
);

CREATE TABLE IF NOT EXISTS public.entry (
  entryid integer NOT NULL,
  classincompid integer NOT NULL,
  fineid integer,
  prizerecipientname character varying,
  draworder smallint,
  riderfederationmemberid integer,
  CONSTRAINT entry_pkey PRIMARY KEY (entryid),
  CONSTRAINT fk_entry_classincompetition FOREIGN KEY (classincompid) REFERENCES public.classincompetition(classincompid),
  CONSTRAINT entry_riderfederationmemberid_fkey FOREIGN KEY (riderfederationmemberid) REFERENCES public.federationmember(federationmemberid)
);

-- 6. Bill and payments
CREATE TABLE IF NOT EXISTS public.bill (
  billid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  paidbypersonid integer NOT NULL,
  amounttopay numeric NOT NULL,
  dateopened timestamp with time zone NOT NULL,
  dateclosed timestamp with time zone,
  CONSTRAINT bill_pkey PRIMARY KEY (billid),
  CONSTRAINT fk_bill_paidbyperson FOREIGN KEY (paidbypersonid) REFERENCES public.person(personid)
);

CREATE TABLE IF NOT EXISTS public.payment (
  paymentid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  billid integer NOT NULL,
  paymentmethodid integer NOT NULL,
  amountpaid numeric NOT NULL,
  paymentdate timestamp with time zone DEFAULT now(),
  transactionreference character varying,
  CONSTRAINT payment_pkey PRIMARY KEY (paymentid),
  CONSTRAINT payment_billid_fkey FOREIGN KEY (billid) REFERENCES public.bill(billid),
  CONSTRAINT payment_paymentmethodid_fkey FOREIGN KEY (paymentmethodid) REFERENCES public.paymentmethod(paymentmethodid)
);

CREATE TABLE IF NOT EXISTS public.billproductrequest (
  billid integer NOT NULL,
  prequestid integer NOT NULL,
  paymentid integer,
  CONSTRAINT billproductrequest_pkey PRIMARY KEY (billid, prequestid),
  CONSTRAINT billproductrequest_billid_fkey FOREIGN KEY (billid) REFERENCES public.bill(billid),
  CONSTRAINT billproductrequest_prequestid_fkey FOREIGN KEY (prequestid) REFERENCES public.productrequest(prequestid)
);

CREATE TABLE IF NOT EXISTS public.paidtimerequest (
  prequestid integer NOT NULL,
  paidtimeslotincompid integer NOT NULL,
  CONSTRAINT paidtimerequest_pkey PRIMARY KEY (prequestid),
  CONSTRAINT paidtimerequest_prequestid_fkey FOREIGN KEY (prequestid) REFERENCES public.productrequest(prequestid)
);

-- 7. Service requests and stalls
CREATE TABLE IF NOT EXISTS public.servicerequest (
  srequestid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  orderedbysystemuserid integer NOT NULL,
  horseid integer NOT NULL,
  riderfederationmemberid integer NOT NULL,
  coachfederationmemberid integer,
  billid integer,
  paymentid integer,
  srequestdatetime timestamp with time zone DEFAULT now(),
  CONSTRAINT servicerequest_pkey PRIMARY KEY (srequestid),
  CONSTRAINT servicerequest_orderedbysystemuserid_fkey FOREIGN KEY (orderedbysystemuserid) REFERENCES public.systemuser(systemuserid),
  CONSTRAINT servicerequest_horseid_fkey FOREIGN KEY (horseid) REFERENCES public.horse(horseid),
  CONSTRAINT servicerequest_riderfederationmemberid_fkey FOREIGN KEY (riderfederationmemberid) REFERENCES public.federationmember(federationmemberid),
  CONSTRAINT servicerequest_coachfederationmemberid_fkey FOREIGN KEY (coachfederationmemberid) REFERENCES public.federationmember(federationmemberid),
  CONSTRAINT servicerequest_billid_fkey FOREIGN KEY (billid) REFERENCES public.bill(billid)
);

CREATE TABLE IF NOT EXISTS public.shavingsorder (
  shavingsorderid integer NOT NULL,
  notes character varying,
  CONSTRAINT shavingsorder_pkey PRIMARY KEY (shavingsorderid),
  CONSTRAINT shavingsorder_shavingsorderid_fkey FOREIGN KEY (shavingsorderid) REFERENCES public.productrequest(prequestid)
);

CREATE TABLE IF NOT EXISTS public.stall (
  ranchid integer NOT NULL,
  compoundid smallint NOT NULL,
  stallid smallint NOT NULL,
  stallnumber character varying NOT NULL,
  stalltype smallint NOT NULL,
  stallnotes character varying,
  CONSTRAINT stall_pkey PRIMARY KEY (ranchid, compoundid, stallid),
  CONSTRAINT fk_stall_stallcompound FOREIGN KEY (ranchid, compoundid) REFERENCES public.stallcompound(ranchid, compoundid),
  CONSTRAINT fk_stall_product FOREIGN KEY (stalltype) REFERENCES public.product(productid)
);

CREATE TABLE IF NOT EXISTS public.stallbooking (
  stallbookingid integer NOT NULL,
  ranchid integer NOT NULL,
  compoundid smallint NOT NULL,
  stallid smallint NOT NULL,
  startdate date NOT NULL,
  enddate date NOT NULL,
  CONSTRAINT stallbooking_pkey PRIMARY KEY (stallbookingid),
  CONSTRAINT stallbooking_stallbookingid_fkey FOREIGN KEY (stallbookingid) REFERENCES public.servicerequest(srequestid),
  CONSTRAINT stallbooking_stall_fkey FOREIGN KEY (ranchid, compoundid, stallid) REFERENCES public.stall(ranchid, compoundid, stallid)
);

CREATE TABLE IF NOT EXISTS public.shavingsorderforstallbooking (
  shavingsorderid integer NOT NULL,
  stallbookingid integer NOT NULL,
  CONSTRAINT shavingsorderforstallbooking_pkey PRIMARY KEY (shavingsorderid, stallbookingid),
  CONSTRAINT shavingsorderforstallbooking_shavingsorderid_fkey FOREIGN KEY (shavingsorderid) REFERENCES public.shavingsorder(shavingsorderid)
);
