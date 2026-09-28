#!/usr/bin/env python3
"""
Reference locker controller for one station (runs on a Raspberry Pi next to the lockers).

It polls the server for "open locker N" commands, pulses the lock, confirms the
command, and reports door-sensor changes. See docs/HARDWARE.md for the protocol.

NOT TESTED ON REAL HARDWARE. The `LockBoard` class is where the real lock
driver goes (GPIO relays for a small prototype, or an RS485 lock-control board
for a production locker bank). With DRY_RUN=1 it only prints what it would do.

    pip install requests
    SERVER=https://example.mk STATION=SK CONTROLLER_KEY=... DRY_RUN=1 python3 controller.py
"""

import os
import sys
import time

import requests

SERVER = os.environ.get("SERVER", "http://localhost:3000").rstrip("/")
STATION = os.environ.get("STATION", "SK")
KEY = os.environ.get("CONTROLLER_KEY", "")
DRY_RUN = os.environ.get("DRY_RUN", "1") == "1"
POLL_SECONDS = float(os.environ.get("POLL_SECONDS", "1"))
PULSE_SECONDS = 0.6  # how long the lock coil is energised

session = requests.Session()
session.headers["x-controller-key"] = KEY


class LockBoard:
    """Drives the physical locks and reads the door sensors."""

    def __init__(self):
        self.doors = {}  # locker number -> last known "open" state
        if not DRY_RUN:
            # Example for a small GPIO prototype (one relay + one reed switch per door):
            #   from gpiozero import OutputDevice, Button
            #   self.relays = {1: OutputDevice(17, active_high=False), ...}
            #   self.sensors = {1: Button(27), ...}
            raise SystemExit("Configure the real lock driver in LockBoard before turning DRY_RUN off.")

    def pulse(self, number: int):
        if DRY_RUN:
            print(f"[dry-run] open lock {number}")
            self.doors[number] = True
            return
        # relay = self.relays[number]; relay.on(); time.sleep(PULSE_SECONDS); relay.off()

    def read_doors(self) -> dict:
        """Return {number: is_open} for all doors (from the sensors)."""
        if DRY_RUN:
            return dict(self.doors)
        # return {n: not sensor.is_pressed for n, sensor in self.sensors.items()}
        return {}


def api(method: str, path: str, **kwargs):
    res = session.request(method, f"{SERVER}/api/hw/{STATION}{path}", timeout=5, **kwargs)
    res.raise_for_status()
    return res.json()


def main():
    if not KEY:
        sys.exit("CONTROLLER_KEY is required (printed by `npm run db:seed`).")
    board = LockBoard()
    last_doors = {}
    print(f"Controller for {STATION} → {SERVER} (dry run: {DRY_RUN})")
    while True:
        try:
            for cmd in api("GET", "/commands")["commands"]:
                if cmd["action"] == "OPEN":
                    board.pulse(cmd["lockerNumber"])
                api("POST", f"/commands/{cmd['id']}")
            doors = board.read_doors()
            for number, is_open in doors.items():
                if last_doors.get(number) != is_open:
                    api("POST", "/doors", json={"number": number, "open": is_open})
            last_doors = doors
        except requests.RequestException as err:
            # Server unreachable: keep trying. (Offline PIN checks are a planned feature.)
            print(f"network error: {err}", file=sys.stderr)
            time.sleep(5)
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
