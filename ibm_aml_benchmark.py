#!/usr/bin/env python3
"""
TRACE SUTRA - external benchmark on the IBM "Transactions for Anti Money Laundering" dataset.

Usage (HI-Small is plenty; needs ~4-6 GB RAM):
    pip install pandas numpy scikit-learn
    python ibm_aml_benchmark.py HI-Small_Trans.csv --patterns HI-Small_Patterns.txt --out results

What it does
  1. Loads the CSV, builds account ids (bank + account) and a minute clock.
  2. TEMPORAL split: train on the first 60% of the time span, test on the rest.
     Features AND labels for each window use only that window's transactions (no leakage).
  3. Compares, on the held-out window:
       - TRACE rule score          (explainable rules, NOT retuned on this data)
       - TRACE rules + propagation (+30 if >=2 counterparties are flagged)
       - Gradient boosting on node features
       - Gradient boosting + neighbour (graph) features
  4. Reports PR-AUC, ROC-AUC, precision@k, recall@k (accuracy is meaningless at ~0.1% positives).
  5. Optionally reports recall per laundering pattern (fan-out, fan-in, cycle, ...).
  6. Writes results.json, results.md and trace_sample.csv (small, importable into the web app).

Account label: an account is a mule if it takes part (as sender or receiver) in a transaction
marked Is Laundering = 1 inside the window being evaluated. Device / recruiter / account-age
signals do not exist in this dataset, so the rules use only the signals that can be computed.
"""
import argparse, json, os, re, sys, time
import numpy as np, pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import average_precision_score, roc_auc_score

COLS = ["ts", "from_bank", "from_acc", "to_bank", "to_acc", "amt_recv", "cur_recv",
        "amt_paid", "cur_paid", "fmt", "label"]


def load(path, max_rows=None):
    t = time.time()
    df = pd.read_csv(path, skiprows=1, header=None, names=COLS, nrows=max_rows,
                     dtype={"from_bank": str, "from_acc": str, "to_bank": str, "to_acc": str,
                            "cur_recv": "category", "cur_paid": "category", "fmt": "category"})
    df["ts"] = pd.to_datetime(df["ts"], format="%Y/%m/%d %H:%M", errors="coerce")
    df = df.dropna(subset=["ts"])
    df["t"] = ((df["ts"] - df["ts"].min()).dt.total_seconds() / 60).astype("float32")
    codes, uniq = pd.factorize(pd.concat([df["from_bank"] + "_" + df["from_acc"],
                                          df["to_bank"] + "_" + df["to_acc"]], ignore_index=True))
    n = len(df)
    df["src"], df["dst"] = codes[:n].astype("int32"), codes[n:].astype("int32")
    df["amt"] = df["amt_paid"].astype("float64")
    df["xbank"] = (df["from_bank"] != df["to_bank"]).astype("int8")
    df["xcur"] = (df["cur_recv"].astype(str) != df["cur_paid"].astype(str)).astype("int8")
    df["label"] = df["label"].astype("int8")
    df["round"] = ((df["amt"] % 500 == 0)).astype("int8")
    print(f"loaded {n:,} txns, {len(uniq):,} accounts, {df['label'].sum():,} laundering txns "
          f"({time.time()-t:.0f}s)", flush=True)
    return df.sort_values("t").reset_index(drop=True), list(uniq)


def features(w, n_acc):
    """Per-account features from one time window. Returns DataFrame indexed by account id."""
    g_out, g_in = w.groupby("src"), w.groupby("dst")
    F = pd.DataFrame(index=np.arange(n_acc))
    F["out_cnt"] = g_out.size(); F["in_cnt"] = g_in.size()
    F["out_sum"] = g_out["amt"].sum(); F["in_sum"] = w.groupby("dst")["amt_recv"].sum()
    F["fan_out"] = g_out["dst"].nunique(); F["fan_in"] = g_in["src"].nunique()
    F["xbank_share"] = g_out["xbank"].mean(); F["xcur_share"] = g_out["xcur"].mean()
    F["round_share"] = g_out["round"].mean()
    F["out_max"] = g_out["amt"].max(); F["out_std"] = g_out["amt"].std()
    F["n_fmt"] = g_out["fmt"].nunique()
    F = F.fillna(0)
    F["fwd_share"] = np.where(F.in_sum > 0, np.minimum(F.out_sum / F.in_sum.replace(0, 1), 5), 0)
    # pass-through delay: for each outgoing txn, minutes since the most recent incoming txn
    o = w[["src", "t"]].rename(columns={"src": "acc"}).sort_values("t")
    i = w[["dst", "t"]].rename(columns={"dst": "acc", "t": "t_in"}).sort_values("t_in")
    m = pd.merge_asof(o, i, left_on="t", right_on="t_in", by="acc", direction="backward")
    m["d"] = m["t"] - m["t_in"]
    F["pass_med"] = m.groupby("acc")["d"].median()
    F["pass_med"] = F["pass_med"].fillna(9999)
    return F


def rule_score(F):
    """TRACE rules, weights copied from the web app (engine.js). Device and age rules are
    unavailable here, so the maximum is 70 instead of 100. Nothing is tuned on this data."""
    s = np.zeros(len(F))
    s += 25 * ((F.pass_med < 30) & (F.in_cnt > 0) & (F.out_cnt > 0))
    s += 15 * (F.fan_in >= 3)
    s += 10 * (F.fan_out >= 2)
    s += 10 * (F.round_share > .5)
    s += 10 * ((F.in_sum > 0) & (F.out_sum / F.in_sum.replace(0, 1) > .85))
    return s


def propagate(w, base, n_acc, flag_q=0.99):
    """Graph features from counterparties' RULE scores (labels never used)."""
    thr = np.quantile(base[base > 0], flag_q) if (base > 0).any() else 1
    flagged = (base >= thr).astype("int8")
    e = w[["src", "dst"]].drop_duplicates()
    nb = pd.concat([pd.DataFrame({"a": e.src, "b": e.dst}), pd.DataFrame({"a": e.dst, "b": e.src})])
    nb["f"] = flagged[nb.b.values]; nb["s"] = base[nb.b.values]
    agg = nb.groupby("a").agg(nb_flagged=("f", "sum"), nb_score_max=("s", "max"), nb_score_mean=("s", "mean"))
    out = pd.DataFrame(index=np.arange(n_acc)).join(agg).fillna(0)
    return out


def labels(w, n_acc):
    y = np.zeros(n_acc, dtype="int8")
    l = w[w.label == 1]
    y[l.src.values] = 1; y[l.dst.values] = 1
    return y


def p_at_k(y, score, k):
    k = min(k, len(y)); idx = np.argsort(-score, kind="stable")[:k]
    return float(y[idx].mean()), float(y[idx].sum() / max(1, y.sum()))


def evaluate(y, score, ks):
    r = {"pr_auc": float(average_precision_score(y, score)), "roc_auc": float(roc_auc_score(y, score))}
    for k in ks:
        p, rc = p_at_k(y, score, k); r[f"precision@{k}"] = p; r[f"recall@{k}"] = rc
    return r


def parse_patterns(path):
    pats, cur, name = {}, None, None
    for line in open(path, encoding="utf-8", errors="ignore"):
        line = line.strip()
        m = re.match(r"BEGIN LAUNDERING ATTEMPT\s*-\s*(.+)", line)
        if m: name = m.group(1).strip().split(":")[0].upper(); cur = set(); continue
        if line.startswith("END LAUNDERING ATTEMPT"):
            if cur: pats.setdefault(name, []).append(cur)
            cur = None; continue
        if cur is not None:
            p = line.split(",")
            if len(p) >= 5: cur.add(p[1] + "_" + p[2]); cur.add(p[3] + "_" + p[4])
    return pats


def make_sample(df, uniq, path, rows):
    """Small importable file for the web app. Built using labels, so it is for DEMO only."""
    lab = df[df.label == 1]
    L = set(lab.src.values) | set(lab.dst.values)
    touch = df[df.src.isin(L) | df.dst.isin(L)]
    if len(touch) > rows * 0.7:
        touch = pd.concat([lab, touch[touch.label == 0].sample(int(rows * 0.7) - len(lab), random_state=1)])
    rest = df.drop(touch.index, errors="ignore")
    s = pd.concat([touch, rest.sample(max(0, rows - len(touch)), random_state=1)]).sort_values("t")
    out = pd.DataFrame({"from": [uniq[i] for i in s.src], "to": [uniq[i] for i in s.dst],
                        "amount": s.amt.round(2), "time_min": s.t.round(0).astype(int), "label": s.label})
    out.to_csv(path, index=False); print(f"wrote {path}: {len(out):,} rows, "
                                         f"{os.path.getsize(path)/1e6:.1f} MB", flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("csv"); ap.add_argument("--patterns"); ap.add_argument("--out", default="results")
    ap.add_argument("--max-rows", type=int); ap.add_argument("--sample-rows", type=int, default=50000)
    ap.add_argument("--split", type=float, default=0.6)
    a = ap.parse_args(); os.makedirs(a.out, exist_ok=True)

    df, uniq = load(a.csv, a.max_rows); n_acc = len(uniq)
    cut = df.t.max() * a.split
    tr, te = df[df.t <= cut], df[df.t > cut]
    print(f"train window: {len(tr):,} txns | test window: {len(te):,} txns", flush=True)

    Ftr, Fte = features(tr, n_acc), features(te, n_acc)
    ytr, yte = labels(tr, n_acc), labels(te, n_acc)
    act_tr = (Ftr.in_cnt + Ftr.out_cnt > 0).values; act_te = (Fte.in_cnt + Fte.out_cnt > 0).values
    rtr, rte = rule_score(Ftr).values, rule_score(Fte).values
    Gtr, Gte = propagate(tr, rtr, n_acc), propagate(te, rte, n_acc)
    prop_te = rte + 30 * (Gte.nb_flagged.values >= 2)

    base_cols = list(Ftr.columns)
    def gbm(Xtr, Xte):
        m = HistGradientBoostingClassifier(max_iter=250, learning_rate=.08, class_weight="balanced",
                                           random_state=7)
        m.fit(Xtr[act_tr], ytr[act_tr]); return m.predict_proba(Xte)[:, 1]
    p_gbm = gbm(Ftr[base_cols].values, Fte[base_cols].values)
    p_gbmg = gbm(np.hstack([Ftr.values, Gtr.values]), np.hstack([Fte.values, Gte.values]))

    y, ks = yte[act_te], [100, 500, 1000, 5000]
    pos = int(y.sum()); print(f"test accounts: {act_te.sum():,}, mules: {pos:,} ({pos/act_te.sum():.3%})")
    scores = {"TRACE rules (not retuned)": rte, "TRACE rules + propagation": prop_te,
              "Gradient boosting (node features)": p_gbm, "Gradient boosting + neighbour features": p_gbmg}
    res = {"dataset": os.path.basename(a.csv), "train_txns": len(tr), "test_txns": len(te),
           "test_accounts": int(act_te.sum()), "test_mules": pos, "base_rate": pos / act_te.sum(),
           "models": {k: evaluate(y, v[act_te], ks) for k, v in scores.items()}}

    if a.patterns and os.path.exists(a.patterns):
        key = {u: i for i, u in enumerate(uniq)}; budget = int(.01 * act_te.sum())
        res["pattern_recall_at_1pct_alerts"] = {}
        for name in ["TRACE rules + propagation", "Gradient boosting + neighbour features"]:
            sc = np.where(act_te, scores[name], -1); top = set(np.argsort(-sc)[:budget])
            for pn, groups in parse_patterns(a.patterns).items():
                hit = tot = 0
                for gset in groups:
                    ids = {key[x] for x in gset if x in key and act_te[key[x]] and yte[key[x]]}
                    hit += len(ids & top); tot += len(ids)
                if tot: res["pattern_recall_at_1pct_alerts"].setdefault(pn, {})[name] = hit / tot

    json.dump(res, open(os.path.join(a.out, "results.json"), "w"), indent=2)
    with open(os.path.join(a.out, "results.md"), "w") as f:
        f.write(f"# TRACE SUTRA - IBM AML benchmark ({res['dataset']})\n\n"
                f"Temporal split. Test window: {res['test_txns']:,} txns, {res['test_accounts']:,} accounts, "
                f"{pos:,} mules ({res['base_rate']:.3%} base rate).\n\n"
                "| Model | PR-AUC | ROC-AUC | P@100 | P@500 | P@1000 | R@1000 |\n|---|---|---|---|---|---|---|\n")
        for k, r in res["models"].items():
            f.write(f"| {k} | {r['pr_auc']:.3f} | {r['roc_auc']:.3f} | {r['precision@100']:.2f} | "
                    f"{r['precision@500']:.2f} | {r['precision@1000']:.2f} | {r['recall@1000']:.2f} |\n")
        f.write(f"\nRandom guessing would give PR-AUC ~ {res['base_rate']:.4f} and precision ~ {res['base_rate']:.4f}.\n")
        if "pattern_recall_at_1pct_alerts" in res:
            f.write("\n## Recall per laundering pattern (top 1% of accounts alerted)\n\n| Pattern | Rules+prop | GBM+graph |\n|---|---|---|\n")
            for pn, d in res["pattern_recall_at_1pct_alerts"].items():
                f.write(f"| {pn} | {d.get('TRACE rules + propagation', 0):.2f} | {d.get('Gradient boosting + neighbour features', 0):.2f} |\n")
        f.write("\nNot available in this dataset: device sharing, recruiter handle, account age (TRACE rules for these were skipped).\n")
    print(open(os.path.join(a.out, "results.md")).read())
    make_sample(df, uniq, os.path.join(a.out, "trace_sample.csv"), a.sample_rows)


if __name__ == "__main__":
    main()
