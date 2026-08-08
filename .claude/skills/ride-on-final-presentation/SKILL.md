---
name: ride-on-final-presentation
description: "Use this skill whenever working on the RideOn final course presentation (מצגת הסיכום). Triggers for: drafting slide content, speaker scripts, or Gemini/Google Slides prompts for the presentation; reviewing or reordering the slide outline; answering questions about what goes on each slide. This skill is the single source of truth for all project facts, so do NOT re-ask the user for project background and do NOT load the heavy QA or DB skills for this task."
---

# RIDE ON — Final Presentation Builder

## Role of this chat
Slides are built in Google Slides by Gemini, NOT here. For every slide requested, output exactly three blocks, in this order:

1. **BACKGROUND** — the factual information that stands behind the slide. Full detail, for team mastery and Q&A prep. Hebrew.
2. **SCRIPT** — the spoken content for the slide. Natural spoken Hebrew, first person plural, 30 to 60 seconds, no jargon dumps.
3. **GEMINI PROMPT** — a concise, copy-pasteable visual spec for the AI connected to Google Slides. English instructions; all on-slide text given verbatim in Hebrew inside quotes. Always include: layout description, exact texts, and the design tokens below. Keep it short (under ~120 words). One prompt per slide.

Work slide by slide unless asked for the full deck. After each slide, wait for approval before the next.

## Language and style rules
- On-slide text: Hebrew, minimal words, no full sentences where a phrase works.
- Never use long dashes or arrows anywhere.
- Address Oren with feminine Hebrew forms in conversation.
- Numbers as digits (965, 0.766, 27).
- RTL: remind Gemini that Hebrew text is right to left and right aligned.

## Design tokens (from the existing deck, keep consistent)
- Palette: warm western browns (dark brown headers/side panels, tan/light beige content background, white cards).
- Font: Arial. Titles large and bold.
- RideOn logo (square PNG, transparent background, brown horse head over a V) on every slide, small, top corner. Oren has the file RideOn_logo.png.
- Title slide: large arena/horse photo left, logo card right, subtitle "ניהול ותפעול חכם לתחרויות סוסים", names "עמית הופמן | אורן אהוביה | דניאל קנטי".
- Closing tagline: "RideOn - The Future of Equestrian Events".

## Required course sections (must all be covered)
1. Opening slide (presenters + project name)
2. Project description: motivation, client, goal
3. General description of the information system built this year
4. Data description: source and volume
5. Data cleaning and grooming performed
6. Algorithms used / the smart element
7. Algorithm performance
8. Conclusions
Plus: the smart element code is submitted separately to the submission box (notebook 01_data_prep.ipynb).

## Baseline slide outline (adjust with Oren)
S1 Title | S2 Client and motivation (Double K, old process, problems) | S3 System overview (web + mobile, 4 user types) | S4 Smart element intro and business value | S5 Data source and volume | S6 Historical data ingestion (ETL highlights) | S7 Feature engineering (5 dimensions, month OHE story) | S8 Multicollinearity decisions | S9 Model and methodology | S10 Performance (metrics + plots) | S11 Conclusions and deployment | S12 Thank you.

## KNOWLEDGE BASE (single source of truth — do not contradict)

### Team and client
- Team: עמית הופמן, אורן אהוביה, דניאל קנטי. Final project (פרויקט גמר).
- Client: חוות דאבל קיי (Double K Ranch), the central ranch hosting western riding competitions in Israel; ~27 competitions/year under the national riding sport federation. Daniel's family runs the ranch.
- Activity: competitions in ריינינג, אולארונד, קאטינג, אקסטרים, דרסאז' וקפיצות. Audience: hundreds of riders and trainers nationwide. Services: registration, competition production, class management, logistics (paid time, stalls, shavings), payment collection.
- Old process: secretary built each competition with 3 tools (Excel, Word, PDF); Google Forms for paid time; each farm admin filled a manual Excel of riders/horses/classes; WhatsApp chains for changes; manual stall assignment in Excel. Every question = a phone call; every change = mail/WhatsApp chain; unnoticed errors could cancel a competitor's class entry. Result: chaos, billing errors, crazy hours, heavy stress.
- Needs defined: one central system (financial + logistic), digitized supply orders, automation (smart assignments, real time reports), better UX.
- Mission: help the secretary and the whole Israeli western riding competition branch.

### The system
- Web app (secretary): create/edit competitions; full view per competition of classes, registrations, statistics with deep dives; manage paid time, stalls and shavings at competition, field and single registration levels; full financial review down to customer and service.
- Mobile app, three users: Admin (main user; registers all his farm's riders and horses to classes and services, one click changes, reviews clients' upcoming and historical charges); Payer (registers, updates, tracks charges and payments); Employee (delivers shaving orders, tracks open/closed orders, marks delivery, receives push notifications from the secretary).
- Tech: React + Vite frontend, ASP.NET Core backend, Supabase PostgreSQL.
- Smart element evolution: the original deck listed 5 candidate smart elements (smart registration fill, paid time assignment, vet certificate checking, judge sheet auto fill, run order assignment). Final: entry count prediction is THE course smart element; smart registration fill became the product recommendation component (UC3), specced separately. Good evolution story.

### Smart element: purpose and business value
Predicts entrycount (active entries) per class in a competition.
- Operational value: schedule planning and avoiding overruns; earlier start times and estimated class start times; pricing arena drag time in Reining (flatten every 5 to 7 entries); planning worker and judge shifts (judges usually flown from abroad), derived from competition length.
- Financial value: income forecast from entry fees (ranch + federation); derivation chain entries → horses (per horse class limit) → stalls → shavings quantity to order; yearly income projections, most profitable classes/fields/periods, expansion opportunities.
- Two uses implemented now: operational planning and income forecast; the rest are next phase.

### Data
- Source: the system's Supabase (PostgreSQL) DB. One embedded resources query joining competition, classincompetition, classtype, field, ranch, entry, classprize, prizetype.
- Filter: only competitions with status "הסתיימה". Long format (one row per class per prize type) then pivoted to one row per class.
- Volume: 965 unique classes, ~9,400 active entries, 4 disciplines (Reining, Cutting, All Around, Extreme), seasons 2024 to 2025. Split 675 train / 290 test (70/30).
- Origin: real historical competition summaries (Excel + PDF) ingested via a dedicated ETL skill.

### ETL highlights (historical insert)
- Auto detection of 4 file formats: A cost based, B federation prize summary (paired to A by sheet order), C mixed Extreme/Cutting sheets, D All Around Excel + PDF invitations.
- Class name normalization (strip prefixes), noise row skip rules, day boundaries by paid time markers or by Excel row background color (openpyxl).
- Fuzzy matching of class names to DB via difflib (exact / fuzzy / new) with a confirmation report before insertion.
- Prizes parsed from free text Excel annotations by regex, and from PDFs where Hebrew text extracts reversed (patterns reversed, e.g. searching "טופק'ג").
- Two phase idempotent insertion in FK safe order; synthetic full entry records fabricated (person, federation member, horse, system user, bill, service request, entry) since source files held only entry counts.

### Feature engineering
- Flatten JSON; entrycount = count of Active entries; totalcost with nulls to 0.
- Aggregates on unique classes only (avoid prize row inflation): classes_per_competition, field_avg_past_entries, classname_avg_past_entries.
- Prize pivot to one row per class; binary flags for שובר / ג'קפוט / כסף מוסף; fillna(0) fix saved 717 rows.
- 5 dimension structured encoding of class names (replaced a rejected flat keyword approach): horse level, rider age, federation, rider level, sub type. Edge cases: bare ages via \b1[0-9]\b; "לא מוגבל"/"Unrestricted" = Open and excluded from Limited; Green Horse = horse novice while ירוקי = rider level; Hebrew word boundary limits; wildcard ג.קפוט.
- Seasonality: initial season tiers rejected after an SQL validation against real data (noisy, war disrupted); chose month One Hot Encoding instead.
- Multicollinearity: dropped baselines (horse_none, rider_all_ages, fed_IEF, no_prize); dropped weather (redundant with months, cost 70 rows); dropped field dummies for field_avg_past_entries; kept 3 high VIF features with business justification (field_avg_past_entries ~28, classes_per_competition ~26, classname_avg_past_entries ~10).

### Model and performance
- Multiple Linear Regression; 5 step course methodology (Imports, EDA, Manipulation, Algorithm, Validation).
- 70/30 split (random_state 42); StandardScaler fit on train only; 46 features.
- Metrics (held out test): R2 = 0.766, RMSE = 3.09, MAE = 2.18, MSE = 9.52.
- Plots: entrycount distribution, residuals vs predicted, actual vs predicted. Outputs: vif_results.csv, model_summary.csv, df_model.csv.
- Comparison point: an earlier run showed R2 0.803 but on a biased 895 row sample; final model is more accurate per prediction (MAE 2.31 → 2.18) on all 965 rows.
- Workflow: Jupyter notebook; Claude for analysis and prompt drafting, Claude Code executing notebook edits, skills as ground truth.

### Conclusions (draft — final wording to be set with Oren)
- History wins: classname_avg_past_entries is the strongest predictor (coef ~+5.9).
- More classes per competition splits entries (coef ~-0.8).
- Prizes help mildly (added money ~+0.45).
- Validating business assumptions against real data changed design decisions and improved the model.
- Deployment: joblib export of model + scaler; real time feature engineering prediction function; decided in QA that the app calls the model directly with a caching table (income forecast feature); Supabase Edge Function documented as alternative.
- Future: per field models after collecting more data next year.

## Missing pieces checklist (verify before finalizing the deck)
- [ ] Notebook plot images exported to files (entrycount distribution, residuals, actual vs predicted).
- [ ] Final conclusions wording: 3 to 5 sentences combining statistical insight with business value.
- [ ] Current system screenshots (old deck's UML/screens are outdated; do not reuse).
- [ ] Optional: exact volume numbers (competitions, entries) via a live DB query.
