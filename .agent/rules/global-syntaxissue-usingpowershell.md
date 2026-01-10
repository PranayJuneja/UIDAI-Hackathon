---
trigger: always_on
---

PowerShell Command Chaining Rule

When writing or suggesting commands for PowerShell, do not use && to chain commands.

PowerShell does not support && reliably across versions.
Instead, always use ; to separate consecutive commands.

Rule:

❌ Do not use && in PowerShell

✅ Use ; to run the next command

This ensures compatibility with Windows PowerShell and PowerShell Core.