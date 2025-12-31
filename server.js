import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

let accessToken = "";
let tokenExpiry = 0;

/* 🔁 Refresh Zoho Access Token */
async function refreshAccessToken() {
  const res = await fetch("https://accounts.zoho.in/oauth/v2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET,
      refresh_token: process.env.ZOHO_REFRESH_TOKEN
    })
  });

  const data = await res.json();
  accessToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;
}

/* ✅ Ensure Token Always Valid */
async function ensureToken() {
  if (!accessToken || Date.now() > tokenExpiry) {
    await refreshAccessToken();
  }
}

/* 📩 Inquiry Submit Endpoint */
app.post("/submit-inquiry", async (req, res) => {
  try {
    await ensureToken();

    const payload = {
      data: {
        ...req.body,
        terms_accepted: true
      }
    };

    const zohoRes = await fetch(
      `https://creator.zoho.com/api/v2/${process.env.ZOHO_OWNER}/${process.env.ZOHO_APP_LINK}/form/${process.env.ZOHO_FORM_LINK}`,
      {
        method: "POST",
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    const result = await zohoRes.json();

    if (result.code === 3000) {
      return res.json({ status: "success" });
    }

    res.status(400).json({ status: "error", result });

  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Backend running on port", PORT);
});
