# SOP-303: Disk Space Exhaustion & Log Rotation Failure

## 1. Alert Overview & Identification
- **Trigger Condition:** Root (`/`) or data partition disk usage exceeds 88% capacity.
- **Affected Systems:** Host instances, Docker volumes, `/var/log`, `/var/lib/docker`.
- **Impact:** Inability to write WAL logs, process crashes, read-only filesystem transitions.

## 2. Diagnostic Procedure
1. Check disk utilization per mount point:
   ```bash
   df -h
   ```
2. Locate the largest directories on the root volume:
   ```bash
   du -sh /var/log/* /var/lib/docker/* 2>/dev/null | sort -rh | head -n 10
   ```
3. Check Docker storage consumption:
   ```bash
   docker system df
   ```

## 3. Remediation Actions

### Safe Actions (Direct Auto-Execution):
1. **Truncate oversized active application logs (> 1GB):**
   ```bash
   find /var/log -type f -name "*.log" -size +1G -exec truncate -s 0 {} +
   ```
2. **Prune Dangling Docker Images and Build Cache:**
   ```bash
   docker image prune -f
   ```

### Destructive / Privileged Actions (Requires Telegram Approval):
1. **Purge All Unused Docker Volumes and System Data:**
   ```bash
   docker system prune -a --volumes -f
   ```
2. **Delete Old Core Dumps and System Journals:**
   ```bash
   journalctl --vacuum-time=2d
   ```

## 4. Postcondition Verification
1. Verify available disk space is above 25% free:
   ```bash
   df -h /
   ```
2. Confirm system logging daemon is active and functioning:
   ```bash
   systemctl status systemd-journald
   ```
