"""T10 Statistical Sanity Check Script.

Analyzes the proposed cost anomaly trigger and S_FIN distribution
across all 1,675 authentic records in data/processed/mplads.db.
"""

import json
import pandas as pd
import numpy as np
from sqlalchemy import create_engine

with open('ml/cohort_baselines.json', 'r', encoding='utf-8') as f:
    cb = json.load(f)

engine = create_engine('sqlite:///data/processed/mplads.db')
df = pd.read_sql_table('projects', engine)

results = []
for _, row in df.iterrows():
    cat = row['category']
    state = row['state']
    key = f'{cat}::{state}'
    
    cohort_info = cb['cohorts'].get(key, cb['categories'].get(cat, cb['global']))
    is_fallback = cohort_info.get('is_fallback', False)
    
    p50 = cohort_info['expenditure_median']
    p90 = cohort_info['expenditure_p90']
    exp = float(row['expenditure'])
    
    # Cost ratio
    cost_ratio = round(exp / p50, 3) if p50 > 0 else 0.0
    
    # Trigger condition: expenditure > cohort P90 AND expenditure / cohort P50 >= 1.30
    trigger = (exp > p90) and (cost_ratio >= 1.30)
    
    # S_FIN formula: clamped to [0, 35]
    if p90 > p50:
        s_fin = min(35.0, max(0.0, ((exp - p50) / (p90 - p50)) * 35.0))
    else:
        s_fin = 0.0
    s_fin = round(s_fin, 2)
    
    results.append({
        'source_record_id': row['source_record_id'],
        'state': state,
        'category': cat,
        'expenditure': exp,
        'sanctioned_cost': float(row['sanctioned_cost']),
        'cohort_p50': p50,
        'cohort_p90': p90,
        'cost_ratio': cost_ratio,
        's_fin': s_fin,
        'trigger': trigger,
        'is_fallback': is_fallback
    })

rdf = pd.DataFrame(results)

print('=== 1 & 2. Trigger Counts ===')
print(f'Total records evaluated: {len(rdf)}')
print(f'Cost anomaly triggers: {rdf["trigger"].sum()}')
print(f'Trigger rate: {rdf["trigger"].mean() * 100:.2f}%')

print('\nPrimary vs Fallback Breakdown:')
for is_fb, grp in rdf.groupby('is_fallback'):
    lbl = 'Fallback (N < 10)' if is_fb else 'Primary (N >= 10)'
    print(f'  {lbl:20}: count={len(grp)}, triggers={grp["trigger"].sum()} ({grp["trigger"].mean()*100:.2f}%)')

print('\nTriggers by Category:')
for cat, grp in rdf.groupby('category'):
    print(f'  {cat:35}: count={len(grp)}, triggers={grp["trigger"].sum()} ({grp["trigger"].mean()*100:.2f}%)')

print('\nTriggers by State (Top 10):')
state_trig = rdf[rdf['trigger']].groupby('state').size().sort_values(ascending=False)
for st, cnt in state_trig.head(10).items():
    print(f'  {st:25}: {cnt}')

print('\n=== 3. S_FIN Distribution ===')
s = rdf['s_fin']
print(f'Min: {s.min():.2f}')
print(f'P25: {s.quantile(0.25):.2f}')
print(f'Median: {s.median():.2f}')
print(f'P75: {s.quantile(0.75):.2f}')
print(f'P90: {s.quantile(0.90):.2f}')
print(f'Max: {s.max():.2f}')
print(f'Score 0 count: {(s == 0).sum()} ({(s == 0).mean()*100:.1f}%)')
print(f'Score 35 count (Max Cap): {(s >= 35).sum()} ({(s >= 35).mean()*100:.1f}%)')

print('\n=== 4. Numerical Stability Checks ===')
p90_eq_p50 = (rdf['cohort_p90'] == rdf['cohort_p50']).sum()
zero_p50 = (rdf['cohort_p50'] == 0).sum()
zero_sanction = (rdf['sanctioned_cost'] == 0).sum()
zero_exp = (rdf['expenditure'] == 0).sum()
print(f'Cohorts where P90 == P50: {p90_eq_p50}')
print(f'Records with cohort P50 == 0: {zero_p50}')
print(f'Records with sanctioned_cost == 0: {zero_sanction}')
print(f'Records with expenditure == 0: {zero_exp}')

print('\n=== 5. Expenditure > Sanctioned Cost Analysis ===')
over_exp = rdf[rdf['expenditure'] > rdf['sanctioned_cost']]
print(f'Total over_exp records: {len(over_exp)} ({len(over_exp)/len(rdf)*100:.1f}%)')
print(f'Over_exp triggering cost anomaly: {over_exp["trigger"].sum()} ({over_exp["trigger"].mean()*100:.1f}%)')
non_over = rdf[rdf['expenditure'] <= rdf['sanctioned_cost']]
print(f'Non-over_exp triggering cost anomaly: {non_over["trigger"].sum()} ({non_over["trigger"].mean()*100:.1f}%)')

print('\n=== 6. TOP 20 Records by S_FIN ===')
top20 = rdf.sort_values(by=['s_fin', 'expenditure'], ascending=False).head(20)
for idx, r in top20.iterrows():
    print(f"{r['source_record_id']} | {r['state'][:18]:18} | {r['category'][:22]:22} | Exp: {r['expenditure']:5.2f} | P50: {r['cohort_p50']:5.2f} | P90: {r['cohort_p90']:5.2f} | Ratio: {r['cost_ratio']:5.2f} | S_FIN: {r['s_fin']:5.2f} | Trigger: {r['trigger']}")

print('\n=== 7. Categorization Summary ===')
normal = (s < 15).sum()
anomaly = ((s >= 15) & (s < 30)).sum()
extreme = (s >= 30).sum()
print(f'NORMAL / EXPECTED (S_FIN < 15): {normal} ({normal/len(rdf)*100:.1f}%)')
print(f'ANOMALY SIGNAL (15 <= S_FIN < 30): {anomaly} ({anomaly/len(rdf)*100:.1f}%)')
print(f'EXTREME (S_FIN >= 30): {extreme} ({extreme/len(rdf)*100:.1f}%)')
