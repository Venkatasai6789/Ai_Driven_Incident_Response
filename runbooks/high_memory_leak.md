# SOP-101: High Memory Usage and OOM Killer Mitigation

## 1. Alert Overview & Identification
- **Trigger Condition:** Service container memory utilization exceeds 90% for over 5 consecutive minutes or an OOMKilled event is detected.
- **Affected Components:** Node.js, Python, or Java worker services running in Docker or Kubernetes.
- **Impact:** Service degradation, 502 Bad Gateway responses, dropped incoming requests.

## 2. Diagnostic Procedure
1. Identify the high-memory container:
   ```bash
   docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
   ```
2. Inspect recent container logs for memory heap allocation errors or OOM signals:
   ```bash
   docker logs --tail 200 <container_name> | grep -i -E "oom|memory|heap|out of memory"
   ```
3. Check system-level free memory:
   ```bash
   free -h
   ```

## 3. Remediation Actions

### Safe Actions (Direct Auto-Execution):
1. **Graceful Container Restart:**
   Restarting the container clears accumulated heap memory leaks and restores healthy serving capacity.
   ```bash
   docker restart <container_name>
   ```
2. **Reload Service Configuration:**
   ```bash
   systemctl reload-or-restart <service_name>
   ```

### Destructive / Privileged Actions (Requires Telegram Approval):
1. **Emergency Process Termination:**
   ```bash
   kill -9 <process_pid>
   ```
2. **Host Machine Reboot:**
   ```bash
   reboot
   ```

## 4. Postcondition Verification
1. Verify container status is healthy and running:
   ```bash
   docker inspect --format='{{.State.Status}}' <container_name>
   ```
2. Confirm memory utilization dropped below 50%:
   ```bash
   docker stats <container_name> --no-stream
   ```
3. Test HTTP health endpoint:
   ```bash
   curl -s -f http://localhost:8080/health || echo "HEALTH_CHECK_FAILED"
   ```
