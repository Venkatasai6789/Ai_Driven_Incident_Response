"""
Convenient CLI tool to send mock alerts to the Webhook Service.
Usage:
    python scripts/send_alert.py --type memory
    python scripts/send_alert.py --type db
    python scripts/send_alert.py --type disk
    python scripts/send_alert.py --name "CustomAlert" --desc "Error logs" --severity Critical
"""

import argparse
import json
import sys
import time
import requests


def send_alert(alert_name: str, description: str, severity: str, service: str, instance: str, host: str = "http://localhost:8000"):
    payload = {
        "alert_name": alert_name,
        "description": description,
        "severity": severity,
        "service": service,
        "instance": instance,
    }
    url = f"{host}/webhook/alerts"
    print(f"[*] Posting alert to {url}...")
    print(f"    Payload: {json.dumps(payload, indent=2)}")

    try:
        resp = requests.post(url, json=payload, timeout=30)
        if resp.status_code == 201:
            print("\n[OK] Alert processed successfully! Triage Response:\n")
            print(json.dumps(resp.json(), indent=2))
        else:
            print(f"\n[!] Server returned status {resp.status_code}: {resp.text}")
    except requests.exceptions.ConnectionError:
        print(f"\n[ERROR] Could not connect to {host}. Make sure the webhook server is running:")
        print("        .venv\\Scripts\\python src/triage/webhook_service.py")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Send mock alerts to Incident Response webhook")
    parser.add_argument("--type", choices=["memory", "db", "disk", "custom"], default="disk", help="Preset alert type")
    parser.add_argument("--name", default="", help="Custom alert name")
    parser.add_argument("--desc", default="", help="Custom alert description")
    parser.add_argument("--severity", default="High", choices=["Critical", "High", "Medium", "Low"])
    parser.add_argument("--service", default="api-gateway")
    parser.add_argument("--instance", default="")
    parser.add_argument("--host", default="http://localhost:8000")

    args = parser.parse_args()
    ts = int(time.time())
    instance = args.instance or f"node-{ts}"

    if args.type == "memory":
        send_alert("ContainerHighMemoryUsage", "Container checkout-worker memory utilization reached 96% with recurring OOM errors in Node.js event loop.", "Critical", "checkout-service", instance, args.host)
    elif args.type == "db":
        send_alert("PostgresPoolExhausted", "FATAL: remaining connection slots are reserved for non-replication superuser connections. Transactions timing out.", "Critical", "postgres-primary", instance, args.host)
    elif args.type == "disk":
        send_alert("DiskSpaceExhaustion", "Root volume partition /var/log is 94% full due to unrotated application log files.", "High", "api-gateway", instance, args.host)
    else:
        name = args.name or "CustomSystemAlert"
        desc = args.desc or "Unspecified system anomaly detected in production environment."
        send_alert(name, desc, args.severity, args.service, instance, args.host)


if __name__ == "__main__":
    main()
