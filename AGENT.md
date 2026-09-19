# AI Assistant Rules

## Git Push Policy
Whenever you (the AI) are asked to push code, or when you are wrapping up a task and pushing changes, you **MUST ALWAYS** push the code to **BOTH** of our remote repositories. 

The two remotes are:
1. `techrtaj` -> `https://github.com/techrtaj/khaleeji-bot-V2-frontend.git`
2. `redasalem` -> `https://github.com/redasalem/pro-bot-v2-frontend.git`

**Do not ask for permission to push to both, just do it automatically.**

You can use the following commands to ensure both are updated:
```bash
git push techrtaj main
git push redasalem main
```
*(Use `--force` only if explicitly required by the situation).*
