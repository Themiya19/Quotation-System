"use client";

import { useEffect, useRef, useCallback } from "react";
import Cookies from "js-cookie";
import { SESSION_TIMEOUT_MINUTES } from "@/lib/sessionConfig";

const SESSION_TIMEOUT_MS = SESSION_TIMEOUT_MINUTES * 60 * 1000;
const LAST_ACTIVITY_KEY = "lastActivityTimestamp";

export default function SessionTimeout() {
  const timer = useRef<NodeJS.Timeout | null>(null);

  const logout = useCallback(() => {
    Cookies.remove("userEmail");
    Cookies.remove("accessType");
    Cookies.remove("internalType");
    Cookies.remove("externalType");
    Cookies.remove("department");
    Cookies.remove("company");
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    window.location.href = "/login";
  }, []);

  const resetTimer = useCallback(() => {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(logout, SESSION_TIMEOUT_MS);
  }, [logout]);

  useEffect(() => {
    const userEmail = Cookies.get("userEmail");
    if (!userEmail) return;

    // On mount, check if the session should be expired
    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (lastActivity) {
      const elapsed = Date.now() - parseInt(lastActivity, 10);
      if (elapsed > SESSION_TIMEOUT_MS) {
        logout();
        return;
      }
    }

    const events = ["mousemove", "keydown", "mousedown", "touchstart", "scroll"];
    events.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [logout, resetTimer]);

  return null;
}