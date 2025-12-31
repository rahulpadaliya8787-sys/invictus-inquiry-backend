import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

/* =====================================
   ZOHO ACCESS TOKEN HANDLING
===================================== */
let accessToken = "";
let tokenExpiry = 0;

// Refresh Zoho Access Token using Refresh Token
async function refreshAccessToken() {
  console.log("🔄 Refreshing Zoho access token...");

  const res = await fetch("https://accounts.zoho.in/oauth/v2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET,
      refresh_token: process.env.ZOHO_REFRESH_TOKEN
    })
  });

  const data = await res.json();

  if (!data.access_token) {
    console.error("❌ Token refresh failed:", data);
    throw new Error("Zoho token refresh failed");
  }

  accessToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;

  console.log("✅ Zoho access token updated");
}

// Ensure token is valid
async function ensureToken() {
  if (!accessToken || Date.now() >= tokenExpiry) {
    await refreshAccessToken();
  }
}

/* =====================================
   HEALTH CHECK
===================================== */
app.get("/", (req, res) => {
  res.send("Invictus Inquiry Backend is running 🚀");
});

/* =====================================
   SUBMIT INQUIRY API
===================================== */
app.post("/submit-inquiry", async (req, res) => {
  try {
    console.log("📩 Incoming data:", req.body);

    await ensureToken();

    // 🔥 Zoho Creator payload (field link names MUST match)
    const payload = {
      data: {
        full_name: req.body.full_name,
        mobile_number: req.body.mobile_number,
        email_address: req.body.email_address,
        destination_tour_name: req.body.destination_tour_name,
        travel_date: req.body.travel_date,
        travel_type: req.body.travel_type,
        number_of_travelers: req.body.number_of_travelers,
        message_special_request: req.body.message_special_request
      }
    };

    const zohoURL = `https://creator.zoho.in/api/v2/${process.env.ZOHO_OWNER}/${process.env.ZOHO_APP_LINK}/form/${process.env.ZOHO_FORM_LINK}`;

    const zohoRes = await fetch(zohoURL, {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await zohoRes.json();

    console.log("📦 ZOHO RESPONSE:", result);

    // ✅ SUCCESS
    if (result.code === 3000) {
      return res.json({ status: "success" });
    }

    // ❌ ZOHO ERROR (send back for debugging)
    return res.json({
      status: "zoho_error",
      zoho: result
    });

  } catch (error) {
    console.error("🔥 SERVER ERROR:", error);
    return res.status(500).json({
      status: "server_error",
      message: "Internal Server Error"
    });
  }
});

/* =====================================
   START SERVER
===================================== */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
