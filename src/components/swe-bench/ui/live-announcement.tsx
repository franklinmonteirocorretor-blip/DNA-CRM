"use client";

// Live Announcements — accessibility helper
// Dispatches filter/sort/pagination changes to screen readers

import { useEffect } from "react";

interface AnnouncementProps {
  message: string;
  trigger: string; // dependency: change identifier
}

export function LiveAnnouncement({ message, trigger }: AnnouncementProps) {
  useEffect(() => {
    const region = document.getElementById("swe-bench-announcements");
    if (region) {
      region.textContent = message;
    }
  }, [message, trigger]);

  return null;
}