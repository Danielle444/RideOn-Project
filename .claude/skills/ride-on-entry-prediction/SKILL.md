---
name: ride-on-entry-prediction
description: >
  Use this skill ONLY when working specifically on predicting or forecasting the
  number of entries per class in a RIDE ON competition. Triggers for: building or
  running the entry-count regression model, extracting and grooming class entry data
  from Supabase for this specific prediction pipeline, engineering features for
  competition class entry prediction, adding weather data to the entry prediction
  dataset, or evaluating the entry-count regression model. Do NOT trigger for other
  RIDE ON analytics that are unrelated to entry count prediction.
---

# RIDE ON — Entry Count Prediction Pipeline

> **GROUND TRUTH CORRECTION (July 2026):** The final trained model deviates from the feature template below. Actual model: 44 features, NO weather features, three aggregate features instead (classes_per_competition, field_avg_past_entries, classname_avg_past_entries), baseline dummies dropped per mutually exclusive group, month one hot for months 4,5,6,8,9,10,11,12 only. The authoritative sources are `Smart_Element/01_data_prep.ipynb` and `models/entry_prediction_model_v1.json` in the repo — always prefer them over the feature tables in this skill. Metrics: R2 0.766, RMSE 3.086, MAE 2.180 (n=965). The model is integrated into the backend; see the Smart Element section of ride-on-system-knowledge.

## Project Context

**Goal**: Predict the number of entries per class in a competition.
**Target variable**: `entrycount` (count of active entries per `classincompetition` row)
**Method**: Multiple Linear Regression (following course methodology)
**Database**: Supabase (PostgreSQL) — project URL: `https://sxplumrexbolpwqacpiz.supabase.co`
**Credentials**: Store as environment variables in `.env` (never hardcode in code):
  - `SUPABASE_URL=https://sxplumrexbolpwqacpiz.supabase.co`
  - `SUPABASE_KEY=<publishable key>`

---

## Course Methodology (follow this order)

The course defines a strict 5-step workflow. Always structure notebooks and scripts this way:

```
1. Imports
2. Exploration  (EDA + visualizations with titles and axis labels)
3. Manipulation (feature engineering, encoding, cleaning)
4. Algorithm    (train/test split → scale → fit)
5. Validation   (MAE, MSE, RMSE, R²)
```

**Visualization rules from course**:
- Every plot must have a title, x-axis label, and y-axis label
- Use `sns.set_style('darkgrid')` globally
- Figures must be large enough to read (`figsize=(10,5)` or larger)
- Use `seaborn` for EDA, `matplotlib` for custom plots

---

## Step 1 — Imports

```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import warnings
warnings.filterwarnings('ignore')

from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from sklearn import metrics

from dotenv import load_dotenv
import os
load_dotenv()

sns.set_style('darkgrid')
np.random.seed(42)
plt.rcParams['figure.figsize'] = (10, 5)

print("✅ All libraries loaded successfully")
```

---

## Step 2 — Data Extraction (Supabase)

Use the supabase-py client. Install: `pip install supabase python-dotenv`

```python
from supabase import create_client

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
```

Run this SQL query via SQLAlchemy or psycopg2 (preferred for pandas):

```sql
-- Step 1: compute entrycount per class first to avoid double-counting
WITH class_entries AS (
    SELECT
        cic.classincompid,
        cic.competitionid,
        cic.classdatetime,
        cic.orderinday,
        COALESCE(cic.organizercost, 0) + COALESCE(cic.federationcost, 0) AS totalcost,
        ct.classname,
        ct.classtypeid,
        f.fieldname,
        c.competitionname,
        r.ranchname,
        r.latitude,
        r.longitude,
        COUNT(CASE WHEN e.entrystatus = 'Active' THEN 1 END) AS entrycount
    FROM classincompetition cic
    JOIN classtype   ct ON ct.classtypeid  = cic.classtypeid
    JOIN field       f  ON f.fieldid       = ct.fieldid
    JOIN competition c  ON c.competitionid = cic.competitionid
    JOIN ranch       r  ON r.ranchid       = c.hostranchid
    LEFT JOIN entry  e  ON e.classincompid = cic.classincompid
    WHERE c.competitionstatus = 'הסתיימה'
    GROUP BY
        cic.classincompid, cic.competitionid, cic.classdatetime, cic.orderinday,
        cic.organizercost, cic.federationcost,
        ct.classname, ct.classtypeid, f.fieldname,
        c.competitionname, r.ranchname, r.latitude, r.longitude
)
-- Step 2: join prizes — one row per class per prize type (LEFT JOIN keeps classes with no prizes)
SELECT
    ce.*,
    pt.prizetypename,   -- 'שובר' | 'ג'קפוט' | 'כסף מוסף' | NULL if no prize
    cp.prizeamount      -- posted amount | NULL if no prize
FROM class_entries ce
LEFT JOIN classprize cp ON cp.classincompid = ce.classincompid
LEFT JOIN prizetype  pt ON pt.prizetypeid   = cp.prizetypeid
ORDER BY ce.classdatetime, ce.classincompid, pt.prizetypeid;
```

> **Note**: This query returns **one row per class per prize type**. A class with 3 prize
> types appears 3 times; a class with no prizes appears once with NULL prizetypename and
> prizeamount. The pivot into feature columns happens in Step 4d.

```python
from sqlalchemy import create_engine, text
engine = create_engine(DATABASE_URL)   # use postgres connection string from env
with engine.connect() as conn:
    df = pd.read_sql(text(SQL_QUERY), conn)

print(f"✅ Loaded {len(df)} class records")
df.head()
```

---

## Step 3 — Exploration (EDA)

Always run these checks before any manipulation:

```python
print("Shape:", df.shape)
df.info()
print("\nMissing values:")
print(df.isnull().sum())

# Target distribution
plt.figure(figsize=(10, 5))
sns.histplot(df['entrycount'], bins=20, kde=True)
plt.title("Distribution of Entry Count per Class")
plt.xlabel("Number of Entries")
plt.ylabel("Frequency")
plt.show()

# Entry count by field
plt.figure(figsize=(10, 5))
sns.boxplot(data=df, x='fieldname', y='entrycount')
plt.title("Entry Count by Field")
plt.xlabel("Field")
plt.ylabel("Entry Count")
plt.show()
```

---

## Step 4 — Feature Engineering (Manipulation)

### 4a. Time features (from `classdatetime`)

```python
df['classdatetime'] = pd.to_datetime(df['classdatetime'], utc=True)
df['day_of_week']   = df['classdatetime'].dt.dayofweek   # 0=Mon … 6=Sun
df['month']         = df['classdatetime'].dt.month
df['season']        = df['month'].map({
    12: 'Winter', 1: 'Winter', 2: 'Winter',
    3:  'Spring', 4: 'Spring', 5: 'Spring',
    6:  'Summer', 7: 'Summer', 8: 'Summer',
    9:  'Fall',  10: 'Fall',  11: 'Fall'
})
```

### 4b. Class name feature engineering

Encoding is done per `classtypeid` (once per class type, then merged). All patterns are applied
to the `classname` field. Hebrew and English variants are handled together.

#### Dimension 1 — Horse Level (one-hot, mutually exclusive)

```python
name = df['classname'].str.lower()

df['horse_futurity'] = name.str.contains('פטוריטי|futurity', na=False).astype(int)
df['horse_novice']   = (
    name.str.contains('נוביס|novice|green horse', na=False) &
    ~name.str.contains('פטוריטי|futurity|דרבי|derby', na=False)
).astype(int)
df['horse_derby']    = name.str.contains('דרבי|derby', na=False).astype(int)
df['horse_none']     = (
    (df['horse_futurity'] + df['horse_novice'] + df['horse_derby']) == 0
).astype(int)
```

#### Dimension 2 — Rider Age (one-hot, mutually exclusive)

```python
df['rider_youth']      = name.str.contains(
    r'נוער|עד\s*\d+|עד\s*גיל|youth|young', na=False, regex=True
).astype(int)

df['rider_adult_plus'] = (
    name.str.contains(r'40\+|50\+|בוגרים|prime time', na=False, regex=True) &
    ~df['rider_youth'].astype(bool)   # בוגרים within youth classes → youth, not adult_plus
).astype(int)

df['rider_all_ages']   = (
    (df['rider_youth'] + df['rider_adult_plus']) == 0
).astype(int)
```

#### Dimension 3 — Federation (one-hot, mutually exclusive)

```python
# Priority: international federation wins if both appear
df['fed_NRHA'] = name.str.contains('nrha', na=False).astype(int)
df['fed_NCHA'] = name.str.contains('ncha', na=False).astype(int)
df['fed_EXCA'] = name.str.contains('exca', na=False).astype(int)
df['fed_IEF']  = (
    (df['fed_NRHA'] + df['fed_NCHA'] + df['fed_EXCA']) == 0
).astype(int)   # includes התאחדות, IEF, and classes with no marker
```

#### Dimension 4 — Rider Level (multi-label, multiple flags can be 1)

```python
df['rider_open']    = name.str.contains(r'\bפתוח\b|open', na=False, regex=True).astype(int)
df['rider_non_pro'] = name.str.contains('נונ פרו|נונפרו|non pro|nonpro', na=False).astype(int)
df['rider_yaroki']  = name.str.contains('ירוקי רוכב|רוכב ירוקי|רוכב חדש', na=False).astype(int)
df['rider_pro']     = (
    name.str.contains(r'\bpro\b', na=False, regex=True) &
    ~df['rider_non_pro'].astype(bool)
).astype(int)
df['rider_limited'] = (
    name.str.contains('מוגבל|limited|limit rider', na=False) &
    ~name.str.contains('לא מוגבל', na=False)
).astype(int)
```

#### Dimension 5 — Sub-type Within Field (binary flags, field-scoped)

```python
# Cutting (fieldid 2)
df['subtype_cow_horse'] = name.str.contains('קאו הורס', na=False).astype(int)
df['subtype_premium']   = name.str.contains('פרימיום', na=False).astype(int)
df['subtype_platinum']  = name.str.contains('פלאטינום', na=False).astype(int)

# All-Around / אולארונד (fieldid 3)
df['subtype_trail']     = name.str.contains('טרייל', na=False).astype(int)
df['subtype_horsemanship'] = name.str.contains('הורסמנשיפ', na=False).astype(int)
df['subtype_pleasure']  = name.str.contains("פלז'ר|פלזר", na=False).astype(int)
df['subtype_hunt_seat'] = name.str.contains('האנט סיט אקוויטיישן', na=False).astype(int)
df['subtype_hunter_under_saddle'] = name.str.contains('האנטר אנדר סאדל', na=False).astype(int)
df['subtype_walk_jog']  = name.str.contains("הליכה ג'וג|הליכה גוג", na=False).astype(int)

# Extreme Cowboy (fieldid 4)
df['subtype_range_sorting'] = name.str.contains("ראנג' סורטינג", na=False).astype(int)
df['subtype_intermediate']  = name.str.contains('intermediate', na=False).astype(int)
df['subtype_young_gun']     = name.str.contains('young gun', na=False).astype(int)
```

#### Practice flag

```python
df['is_practice'] = name.str.contains('אימון', na=False).astype(int)
```

### 4c. Weather feature (Open-Meteo API — free, no key needed)

```python
import requests

def get_weather(lat, lon, date_str):
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": lat, "longitude": lon,
        "start_date": date_str, "end_date": date_str,
        "daily": "temperature_2m_max,precipitation_sum,windspeed_10m_max",
        "timezone": "Asia/Jerusalem"
    }
    r = requests.get(url, params=params)
    data = r.json().get('daily', {})
    return {
        'temp_max':  data.get('temperature_2m_max',  [None])[0],
        'precip_mm': data.get('precipitation_sum',   [None])[0],
        'wind_kmh':  data.get('windspeed_10m_max',   [None])[0],
    }

df['date_str'] = df['classdatetime'].dt.strftime('%Y-%m-%d')
weather_cache = {}
def cached_weather(row):
    key = (round(row['latitude'], 2), round(row['longitude'], 2), row['date_str'])
    if key not in weather_cache:
        weather_cache[key] = get_weather(row['latitude'], row['longitude'], row['date_str'])
    return weather_cache[key]

weather_df = df.apply(cached_weather, axis=1, result_type='expand')
df = pd.concat([df, weather_df], axis=1)
```

### 4d. Prize features

Prize data arrives as long format (one row per class per prize type). Pivot to wide,
then create presence flags, amount features, no_prize flag, and jackpot_final reference.

```python
# Prize type names in Hebrew:
# 'שובר'      = gift voucher
# 'ג'קפוט'    = jackpot
# 'כסף מוסף' = added money

# ── Pivot prize rows to wide format ──────────────────────────────────────────
prize_pivot = (
    df[df['prizetypename'].notna()]
    .pivot_table(
        index='classincompid',
        columns='prizetypename',
        values='prizeamount',
        aggfunc='first'
    )
    .rename(columns={
        'שובר':      'prize_shovar_amount',
        "ג'קפוט":    'prize_jackpot_posted_amount',
        'כסף מוסף': 'prize_added_money_amount'
    })
    .reset_index()
)

# ── Keep one row per class (drop duplicate prize rows) ────────────────────────
df_base = df.drop(columns=['prizetypename', 'prizeamount']).drop_duplicates(subset='classincompid')

# ── Merge prize columns back ──────────────────────────────────────────────────
df = df_base.merge(prize_pivot, on='classincompid', how='left')

# ── Fill nulls with 0 for amount columns ─────────────────────────────────────
for col in ['prize_shovar_amount', 'prize_jackpot_posted_amount', 'prize_added_money_amount']:
    df[col] = df[col].fillna(0)

# ── Presence flags ────────────────────────────────────────────────────────────
df['has_prize_shovar']      = (df['prize_shovar_amount']      > 0).astype(int)
df['has_prize_jackpot']     = (df['prize_jackpot_posted_amount'] > 0).astype(int)
df['has_prize_added_money'] = (df['prize_added_money_amount'] > 0).astype(int)

# ── No-prize flag ─────────────────────────────────────────────────────────────
df['no_prize'] = (
    (df['has_prize_shovar'] + df['has_prize_jackpot'] + df['has_prize_added_money']) == 0
).astype(int)

# ── Jackpot final payout — REFERENCE ONLY, excluded from model X ─────────────
df['prize_jackpot_final'] = df['prize_jackpot_posted_amount'] * df['entrycount']

print(f"Prize coverage: {(df['no_prize'] == 0).sum()} classes with prizes, "
      f"{df['no_prize'].sum()} without")
```

### 4e. Encode remaining categoricals and drop unused columns

```python
df = pd.get_dummies(df, columns=['season', 'fieldname'], drop_first=True, dtype=int)

drop_cols = [
    'classincompid', 'competitionid', 'classdatetime', 'classname', 'classtypeid',
    'competitionname', 'ranchname', 'latitude', 'longitude', 'month', 'date_str',
    'prize_jackpot_final', 'prizetypename', 'prizeamount'
]
df_model = df.drop(columns=drop_cols, errors='ignore').dropna()

print("Model features:", list(df_model.columns))
print("Shape:", df_model.shape)
```

---

## Step 5 — Algorithm

```python
X = df_model.drop('entrycount', axis=1)
y = df_model['entrycount']

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.3, random_state=42
)
print(f"Train: {len(X_train)} | Test: {len(X_test)}")

# Fit scaler only on train — no data leakage
scaler    = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s  = scaler.transform(X_test)

model = LinearRegression()
model.fit(X_train_s, y_train)
print("✅ Model trained")

# Coefficients
coef_df = pd.DataFrame({
    'Feature': X.columns, 'Coefficient': model.coef_
}).sort_values('Coefficient', ascending=False)
print(coef_df.to_string(index=False))
```

---

## Step 6 — Validation

```python
y_pred = model.predict(X_test_s)

mae  = metrics.mean_absolute_error(y_test, y_pred)
mse  = metrics.mean_squared_error(y_test, y_pred)
rmse = np.sqrt(mse)
r2   = metrics.r2_score(y_test, y_pred)

print(f"MAE:  {mae:.2f}")
print(f"MSE:  {mse:.2f}")
print(f"RMSE: {rmse:.2f}")
print(f"R²:   {r2:.3f}")

# Residuals plot
residuals = y_test - y_pred
plt.figure(figsize=(10, 5))
sns.scatterplot(x=y_pred, y=residuals)
plt.axhline(0, color='tomato', linestyle='--')
plt.title("Residuals vs Predicted Values")
plt.xlabel("Predicted Entry Count")
plt.ylabel("Residual (Actual − Predicted)")
plt.show()

# Actual vs Predicted
plt.figure(figsize=(10, 5))
sns.scatterplot(x=y_test, y=y_pred)
plt.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()],
         color='tomato', linestyle='--', label='Perfect prediction')
plt.title("Actual vs Predicted Entry Count")
plt.xlabel("Actual Entry Count")
plt.ylabel("Predicted Entry Count")
plt.legend()
plt.show()
```

---

## Feature Reference (complete list)

| Feature | Source | Notes |
|---|---|---|
| `fieldname` | `field.fieldname` | One-hot encoded |
| `day_of_week` | `classdatetime` | 0=Mon … 6=Sun |
| `season` | `classdatetime` | One-hot encoded |
| `orderinday` | `cic.orderinday` | 1st–4th class of day |
| `totalcost` | organizer + federation cost | Combined; jackpot: use posted cost |
| `horse_futurity/novice/derby/none` | `classname` | Dim 1 — one-hot |
| `rider_youth/adult_plus/all_ages` | `classname` | Dim 2 — one-hot |
| `fed_IEF/NRHA/NCHA/EXCA` | `classname` | Dim 3 — one-hot |
| `rider_open/non_pro/yaroki/pro/limited` | `classname` | Dim 4 — multi-label |
| `subtype_*` | `classname` | Dim 5 — binary per sub-type |
| `is_practice` | `classname` | 1 if אימון in name |
| `has_prize_shovar` | `classprize` | 1 if class has a שובר (gift voucher) prize |
| `has_prize_jackpot` | `classprize` | 1 if class has a ג'קפוט (jackpot) prize |
| `has_prize_added_money` | `classprize` | 1 if class has כסף מוסף (added money) prize |
| `no_prize` | derived | 1 if class has no prize of any type |
| `prize_shovar_amount` | `classprize` | Posted gift voucher amount (0 if none) |
| `prize_jackpot_posted_amount` | `classprize` | Advertised jackpot per participant (0 if none) |
| `prize_added_money_amount` | `classprize` | Posted added money amount (0 if none) |
| `prize_jackpot_final` | calculated | entrycount × jackpot_posted — REFERENCE ONLY, exclude from X |
| `temp_max` | Open-Meteo archive | Max daily temp °C |
| `precip_mm` | Open-Meteo archive | Daily precipitation mm |
| `wind_kmh` | Open-Meteo archive | Max daily wind speed km/h |

## Columns to discard

`classincompid`, `arenaid`, `classnotes`, `starttime`, `createdbysystemuserid`,
`competitionstartdate`, registration dates, publication date, stall map fields,
ranch contact details, `classtypeid` (after encoding), `classname` (after encoding).
