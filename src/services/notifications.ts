// TraceXData True Local Engagement Notification System
// No cloud servers, completely client-side via LocalStorage & Browser Notification API.

export interface EngagementNotification {
  id: string;
  title: string;
  body: string;
}

const ENGAGEMENT_NOTIFICATIONS: EngagementNotification[] = [
  {
    id: "NODE_UPDATE",
    title: "⚡ TraceXData Nodes Active",
    body: "High-concurrency OSINT nodes are fully operational. Run a sub-second query now!"
  },
  {
    id: "IDENTITY_SHIELD",
    title: "🛡️ Security Notification",
    body: "Ensure your mobile or Telegram record is secured with TraceXData Lifetime Protection."
  },
  {
    id: "VEHICLE_OWNER",
    title: "🚗 Owner Lookup Online",
    body: "Check any vehicle number plate and get detailed owner intelligence instantly."
  },
  {
    id: "CREDITS_CHECK",
    title: "💼 Sub-second PAN Search",
    body: "Aadhaar-to-PAN linking and search services are optimized. Start tracing."
  },
  {
    id: "TELEGRAM_TRACE",
    title: "✈️ Telegram Intelligence",
    body: "High-precision lookup of active Telegram handles and registered alternates."
  },
  {
    id: "LIFETIME_VIP",
    title: "🔒 Lifetime VIP Active",
    body: "Elevate your search limit cap and bypass search queues. Check packages."
  },
  {
    id: "DAILY_SUMMARY",
    title: "📊 Intel Operations",
    body: "View live trending lookup logs and security statistics for today."
  },
  {
    id: "API_LIVE",
    title: "⚡ Professional API Live",
    body: "Integrate TraceXData's sub-second database directly into your own scripts."
  }
];

// Helper to get current local date string (YYYY-MM-DD)
const getTodayDateString = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Request Notification Permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
    console.warn("This browser does not support desktop notifications.");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  } catch (err) {
    console.error("Error requesting notification permission:", err);
    return false;
  }
};

// Check and trigger local notification if criteria are met:
// 1. Granted permission
// 2. 3 hours passed since the last notification was sent
// 3. Current notification ID hasn't been sent TODAY (resets daily)
export const checkAndTriggerNotification = () => {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const today = getTodayDateString();
  const lastSentStr = localStorage.getItem("tracex_notif_last_sent") || "0";
  const lastSentTime = parseInt(lastSentStr, 10);
  const now = Date.now();

  const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
  
  // Rule: Must wait at least 3 hours between any notifications
  if (now - lastSentTime < THREE_HOURS_MS) {
    console.log(`TraceX Notif: 3 hours have not elapsed. Next eligible in ${Math.ceil((THREE_HOURS_MS - (now - lastSentTime)) / 60000)} mins.`);
    return;
  }

  // Retrieve today's sent notifications list to avoid repeating
  let sentTodayList: string[] = [];
  try {
    const stored = localStorage.getItem("tracex_notif_sent_today");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.date === today) {
        sentTodayList = parsed.ids || [];
      }
    }
  } catch (err) {
    console.error("Error parsing notification registry:", err);
  }

  // Find an eligible notification that hasn't been sent today
  const eligible = ENGAGEMENT_NOTIFICATIONS.find(notif => !sentTodayList.includes(notif.id));

  if (!eligible) {
    console.log("TraceX Notif: All engagement alerts already shown today. Resetting tomorrow.");
    return;
  }

  // Trigger browser local notification
  try {
    const notification = new Notification(eligible.title, {
      body: eligible.body,
      icon: "/favicon.ico", // Fallback to icon
      tag: eligible.id, // Grouping
      requireInteraction: false
    });

    // Handle clicks to navigate back to the window if they click it
    notification.onclick = () => {
      window.focus();
    };

    // Save state to localStorage
    localStorage.setItem("tracex_notif_last_sent", now.toString());
    
    sentTodayList.push(eligible.id);
    localStorage.setItem("tracex_notif_sent_today", JSON.stringify({
      date: today,
      ids: sentTodayList
    }));

    console.log(`TraceX Notif Sent: [${eligible.id}] "${eligible.title}"`);
  } catch (err) {
    console.error("Failed to display native browser notification:", err);
  }
};

// Initialize Notification Engine
export const initNotificationEngine = () => {
  if (!("Notification" in window)) return;

  // Ask for permission gracefully on user action or simple load
  if (Notification.permission === "default") {
    // We delay the permission prompt slightly so it is not intrusive immediately
    setTimeout(() => {
      requestNotificationPermission().then(granted => {
        if (granted) {
          console.log("Notification permission granted!");
          // Trigger first one immediately on permission grant
          checkAndTriggerNotification();
        }
      });
    }, 8000);
  } else if (Notification.permission === "granted") {
    // Check immediately on app mount
    checkAndTriggerNotification();
  }

  // Check every 10 minutes (600,000 ms) while the tab is open to see if we reached the 3 hour threshold
  setInterval(() => {
    checkAndTriggerNotification();
  }, 10 * 60 * 1000);
};

// Force trigger a test notification for the user / debugging
export const triggerTestNotificationDirectly = async (): Promise<boolean> => {
  const allowed = await requestNotificationPermission();
  if (!allowed) return false;

  const randomIndex = Math.floor(Math.random() * ENGAGEMENT_NOTIFICATIONS.length);
  const sample = ENGAGEMENT_NOTIFICATIONS[randomIndex];

  try {
    new Notification(`[TEST] ${sample.title}`, {
      body: sample.body,
      icon: "/favicon.ico"
    });
    return true;
  } catch (err) {
    console.error("Error triggering test notification:", err);
    return false;
  }
};
