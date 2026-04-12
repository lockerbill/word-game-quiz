# CONTENT_IMPORT_RUNBOOK.md

Operational runbook for importing the REQ-DATASET-SCALE-001 CSV batches through the admin web bulk import flow.

## Scope
- Dataset location: `server/data/req-dataset-scale-001`
- Files:
  - `categories_batch_01.csv` ... `categories_batch_10.csv` (category-only reference files)
  - `answers_batch_01.csv` ... `answers_batch_10.csv` (bulk-import compatible payload files)
- Import target: Admin web bulk import (`/api/admin/content/import-jobs`)

## CSV formats used
- Category files (reference only): `categoryName,difficulty,emoji,enabled`
- Answer files (import payload): `categoryName,difficulty,emoji,enabled,letter,answer`

Note: current admin import requires `categoryName`, `letter`, and `answer` in each row. Use the `answers_batch_XX.csv` files for import jobs.

## Preconditions
1. API server is running and reachable.
2. Admin web app is running and you are logged in as `admin` or `super_admin`.
3. You have a rollback-safe baseline by creating a content draft revision before first import.

## Batch plan
Import in strict order from batch 01 to batch 10.

- Batch 01: `answers_batch_01.csv`
- Batch 02: `answers_batch_02.csv`
- Batch 03: `answers_batch_03.csv`
- Batch 04: `answers_batch_04.csv`
- Batch 05: `answers_batch_05.csv`
- Batch 06: `answers_batch_06.csv`
- Batch 07: `answers_batch_07.csv`
- Batch 08: `answers_batch_08.csv`
- Batch 09: `answers_batch_09.csv`
- Batch 10: `answers_batch_10.csv`

## Execution workflow (admin web UI)
For each batch file:

1. Open Admin Web -> Content -> Imports.
2. Click Create import job.
3. Set:
   - `format`: `csv`
   - `dryRun`: `true`
   - `reason`: `REQ-DATASET-SCALE-001 batch XX dry-run`
4. Paste file content from `server/data/req-dataset-scale-001/answers_batch_XX.csv`.
5. Create the job and review validation summary:
   - Expected status: `validated`
   - Expected errors: `0`
6. Apply the same job:
   - Apply reason: `REQ-DATASET-SCALE-001 batch XX apply`
7. Confirm job status changes to `applied`.

Repeat for all 10 batches.

## Validation checkpoints
- Per batch expected apply result:
  - `importedRows`: `10000`
  - `categoriesTouched`: `1000`
  - `answersCreated`: close to `10000` (exact for first import of this dataset)
  - `answersSkippedDuplicate`: `0` (for first import of this dataset)
- Global expected totals across all 10 batches:
  - Categories created: `10000`
  - Answers created: `100000`

If categories/answers already exist in the database from prior runs, `categoriesCreated` and `answersCreated` can be lower while duplicate counters increase.

## Publish + rollback safety
1. Before first apply, create a draft content revision snapshot (baseline).
2. After all 10 applies pass, create a new draft revision and submit/publish it.
3. If any post-import issue appears, rollback to the baseline published revision.

## Optional local regeneration
If CSV files need regeneration:

```bash
node server/scripts/generate-dataset-scale-csv.mjs
```

Quick local line-count sanity check:

```bash
node -e "const fs=require('fs');const p=require('path');const d=p.join(process.cwd(),'server','data','req-dataset-scale-001');for(const f of fs.readdirSync(d).filter(x=>x.endsWith('.csv')).sort()){const n=fs.readFileSync(p.join(d,f),'utf8').trimEnd().split(/\r?\n/).length;console.log(f+': '+n);}" 
```
