-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.arena (
  ranchid integer NOT NULL,
  arenaid smallint NOT NULL,
  arenaname character varying NOT NULL,
  arenalength smallint CHECK (arenalength > 0),
  arenawidth smallint CHECK (arenawidth > 0),
  iscovered boolean,
  CONSTRAINT arena_pkey PRIMARY KEY (ranchid, arenaid),
  CONSTRAINT fk_arena_ranch FOREIGN KEY (ranchid) REFERENCES public.ranch(ranchid)
);
CREATE TABLE public.bill (
  billid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  paidbypersonid integer NOT NULL,
  amounttopay numeric NOT NULL CHECK (amounttopay >= 0::numeric),
  dateopened timestamp with time zone NOT NULL,
  dateclosed timestamp with time zone,
  CONSTRAINT bill_pkey PRIMARY KEY (billid),
  CONSTRAINT fk_bill_paidbyperson FOREIGN KEY (paidbypersonid) REFERENCES public.person(personid)
);
CREATE TABLE public.billproductrequest (
  billid integer NOT NULL,
  prequestid integer NOT NULL,
  paymentid integer,
  amounttopay numeric NOT NULL CHECK (amounttopay >= 0::numeric),
  CONSTRAINT billproductrequest_pkey PRIMARY KEY (billid, prequestid),
  CONSTRAINT billproductrequest_billid_fkey FOREIGN KEY (billid) REFERENCES public.bill(billid),
  CONSTRAINT billproductrequest_prequestid_fkey FOREIGN KEY (prequestid) REFERENCES public.productrequest(prequestid),
  CONSTRAINT fk_billproductrequest_payment FOREIGN KEY (paymentid) REFERENCES public.payment(paymentid)
);
CREATE TABLE public.changeentryrequest (
  changeentryrequestid integer NOT NULL DEFAULT nextval('changeentryrequest_changeentryrequestid_seq'::regclass),
  originalentryid integer NOT NULL,
  newentryid integer,
  requestdatetime timestamp with time zone NOT NULL,
  status character varying NOT NULL DEFAULT 'Pending'::character varying CHECK (status::text = ANY (ARRAY['Pending'::character varying, 'Approved'::character varying, 'Rejected'::character varying]::text[])),
  iscancelled boolean NOT NULL DEFAULT false,
  CONSTRAINT changeentryrequest_pkey PRIMARY KEY (changeentryrequestid),
  CONSTRAINT fk_changeentryrequest_originalentry FOREIGN KEY (originalentryid) REFERENCES public.entry(entryid),
  CONSTRAINT fk_changeentryrequest_newentry FOREIGN KEY (newentryid) REFERENCES public.entry(entryid)
);
CREATE TABLE public.classincompetition (
  classincompid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  competitionid integer NOT NULL,
  classtypeid smallint NOT NULL,
  arenaranchid integer NOT NULL,
  arenaid smallint NOT NULL,
  classdatetime timestamp with time zone,
  organizercost numeric CHECK (organizercost IS NULL OR organizercost >= 0::numeric),
  federationcost numeric CHECK (federationcost IS NULL OR federationcost >= 0::numeric),
  classnotes character varying,
  starttime time without time zone,
  orderinday smallint,
  CONSTRAINT classincompetition_pkey PRIMARY KEY (classincompid),
  CONSTRAINT fk_classincompetition_competition FOREIGN KEY (competitionid) REFERENCES public.competition(competitionid),
  CONSTRAINT fk_classincompetition_classtype FOREIGN KEY (classtypeid) REFERENCES public.classtype(classtypeid),
  CONSTRAINT fk_classincompetition_arena FOREIGN KEY (arenaranchid) REFERENCES public.arena(ranchid),
  CONSTRAINT fk_classincompetition_arena FOREIGN KEY (arenaid) REFERENCES public.arena(ranchid),
  CONSTRAINT fk_classincompetition_arena FOREIGN KEY (arenaranchid) REFERENCES public.arena(arenaid),
  CONSTRAINT fk_classincompetition_arena FOREIGN KEY (arenaid) REFERENCES public.arena(arenaid)
);
CREATE TABLE public.classjudge (
  classincompid integer NOT NULL,
  judgeid integer NOT NULL,
  CONSTRAINT classjudge_pkey PRIMARY KEY (classincompid, judgeid),
  CONSTRAINT fk_classjudge_classincompetition FOREIGN KEY (classincompid) REFERENCES public.classincompetition(classincompid),
  CONSTRAINT fk_classjudge_judge FOREIGN KEY (judgeid) REFERENCES public.judge(judgeid)
);
CREATE TABLE public.classprize (
  classincompid integer NOT NULL,
  prizetypeid smallint NOT NULL,
  prizeamount numeric NOT NULL CHECK (prizeamount IS NULL OR prizeamount >= 0::numeric),
  CONSTRAINT classprize_pkey PRIMARY KEY (classincompid, prizetypeid),
  CONSTRAINT fk_classprize_classincompetition FOREIGN KEY (classincompid) REFERENCES public.classincompetition(classincompid),
  CONSTRAINT fk_classprize_prizetype FOREIGN KEY (prizetypeid) REFERENCES public.prizetype(prizetypeid)
);
CREATE TABLE public.classtype (
  classtypeid smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  fieldid smallint NOT NULL,
  classname character varying NOT NULL,
  judgingsheetformat character varying,
  qualificationdescription character varying,
  CONSTRAINT classtype_pkey PRIMARY KEY (classtypeid),
  CONSTRAINT classtype_fieldid_fkey FOREIGN KEY (fieldid) REFERENCES public.field(fieldid)
);
CREATE TABLE public.competition (
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
  CONSTRAINT fk_competition_field FOREIGN KEY (fieldid) REFERENCES public.field(fieldid),
  CONSTRAINT fk_competition_createdbysystemuser FOREIGN KEY (createdbysystemuserid) REFERENCES public.systemuser(systemuserid)
);
CREATE TABLE public.competitionmessage (
  competitionid integer NOT NULL,
  messageid integer NOT NULL,
  CONSTRAINT competitionmessage_pkey PRIMARY KEY (competitionid, messageid),
  CONSTRAINT fk_competitionmessage_competition FOREIGN KEY (competitionid) REFERENCES public.competition(competitionid),
  CONSTRAINT fk_competitionmessage_message FOREIGN KEY (messageid) REFERENCES public.messageforcompetition(messageid)
);
CREATE TABLE public.emailotp (
  otpid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  email character varying NOT NULL,
  otphash character varying NOT NULL,
  createdat timestamp with time zone NOT NULL DEFAULT now(),
  expiresat timestamp with time zone NOT NULL,
  isused boolean NOT NULL DEFAULT false,
  CONSTRAINT emailotp_pkey PRIMARY KEY (otpid)
);
CREATE TABLE public.entry (
  entryid integer NOT NULL,
  classincompid integer NOT NULL,
  fineid integer,
  prizerecipientname character varying,
  draworder smallint,
  riderfederationmemberid integer,
  CONSTRAINT entry_pkey PRIMARY KEY (entryid),
  CONSTRAINT fk_entry_classincompetition FOREIGN KEY (classincompid) REFERENCES public.classincompetition(classincompid),
  CONSTRAINT entry_riderfederationmemberid_fkey FOREIGN KEY (riderfederationmemberid) REFERENCES public.federationmember(federationmemberid),
  CONSTRAINT fk_entry_servicerequest FOREIGN KEY (entryid) REFERENCES public.servicerequest(srequestid),
  CONSTRAINT fk_entry_fine FOREIGN KEY (fineid) REFERENCES public.fine(fineid)
);
CREATE TABLE public.federationmember (
  federationmemberid integer NOT NULL,
  hasvalidmembership boolean,
  medicalcheckvaliduntil date,
  certificationlevel character varying,
  CONSTRAINT federationmember_pkey PRIMARY KEY (federationmemberid),
  CONSTRAINT fk_federationmember_person FOREIGN KEY (federationmemberid) REFERENCES public.person(personid)
);
CREATE TABLE public.field (
  fieldid smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  fieldname character varying NOT NULL UNIQUE,
  CONSTRAINT field_pkey PRIMARY KEY (fieldid)
);
CREATE TABLE public.fine (
  fineid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  finename character varying NOT NULL,
  finedescription character varying,
  fineamount numeric NOT NULL CHECK (fineamount >= 0::numeric),
  CONSTRAINT fine_pkey PRIMARY KEY (fineid)
);
CREATE TABLE public.horse (
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
CREATE TABLE public.horseowner (
  horseid integer NOT NULL,
  federationmemberid integer NOT NULL,
  CONSTRAINT horseowner_pkey PRIMARY KEY (horseid, federationmemberid),
  CONSTRAINT fk_horseowner_horse FOREIGN KEY (horseid) REFERENCES public.horse(horseid),
  CONSTRAINT fk_horseowner_federationmember FOREIGN KEY (federationmemberid) REFERENCES public.federationmember(federationmemberid)
);
CREATE TABLE public.horseparticipationincompetition (
  horseid integer NOT NULL,
  competitionid integer NOT NULL,
  hcapprovalstatus character varying CHECK (hcapprovalstatus IS NULL OR (hcapprovalstatus::text = ANY (ARRAY['Pending'::character varying, 'Approved'::character varying, 'Rejected'::character varying]::text[]))),
  hcapprovaldate date,
  hcpath character varying,
  hcuploaddate timestamp with time zone,
  hcapproversystemuserid integer,
  CONSTRAINT horseparticipationincompetition_pkey PRIMARY KEY (horseid, competitionid),
  CONSTRAINT horseparticipationincompetition_horseid_fkey FOREIGN KEY (horseid) REFERENCES public.horse(horseid),
  CONSTRAINT horseparticipationincompetition_competitionid_fkey FOREIGN KEY (competitionid) REFERENCES public.competition(competitionid),
  CONSTRAINT horseparticipationincompetition_hcapproversystemuserid_fkey FOREIGN KEY (hcapproversystemuserid) REFERENCES public.systemuser(systemuserid)
);
CREATE TABLE public.judge (
  judgeid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  firstnamehebrew character varying NOT NULL,
  lastnamehebrew character varying NOT NULL,
  firstnameenglish character varying,
  lastnameenglish character varying,
  country character varying,
  CONSTRAINT judge_pkey PRIMARY KEY (judgeid)
);
CREATE TABLE public.judgefield (
  judgeid integer NOT NULL,
  fieldid smallint NOT NULL,
  CONSTRAINT judgefield_pkey PRIMARY KEY (judgeid, fieldid),
  CONSTRAINT judgefield_judgeid_fkey FOREIGN KEY (judgeid) REFERENCES public.judge(judgeid),
  CONSTRAINT judgefield_fieldid_fkey FOREIGN KEY (fieldid) REFERENCES public.field(fieldid)
);
CREATE TABLE public.maneuver (
  maneuverid smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  maneuvername character varying NOT NULL UNIQUE,
  maneuverdescription character varying NOT NULL,
  CONSTRAINT maneuver_pkey PRIMARY KEY (maneuverid)
);
CREATE TABLE public.messageforcompetition (
  messageid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  messagecontent character varying NOT NULL,
  senddate timestamp with time zone,
  createddatetime timestamp with time zone NOT NULL,
  status character varying,
  CONSTRAINT messageforcompetition_pkey PRIMARY KEY (messageid)
);
CREATE TABLE public.newranchrequest (
  requestid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  ranchid integer,
  submittedbysystemuserid integer,
  requestdate timestamp with time zone NOT NULL DEFAULT now(),
  requeststatus character varying NOT NULL DEFAULT 'Pending'::character varying,
  resolvedbysuperuserid integer,
  resolveddate timestamp with time zone,
  CONSTRAINT newranchrequest_pkey PRIMARY KEY (requestid),
  CONSTRAINT fk_newranchrequest_systemuser FOREIGN KEY (submittedbysystemuserid) REFERENCES public.systemuser(systemuserid),
  CONSTRAINT fk_newranchrequest_superuser FOREIGN KEY (resolvedbysuperuserid) REFERENCES public.superuser(superuserid)
);
CREATE TABLE public.notification (
  notificationid integer NOT NULL DEFAULT nextval('notification_notificationid_seq'::regclass),
  notificationtypeid integer NOT NULL,
  notificationcontent character varying NOT NULL,
  senddate timestamp with time zone,
  createddatetime timestamp with time zone NOT NULL,
  status character varying,
  CONSTRAINT notification_pkey PRIMARY KEY (notificationid),
  CONSTRAINT fk_notification_notificationtype FOREIGN KEY (notificationtypeid) REFERENCES public.notificationtype(notificationtypeid)
);
CREATE TABLE public.notificationtype (
  notificationtypeid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  notificationtypename character varying NOT NULL,
  notificationtypedescription character varying,
  CONSTRAINT notificationtype_pkey PRIMARY KEY (notificationtypeid)
);
CREATE TABLE public.paidtimeproduct (
  productid smallint NOT NULL,
  durationminutes integer NOT NULL CHECK (durationminutes > 0),
  CONSTRAINT paidtimeproduct_pkey PRIMARY KEY (productid),
  CONSTRAINT paidtimeproduct_productid_fkey FOREIGN KEY (productid) REFERENCES public.product(productid)
);
CREATE TABLE public.paidtimerequest (
  paidtimerequestid integer NOT NULL,
  pricecatalogid integer NOT NULL,
  requestedcompslotid integer NOT NULL,
  assignedcompslotid integer,
  assignedstarttime timestamp with time zone,
  status character varying NOT NULL CHECK (status::text = ANY (ARRAY['Pending'::character varying, 'Assigned'::character varying, 'Cancelled'::character varying]::text[])),
  notes character varying,
  CONSTRAINT paidtimerequest_pkey PRIMARY KEY (paidtimerequestid),
  CONSTRAINT fk_paidtimerequest_servicerequest FOREIGN KEY (paidtimerequestid) REFERENCES public.servicerequest(srequestid),
  CONSTRAINT fk_paidtimerequest_pricecatalog FOREIGN KEY (pricecatalogid) REFERENCES public.pricecatalog(pricecatalogid),
  CONSTRAINT fk_paidtimerequest_requestedslot FOREIGN KEY (requestedcompslotid) REFERENCES public.paidtimeslotincompetition(paidtimeslotincompid),
  CONSTRAINT fk_paidtimerequest_assignedslot FOREIGN KEY (assignedcompslotid) REFERENCES public.paidtimeslotincompetition(paidtimeslotincompid)
);
CREATE TABLE public.paidtimeslot (
  paidtimeslotid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  dayofweek character varying NOT NULL,
  timeofday character varying NOT NULL,
  CONSTRAINT paidtimeslot_pkey PRIMARY KEY (paidtimeslotid)
);
CREATE TABLE public.paidtimeslotincompetition (
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
  CONSTRAINT fk_paidtimeslotincomp_comp FOREIGN KEY (competitionid) REFERENCES public.competition(competitionid),
  CONSTRAINT fk_paidtimeslotincompetition_paidtimeslot FOREIGN KEY (paidtimeslotid) REFERENCES public.paidtimeslot(paidtimeslotid),
  CONSTRAINT fk_paidtimeslotincompetition_arena FOREIGN KEY (arenaranchid) REFERENCES public.arena(ranchid),
  CONSTRAINT fk_paidtimeslotincompetition_arena FOREIGN KEY (arenaid) REFERENCES public.arena(ranchid),
  CONSTRAINT fk_paidtimeslotincompetition_arena FOREIGN KEY (arenaranchid) REFERENCES public.arena(arenaid),
  CONSTRAINT fk_paidtimeslotincompetition_arena FOREIGN KEY (arenaid) REFERENCES public.arena(arenaid)
);
CREATE TABLE public.passwordresettoken (
  tokenid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  systemuserid integer NOT NULL,
  tokenhash character varying NOT NULL,
  createdat timestamp with time zone NOT NULL DEFAULT now(),
  expiresat timestamp with time zone NOT NULL,
  isused boolean NOT NULL DEFAULT false,
  CONSTRAINT passwordresettoken_pkey PRIMARY KEY (tokenid),
  CONSTRAINT fk_passwordresettoken_systemuser FOREIGN KEY (systemuserid) REFERENCES public.systemuser(systemuserid)
);
CREATE TABLE public.pattern (
  patternnumber smallint NOT NULL,
  CONSTRAINT pattern_pkey PRIMARY KEY (patternnumber)
);
CREATE TABLE public.patternmaneuver (
  patternnumber smallint NOT NULL,
  maneuverid smallint,
  maneuverorder smallint NOT NULL CHECK (maneuverorder > 0),
  CONSTRAINT patternmaneuver_pkey PRIMARY KEY (patternnumber, maneuverorder),
  CONSTRAINT patternmaneuver_patternnumber_fkey FOREIGN KEY (patternnumber) REFERENCES public.pattern(patternnumber),
  CONSTRAINT patternmaneuver_maneuverid_fkey FOREIGN KEY (maneuverid) REFERENCES public.maneuver(maneuverid)
);
CREATE TABLE public.payment (
  paymentid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  billid integer NOT NULL,
  paymentmethodid integer NOT NULL,
  amountpaid numeric NOT NULL CHECK (amountpaid > 0::numeric),
  paymentdate timestamp with time zone NOT NULL DEFAULT now(),
  transactionreference character varying,
  enteredbysystemuserid integer,
  CONSTRAINT payment_pkey PRIMARY KEY (paymentid),
  CONSTRAINT payment_billid_fkey FOREIGN KEY (billid) REFERENCES public.bill(billid),
  CONSTRAINT payment_paymentmethodid_fkey FOREIGN KEY (paymentmethodid) REFERENCES public.paymentmethod(paymentmethodid),
  CONSTRAINT fk_payment_enteredbysystemuser FOREIGN KEY (enteredbysystemuserid) REFERENCES public.systemuser(systemuserid)
);
CREATE TABLE public.paymentmethod (
  paymentmethodid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  paymentmethodtype character varying NOT NULL UNIQUE,
  CONSTRAINT paymentmethod_pkey PRIMARY KEY (paymentmethodid)
);
CREATE TABLE public.person (
  personid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nationalid character varying NOT NULL UNIQUE CHECK (nationalid::text ~ '^[0-9]{9}$'::text),
  firstname character varying NOT NULL,
  lastname character varying NOT NULL,
  gender character varying,
  dateofbirth date,
  cellphone character varying CHECK (cellphone IS NULL OR length(cellphone::text) >= 9 AND length(cellphone::text) <= 20 AND cellphone::text ~ '^[0-9+ \-]+$'::text),
  email character varying CHECK (email IS NULL OR email::text ~ '^.+@.+\..+'::text),
  CONSTRAINT person_pkey PRIMARY KEY (personid)
);
CREATE TABLE public.personmanagedbysystemuser (
  systemuserid integer NOT NULL,
  personid integer NOT NULL,
  requestdate timestamp with time zone NOT NULL DEFAULT now(),
  updatedate timestamp with time zone,
  approvalstatus character varying NOT NULL DEFAULT 'Pending'::character varying CHECK (approvalstatus::text = ANY (ARRAY['Pending'::character varying, 'Approved'::character varying, 'Rejected'::character varying]::text[])),
  CONSTRAINT personmanagedbysystemuser_pkey PRIMARY KEY (systemuserid, personid),
  CONSTRAINT fk_personmanagedbysystemuser_systemuser FOREIGN KEY (systemuserid) REFERENCES public.systemuser(systemuserid),
  CONSTRAINT fk_personmanagedbysystemuser_person FOREIGN KEY (personid) REFERENCES public.person(personid)
);
CREATE TABLE public.personranch (
  personid integer NOT NULL,
  ranchid integer NOT NULL,
  CONSTRAINT personranch_pkey PRIMARY KEY (personid, ranchid),
  CONSTRAINT fk_personranch_person FOREIGN KEY (personid) REFERENCES public.person(personid),
  CONSTRAINT fk_personranch_ranch FOREIGN KEY (ranchid) REFERENCES public.ranch(ranchid)
);
CREATE TABLE public.personranchrole (
  personid integer NOT NULL,
  ranchid integer NOT NULL,
  roleid smallint NOT NULL,
  rolestatus character varying NOT NULL DEFAULT 'Pending'::character varying CHECK (rolestatus::text = ANY (ARRAY['Pending'::character varying, 'Approved'::character varying, 'Rejected'::character varying]::text[])),
  CONSTRAINT personranchrole_pkey PRIMARY KEY (personid, ranchid, roleid),
  CONSTRAINT fk_personranchrole_affiliation FOREIGN KEY (personid) REFERENCES public.personranch(personid),
  CONSTRAINT fk_personranchrole_affiliation FOREIGN KEY (ranchid) REFERENCES public.personranch(personid),
  CONSTRAINT fk_personranchrole_affiliation FOREIGN KEY (personid) REFERENCES public.personranch(ranchid),
  CONSTRAINT fk_personranchrole_affiliation FOREIGN KEY (ranchid) REFERENCES public.personranch(ranchid),
  CONSTRAINT fk_personranchrole_role FOREIGN KEY (roleid) REFERENCES public.role(roleid)
);
CREATE TABLE public.pricecatalog (
  pricecatalogid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  productid smallint NOT NULL,
  ranchid integer NOT NULL,
  creationdate timestamp with time zone NOT NULL,
  itemprice numeric NOT NULL CHECK (itemprice >= 0::numeric),
  isactive boolean DEFAULT true,
  CONSTRAINT pricecatalog_pkey PRIMARY KEY (pricecatalogid),
  CONSTRAINT fk_pricecatalog_product FOREIGN KEY (productid) REFERENCES public.product(productid),
  CONSTRAINT fk_pricecatalog_ranch FOREIGN KEY (ranchid) REFERENCES public.ranch(ranchid)
);
CREATE TABLE public.prizetype (
  prizetypeid smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  prizetypename character varying NOT NULL UNIQUE,
  prizedescription character varying,
  CONSTRAINT prizetype_pkey PRIMARY KEY (prizetypeid)
);
CREATE TABLE public.product (
  productid smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  categoryid smallint NOT NULL,
  productname character varying NOT NULL UNIQUE,
  CONSTRAINT product_pkey PRIMARY KEY (productid),
  CONSTRAINT fk_product_productcategory FOREIGN KEY (categoryid) REFERENCES public.productcategory(categoryid)
);
CREATE TABLE public.productcategory (
  categoryid smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  categoryname character varying NOT NULL UNIQUE,
  CONSTRAINT productcategory_pkey PRIMARY KEY (categoryid)
);
CREATE TABLE public.productchangerequest (
  productchangerequestid integer NOT NULL DEFAULT nextval('productchangerequest_productchangerequestid_seq'::regclass),
  originalprequestid integer NOT NULL UNIQUE,
  newprequestid integer,
  answeredbysystemuserid integer,
  status character varying,
  requestdate timestamp with time zone NOT NULL,
  iscancelled boolean NOT NULL DEFAULT false,
  CONSTRAINT productchangerequest_pkey PRIMARY KEY (productchangerequestid),
  CONSTRAINT fk_productchangerequest_original FOREIGN KEY (originalprequestid) REFERENCES public.productrequest(prequestid),
  CONSTRAINT fk_productchangerequest_new FOREIGN KEY (newprequestid) REFERENCES public.productrequest(prequestid),
  CONSTRAINT fk_productchangerequest_answeredbysystemuser FOREIGN KEY (answeredbysystemuserid) REFERENCES public.systemuser(systemuserid)
);
CREATE TABLE public.productrequest (
  prequestid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  competitionid integer NOT NULL,
  prequestdatetime timestamp with time zone NOT NULL DEFAULT now(),
  orderedbysystemuserid integer NOT NULL,
  pricecatalogid integer NOT NULL,
  notes text,
  approvaldate timestamp without time zone,
  CONSTRAINT productrequest_pkey PRIMARY KEY (prequestid),
  CONSTRAINT productrequest_competitionid_fkey FOREIGN KEY (competitionid) REFERENCES public.competition(competitionid),
  CONSTRAINT fk_productrequest_pricecatalog FOREIGN KEY (pricecatalogid) REFERENCES public.pricecatalog(pricecatalogid),
  CONSTRAINT productrequest_orderedbysystemuserid_fkey FOREIGN KEY (orderedbysystemuserid) REFERENCES public.systemuser(systemuserid)
);
CREATE TABLE public.ranch (
  ranchid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  ranchname character varying NOT NULL UNIQUE,
  contactemail character varying CHECK (contactemail IS NULL OR contactemail::text ~ '^.+@.+\..+'::text),
  contactphone character varying CHECK (contactphone IS NULL OR length(contactphone::text) >= 9 AND length(contactphone::text) <= 20 AND contactphone::text ~ '^[0-9+ \-]+$'::text),
  websiteurl character varying,
  location USER-DEFINED,
  ranchstatus character varying NOT NULL DEFAULT 'Pending'::character varying,
  latitude double precision,
  longitude double precision,
  CONSTRAINT ranch_pkey PRIMARY KEY (ranchid)
);
CREATE TABLE public.reiningtype (
  reiningclassincompid integer NOT NULL,
  patternnumber smallint NOT NULL,
  CONSTRAINT reiningtype_pkey PRIMARY KEY (reiningclassincompid),
  CONSTRAINT fk_reiningtype_class FOREIGN KEY (reiningclassincompid) REFERENCES public.classincompetition(classincompid),
  CONSTRAINT fk_reiningtype_pattern FOREIGN KEY (patternnumber) REFERENCES public.pattern(patternnumber)
);
CREATE TABLE public.role (
  roleid smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  rolename character varying NOT NULL UNIQUE,
  CONSTRAINT role_pkey PRIMARY KEY (roleid)
);
CREATE TABLE public.servicerequest (
  srequestid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  orderedbysystemuserid integer NOT NULL,
  horseid integer NOT NULL,
  riderfederationmemberid integer NOT NULL,
  coachfederationmemberid integer,
  billid integer NOT NULL,
  paymentid integer,
  srequestdatetime timestamp with time zone DEFAULT now(),
  CONSTRAINT servicerequest_pkey PRIMARY KEY (srequestid),
  CONSTRAINT servicerequest_orderedbysystemuserid_fkey FOREIGN KEY (orderedbysystemuserid) REFERENCES public.systemuser(systemuserid),
  CONSTRAINT servicerequest_horseid_fkey FOREIGN KEY (horseid) REFERENCES public.horse(horseid),
  CONSTRAINT servicerequest_riderfederationmemberid_fkey FOREIGN KEY (riderfederationmemberid) REFERENCES public.federationmember(federationmemberid),
  CONSTRAINT servicerequest_coachfederationmemberid_fkey FOREIGN KEY (coachfederationmemberid) REFERENCES public.federationmember(federationmemberid),
  CONSTRAINT servicerequest_billid_fkey FOREIGN KEY (billid) REFERENCES public.bill(billid),
  CONSTRAINT fk_servicerequest_payment FOREIGN KEY (paymentid) REFERENCES public.payment(paymentid)
);
CREATE TABLE public.shavingsorder (
  shavingsorderid integer NOT NULL,
  notes character varying,
  workersystemuserid integer,
  bagquantity smallint CHECK (bagquantity > 0),
  requesteddeliverytime timestamp without time zone,
  arrivaltime timestamp without time zone,
  responsetime timestamp without time zone,
  deliverystatus character varying NOT NULL DEFAULT 'Pending'::character varying,
  deliveryphotourl text,
  deliveryphotodate timestamp with time zone,
  approvedbypersonid integer,
  approvedat timestamp with time zone,
  CONSTRAINT shavingsorder_pkey PRIMARY KEY (shavingsorderid),
  CONSTRAINT shavingsorder_shavingsorderid_fkey FOREIGN KEY (shavingsorderid) REFERENCES public.productrequest(prequestid),
  CONSTRAINT shavingsorder_approvedbypersonid_fkey FOREIGN KEY (approvedbypersonid) REFERENCES public.person(personid)
);
CREATE TABLE public.shavingsorderforstallbooking (
  shavingsorderid integer NOT NULL,
  stallbookingid integer NOT NULL,
  bagquantityperstall smallint NOT NULL DEFAULT 1 CHECK (bagquantityperstall > 0),
  CONSTRAINT shavingsorderforstallbooking_pkey PRIMARY KEY (shavingsorderid, stallbookingid),
  CONSTRAINT shavingsorderforstallbooking_shavingsorderid_fkey FOREIGN KEY (shavingsorderid) REFERENCES public.shavingsorder(shavingsorderid),
  CONSTRAINT fk_shavingsorderforstallbooking_stallbooking FOREIGN KEY (stallbookingid) REFERENCES public.stallbooking(stallbookingid)
);
CREATE TABLE public.spatial_ref_sys (
  srid integer NOT NULL CHECK (srid > 0 AND srid <= 998999),
  auth_name character varying,
  auth_srid integer,
  srtext character varying,
  proj4text character varying,
  CONSTRAINT spatial_ref_sys_pkey PRIMARY KEY (srid)
);
CREATE TABLE public.stall (
  ranchid integer NOT NULL,
  compoundid smallint NOT NULL,
  stallid smallint NOT NULL,
  stallnumber character varying NOT NULL,
  stalltype smallint NOT NULL,
  stallnotes character varying,
  CONSTRAINT stall_pkey PRIMARY KEY (ranchid, compoundid, stallid),
  CONSTRAINT fk_stall_product FOREIGN KEY (stalltype) REFERENCES public.product(productid)
);
CREATE TABLE public.stallassignment (
  assignmentid integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  competitionid integer NOT NULL,
  ranchid integer NOT NULL,
  compoundid smallint NOT NULL,
  stallid smallint NOT NULL,
  horseid integer NOT NULL,
  CONSTRAINT stallassignment_pkey PRIMARY KEY (assignmentid),
  CONSTRAINT stallassignment_competitionid_fkey FOREIGN KEY (competitionid) REFERENCES public.competition(competitionid),
  CONSTRAINT stallassignment_horseid_fkey FOREIGN KEY (horseid) REFERENCES public.horse(horseid),
  CONSTRAINT stallassignment_ranchid_compoundid_stallid_fkey FOREIGN KEY (ranchid) REFERENCES public.stall(ranchid),
  CONSTRAINT stallassignment_ranchid_compoundid_stallid_fkey FOREIGN KEY (compoundid) REFERENCES public.stall(ranchid),
  CONSTRAINT stallassignment_ranchid_compoundid_stallid_fkey FOREIGN KEY (stallid) REFERENCES public.stall(ranchid),
  CONSTRAINT stallassignment_ranchid_compoundid_stallid_fkey FOREIGN KEY (ranchid) REFERENCES public.stall(compoundid),
  CONSTRAINT stallassignment_ranchid_compoundid_stallid_fkey FOREIGN KEY (compoundid) REFERENCES public.stall(compoundid),
  CONSTRAINT stallassignment_ranchid_compoundid_stallid_fkey FOREIGN KEY (stallid) REFERENCES public.stall(compoundid),
  CONSTRAINT stallassignment_ranchid_compoundid_stallid_fkey FOREIGN KEY (ranchid) REFERENCES public.stall(stallid),
  CONSTRAINT stallassignment_ranchid_compoundid_stallid_fkey FOREIGN KEY (compoundid) REFERENCES public.stall(stallid),
  CONSTRAINT stallassignment_ranchid_compoundid_stallid_fkey FOREIGN KEY (stallid) REFERENCES public.stall(stallid)
);
CREATE TABLE public.stallbooking (
  stallbookingid integer NOT NULL,
  ranchid integer NOT NULL,
  compoundid smallint,
  stallid smallint,
  startdate date NOT NULL,
  enddate date NOT NULL,
  horseid integer,
  isfortack boolean NOT NULL DEFAULT false,
  CONSTRAINT stallbooking_pkey PRIMARY KEY (stallbookingid),
  CONSTRAINT stallbooking_ranchid_compoundid_stallid_fkey FOREIGN KEY (ranchid) REFERENCES public.stall(ranchid),
  CONSTRAINT stallbooking_ranchid_compoundid_stallid_fkey FOREIGN KEY (compoundid) REFERENCES public.stall(ranchid),
  CONSTRAINT stallbooking_ranchid_compoundid_stallid_fkey FOREIGN KEY (stallid) REFERENCES public.stall(ranchid),
  CONSTRAINT stallbooking_ranchid_compoundid_stallid_fkey FOREIGN KEY (ranchid) REFERENCES public.stall(compoundid),
  CONSTRAINT stallbooking_ranchid_compoundid_stallid_fkey FOREIGN KEY (compoundid) REFERENCES public.stall(compoundid),
  CONSTRAINT stallbooking_ranchid_compoundid_stallid_fkey FOREIGN KEY (stallid) REFERENCES public.stall(compoundid),
  CONSTRAINT stallbooking_ranchid_compoundid_stallid_fkey FOREIGN KEY (ranchid) REFERENCES public.stall(stallid),
  CONSTRAINT stallbooking_ranchid_compoundid_stallid_fkey FOREIGN KEY (compoundid) REFERENCES public.stall(stallid),
  CONSTRAINT stallbooking_ranchid_compoundid_stallid_fkey FOREIGN KEY (stallid) REFERENCES public.stall(stallid),
  CONSTRAINT fk_stallbooking_horse FOREIGN KEY (horseid) REFERENCES public.horse(horseid),
  CONSTRAINT stallbooking_stallbookingid_fkey FOREIGN KEY (stallbookingid) REFERENCES public.productrequest(prequestid)
);
CREATE TABLE public.stallcompound (
  ranchid integer NOT NULL,
  compoundid smallint NOT NULL,
  compoundname character varying NOT NULL,
  layout jsonb,
  CONSTRAINT stallcompound_pkey PRIMARY KEY (ranchid, compoundid),
  CONSTRAINT fk_stallcompound_ranch FOREIGN KEY (ranchid) REFERENCES public.ranch(ranchid)
);
CREATE TABLE public.superuser (
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
CREATE TABLE public.systemuser (
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