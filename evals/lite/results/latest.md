# Spark Agent Lite Eval Results

- Date: 2026-10-14T11:49:39.285Z
- Provider: `deepseek / deepseek-chat`
- Max turns: 12
- Tasks: 6 (hard subset: 01, 11–15)

## Summary

| Mode | Pass | Total | Rate |
|------|------|-------|------|
| chat | 6 | 6 | 100.0% |
| no-verify | 6 | 6 | 100.0% |
| verify | 6 | 6 | 100.0% |

Earlier full easy suite (01–10, verify vs no-verify) was also **10/10 vs 10/10**.

## Interpretation (honest)

1. **Eval harness works**: tasks are auto-scored by `verify.mjs` (not model self-report).
2. **DeepSeek-chat saturates this Lite suite** — too easy to separate `chat` vs agent vs verify-gate.
3. Therefore Lite currently proves **reproducible tooling**, not yet a win for the verify loop.

## What would prove harness value next

| Next experiment | Why |
|-----------------|-----|
| Same suite on a **weaker** China model (e.g. smaller GLM / Qwen) | Amplify Harness gap |
| **SWE-bench Verified subset** (25–50) | Real repo bugs; industry-comparable |
| **Recovery suite**: start from failing patches | Forces verify/tool loops |
| Track **turns / tokens to pass** | Secondary metric when Pass@1 saturates |

## How to reproduce

```bash
npm run eval:lite
# or hard subset:
node scripts/run-eval.mjs --mode compare --only 11-two-bugs,12-strict-report,13-palindrome,14-rename-util,15-range-sum
```
