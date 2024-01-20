# Specter-Fuzz 👻

**Specter-Fuzz** is an intelligent, predictive web directory fuzzer.

## The Upgrade
Traditional web fuzzers use static wordlists. If they find an `/api/` directory, they continue checking irrelevant words like `/images/` instead of immediately diving deeper into API-specific endpoints.

`specter-fuzz` changes this:
- **Prediction Engine**: It uses a heuristic map. If it discovers a critical path (e.g., `/api/` or `/admin/`), it dynamically intercepts the queue and injects high-probability child paths (like `/api/v1/users` or `/admin/config.php`) to the absolute front of the line.
- **WAF Evasion**: Features an anti-WAF jitter delay mechanic that mimics human browsing inconsistency, preventing predictable automated blocks.

## Inspiration & Credit
Built upon the raw speed concepts of [Gobuster](https://github.com/OJ/gobuster) and the dictionary techniques of [dirsearch](https://github.com/maurosoria/dirsearch).

## Usage
1. Build the binary: `go build`
2. Run it against a target:
   ```bash
   ./specter-fuzz -u http://target.com -w wordlist.txt -t 20 -j 100
   ```
