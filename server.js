import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

/* ===============================
   ZOHO TOKEN HANDLING
================================ */
let accessToken = "";
let tokenExpiry = 0;

async function refreshAccessToken() {
  console.log("🔄 Refreshing Zoho access token...");

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

  if (!data.access_token) {
    console.error("❌ Token error:", data);
    throw new Error("Token refresh failed");
  }

  accessToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;
  console.log("✅ Token updated");
}

async function ensureToken() {
  if (!accessToken || Date.now() >= tokenExpiry) {
    await refreshAccessToken();
  }
}

/* ===============================
   HEALTH CHECK
================================ */
app.get("/", (req, res) => {
  res.send("Invictus Inquiry Backend running 🚀");
});

/* ===============================
   SUBMIT INQUIRY
================================ */
app.post("/submit-inquiry", async (req, res) => {
  try {
    await ensureToken();

    /* 🔥 ZOHO CREATOR PAYLOAD (EXACT FORMAT) */
    const payload = {
      data: {
        Full_Name: {
          first_name: req.body.Full_Name || req.body.full_name,
          last_name: " "        // REQUIRED for Zoho Name field
        },
        Mobile_Number: String(req.body.Mobile_Number || req.body.mobile_number),
        Email_Address: req.body.Email_Address || req.body.email_address,
        Destination_Tour_Name: req.body.Destination_Tour_Name || req.body.destination_tour_name,
        Travel_Date: req.body.Travel_Date || req.body.travel_date,
        Travel_Type: req.body.Travel_Type || req.body.travel_type,
        Number_of_Travelers: Number(req.body.Number_of_Travelers || req.body.number_of_travelers),
        Message_Special_Request: req.body.Message_Special_Request || req.body.message_special_request,
        Terms_Accepted: "Yes"   // Checkbox MUST be "Yes"
      }
    };

    const zohoURL = `https://www.zohoapis.in/creator/v2/${process.env.ZOHO_OWNER}/${process.env.ZOHO_APP_LINK}/form/${process.env.ZOHO_FORM_LINK}/records`;

    const zohoRes = await fetch(zohoURL, {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await zohoRes.json();
    console.log("📦 ZOHO RESPONSE:", JSON.stringify(result, null, 2));

    if (result.code === 3000 || result.data) {
      return res.json({
        status: "success",
        message: "Inquiry submitted successfully",
        zoho: result
      });
    }

    return res.status(400).json({
      status: "error",
      zoho_response: result
    });

  } catch (err) {
    console.error("🔥 SERVER ERROR:", err);
    return res.status(500).json({
      status: "server_error",
      message: err.message
    });
  }
});

/* ===============================
   START SERVER
================================ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
