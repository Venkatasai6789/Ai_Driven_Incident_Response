# SOP-202: Database Connection Pool Starvation & Idle Connection Leak

## 1. Alert Overview & Identification
- **Trigger Condition:** Active PostgreSQL or MySQL connection count reaches 95% of `max_connections` or clients receive `FATAL: remaining connection slots are reserved for non-replication superuser connections`.
- **Affected Systems:** Backend API gateways, background workers, and PostgreSQL / Supabase databases.
- **Impact:** Application timeouts, 500 Internal Server Errors, connection pool exhaustion.

## 2. Diagnostic Procedure
1. Check active database connections by application state:
   ```sql
   SELECT state, count(*) 
   FROM pg_stat_activity 
   GROUP BY state;
   ```
2. Identify long-running idle or blocking queries:
   ```sql
   SELECT pid, usename, client_addr, state, age(clock_timestamp(), query_start) AS duration, query
   FROM pg_stat_activity
   WHERE state != 'idle' AND query NOT ILIKE '%pg_stat_activity%'
   ORDER BY duration DESC
   LIMIT 10;
   ```

## 3. Remediation Actions

### Safe Actions (Direct Auto-Execution):
1. **Terminate Idle in Transaction Connections (> 5 minutes):**
   ```sql
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'idle in transaction' AND age(clock_timestamp(), state_change) > interval '5 minutes';
   ```
2. **Restart Application Connection Pool / PgBouncer:**
   ```bash
   docker restart pgbouncer
   ```

### Destructive / Privileged Actions (Requires Telegram Approval):
1. **Force Terminate All Non-Superuser Database Backends:**
   ```sql
   SELECT pg_terminate_backend(pid) 
   FROM pg_stat_activity 
   WHERE usename != 'postgres' AND pid <> pg_backend_pid();
   ```
2. **Restart Primary Database Service:**
   ```bash
   systemctl restart postgresql
   ```

## 4. Postcondition Verification
1. Confirm active connections are below 50% capacity:
   ```sql
   SELECT count(*) FROM pg_stat_activity;
   ```
2. Verify API response time returns to normal baseline (< 200ms).
