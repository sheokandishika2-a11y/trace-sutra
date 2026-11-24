# TRACE SUTRA
**AI-assisted cyber fraud investigation and attribution – Detect → Link → Freeze → Prove**

Problem Statement 4: *AI-Powered Cyber Fraud Investigation and Attribution System*.

> All data is **synthetic**. No real complaints, accounts or personal data are used.

## What it does
| PS4 deliverable | Where it lives |
|---|---|
| Entity-resolution framework | `js/engine.js` → `analyse()`; **Entity resolution** tab |
| Fraud attribution engine | `js/engine.js` (mule scoring, gang linking, cash-out identification) |
| Financial evidence correlation dashboard | **Mules & freeze** tab, stat cards, per-account evidence panel |
| Fraud-network visualization platform | **Network** tab (interactive graph, toggleable money-flow and shared-device layers) |
| Investigative intelligence reports | **Dossier** tab (English and Hindi, SHA-256 evidence hash) |
| Investigation dataset | `js/data.js` generator and the **Dataset (JSON)** button |

Highlights:
- **Entity resolution:** complaint mentions with spacing, `+91`/`0` prefixes, case changes and name initials are merged using normalised account number, UPI handle and phone keys (union-find). Merge accuracy is measured against the synthetic ground truth.
- **Mule fingerprinting:** explainable rule-based score (0–100). Every flag lists its reasons.
- **Cross-complaint gang linking:** complaints from different states are tied to one gang through shared accounts, money flow and devices.
- **Golden-hour freeze priority:** flagged accounts ranked by estimated balance still held.
- **Trust layer:** SHA-256 dataset and dossier hashes, plus a hash-chained audit log. Nothing is auto-actioned; a human approves every freeze.

## Screens
Dashboard (loss by state, complaint rate, priority actions, gang table) · Case intake (paste a Hinglish complaint, extract identifiers, match to known entities) · Network · Entities · Timeline (minute-by-minute money-flow replay) · Mules & freeze (approval queue and draft bank letter) · Ask TRACE (plain-English queries) · Dossier (English/Hindi) · Audit log (verify the hash chain, simulate tampering).

## Import your own transactions (CSV)
Click **⬆ Import CSV** in the header. Columns needed: sender, receiver, amount, time (a label column is optional). A mapper lets you pick columns; IBM-AML-style files (`Account`/`Bank` columns, `Timestamp`) are detected automatically. The **whole file is read**, however large: every row is streamed through the browser (the 475 MB IBM file, about 5 million rows, takes roughly a minute), every account is scored, and the labels are measured across all accounts. The graph, timeline, evidence thread, dossier and Ask TRACE then work on the 150 highest-risk accounts and their transactions (up to 1,500 each); Ask TRACE answers questions about the whole file (account lookups, largest transactions, top senders, label results).
- A CSV has no device, account-age or recruiter data, so only flow rules apply: maximum score 70, flag threshold **40**. A banner says so on every screen.
- Senders that never receive money are treated as victims. If you map a label column (1 = mule), precision and recall against it are shown. The detector never reads the label.
- Try `benchmark/demo_mule_ring.csv` (synthetic, labelled, shows a gang) or `benchmark/trace_sample.csv` (an import-format sample from the public IBM AML file; it contains no clear victim-to-mule trail, so the app may report few or no gangs, which is the honest result).
- **Back to synthetic demo** restores the built-in case set.

## External benchmark (IBM AML, public Kaggle dataset)
`benchmark/ibm_aml_benchmark.py` runs a temporal-split benchmark (train on the first 60% of time, test on the rest) and writes `results.json`; load it on the **Evaluation** screen. The 475 MB `HI-Small_Trans.csv` is **not** in this ZIP: download it from Kaggle ("IBM Transactions for Anti Money Laundering") and run, with about 4–6 GB RAM:
```bash
pip install pandas numpy scikit-learn
python benchmark/ibm_aml_benchmark.py HI-Small_Trans.csv --out results
```
**No benchmark numbers are quoted here because the full run has not been completed.** A quick test on only the first 1.5M rows is not valid: that part of the file covers almost a single day, so the time split leaves a tiny test window. Use the full file.

## Navigation
The sidebar follows the investigator's workflow: **Triage** (Dashboard, Evidence thread, Case intake, Ask TRACE) → **Investigate** (Entities, Network, Timeline) → **Act** (Mules & freeze) → **Report** (Dossier, Audit log, Evaluation).

## The thread concept
*Sutra* means thread. A red thread links every piece of evidence: an **Evidence thread** board for one case (cards joined by drawn threads), a network that traces money downstream when you select an account, and a hash-linked audit chain. All visuals are vector animation over synthetic data; no photos or videos are used.

## Validation (read this before judging the numbers)
- Each account has an explicit `label` (1 = mule, 0 = benign) in the dataset JSON. Detectors never read it.
- A logistic-regression baseline is trained on case sets 1–6 and every result is measured on held-out sets 11–18, for standard and evasive gangs. The benign set includes look-alike accounts.
- The primary detector is a transparent rule score, not advanced ML. On this synthetic data the trained model beats it; train and test share one generator, so treat that as optimistic.
- Graph and account panels show the exact transactions or records behind every flag and every link.

## Detection, attribution and evidence extras
- **Evaluation screen:** precision/recall/F1 for mule detection against synthetic ground truth, for standard and evasive gangs, with and without graph propagation.
- **Recruiter tracing and scam types:** accounts onboarded through a shared recruiter handle are grouped; each gang shows its likely recruiter and dominant modus operandi (UPI collect, SIM swap, phishing, investment scam, fake KYC).
- **Draft Section 63 certificate (BSA 2023):** generated with the dossier hash; format must be verified by legal counsel.
- **Guided demo:** a nine-step scripted walkthrough with an on-screen coach bar.

## Look and feel
Government-portal style interface: top strip with text-size (A+ / A / A-) and high-contrast controls, white masthead, dropdown navigation (Home, Triage, Investigate, Act, Report) with breadcrumbs, pastel summary tiles, a plain-language description under every page title, and a footer with the data notice. Fully keyboard accessible.

## Setup
No installation and no dependencies. It is plain HTML, CSS and JavaScript.

```bash
unzip trace-sutra.zip && cd trace-sutra
python3 -m http.server 8000      # any static server works
# open http://localhost:8000
```
Opening `index.html` directly in a modern browser also works.

**Optional engine check** (Node.js 18+):
```bash
cat js/data.js js/engine.js > /tmp/t.js
echo 'const r=analyse(gen(20261029));console.log(r.gangs.length,r.ents.length,r.acc)' >> /tmp/t.js
node /tmp/t.js
```

## Using it
1. Open the **Network** tab and click any node for its risk score, reasons, flows and device links.
2. **Entity resolution** shows how many mentions merged into each entity.
3. **Mules & freeze** gives the freeze order and recoverable amount.
4. **Dossier** generates the report per gang (English or हिन्दी) with its evidence hash and audit trail.
5. **New synthetic case set** re-rolls the data; **Dataset (JSON)** downloads it.

## Project structure
```
index.html        page shell
css/style.css     light/dark theme
js/data.js        seeded synthetic generator (2 gangs, victims, mules, devices, benign accounts)
js/engine.js      entity resolution, mule scoring, gang linking
js/bg.js          animated background, count-up numbers
js/screens.js     dashboard, intake, timeline, ask, freeze queue, audit
js/ui.js          dashboard, force-layout graph, dossier, audit chain
```

## Mule score (rule-based, max 100)
| Signal | Points |
|---|---|
| Device shared with other accounts | 25 |
| Median pass-through under 30 min | 25 |
| Fan-in from 3 or more senders | 15 |
| Account younger than 60 days | 15 |
| Fan-out to 2 or more accounts | 10 |
| Round-number outflows dominate | 10 |
| Over 85% of inflow forwarded | 10 |

Accounts scoring 60 or more are flagged.

## Limitations (honest scope)
- Synthetic data only; the 100% merge accuracy reflects the generator, not real-world messiness.
- Scoring is rule-based; no trained model yet. Thresholds are illustrative and need calibration on real data.
- Balances are estimated from transaction timing, not live bank data.
- Precision looks perfect because the synthetic benign accounts are few and simple; treat results as a proof of method.
- The Section 63 (Bharatiya Sakshya Adhiniyam) certificate text is a **draft**; verify the legal format with counsel.
- "Ask TRACE" is a rule-based parser, not an LLM. Intake extraction uses regular expressions, not a trained model.

## Deployment roadmap for LEAs
1. **Pilot:** ingest NCRP complaint exports and bank statement responses at one state cyber cell.
2. **Model upgrade:** train graph features and gradient-boosted scoring on labelled historical cases; add embeddings for fuzzy name matching.
3. **Scale:** move the graph to Neo4j, add role-based access and tamper-evident storage.
4. **Inter-bank:** privacy-preserving matching (hashed identifiers / private set intersection) so banks can match suspect accounts without exposing other customer data.
5. **Assistant layer:** natural-language queries and multilingual report drafting, with human review.

## Team
*Add team name, members and institution here.*

## Added files
```
js/import.js        CSV import, column mapper, benchmark-results loader
benchmark/          ibm_aml_benchmark.py, demo_mule_ring.csv, trace_sample.csv (HI-Small_Trans.csv not included)
```

## Measured on the full IBM AML file (HI-Small_Trans.csv, whole file in the browser)
Flow-only rule score, flag threshold 40: about 608 of 422,734 accounts flagged, 28 of the 6,357 labelled mules among them (precision about 4.6%, recall under 1%). In other words, these flow rules are **not tuned for IBM-style laundering** (which relies on cycles and scatter-gather patterns) and should not be presented as strong results on this data. The trained benchmark in `benchmark/ibm_aml_benchmark.py` is the right tool for a defensible number there.


## Data Explorer (Investigate > Data Explorer)
Full-detail views built live from the loaded case: every transaction as a graph (whole case or per gang, each arrow labelled with id, amount and time), a searchable ledger, the 8 signals and reasons for every account, the raw identity mentions and what they resolve to, a per-account transaction clock, and the full score ranking. Click any account in the graph to open its evidence.
