import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

/* =====================================
   ZOHO TOKEN HANDLING
===================================== */
let accessToken = "";
let tokenExpiry = 0;

async function refreshAccessToken() {
  console.log("🔄 Refreshing Zoho token...");

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
    console.error("❌ Token Error:", data);
    throw new Error("Zoho token refresh failed");
  }

  accessToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;

  console.log("✅ Zoho token refreshed");
}

async function ensureToken() {
  if (!accessToken || Date.now() >= tokenExpiry) {
    await refreshAccessToken();
  }
}

/* =====================================
   HEALTH CHECK
===================================== */
app.get("/", (req, res) => {
  res.send("Invictus Inquiry Backend running 🚀");
});

/* =====================================
   SUBMIT INQUIRY API
===================================== */
app.post("/submit-inquiry", async (req, res) => {
  try {
    await ensureToken();

    /* ✅ ZOHO CREATOR PAYLOAD (CORRECT) */
    const payload = {
      data: {
        Full_Name: {
          first_name: req.body.Full_Name?.first_name || "Rahul",
          last_name: req.body.Full_Name?.last_name || "Test"
        },
        Mobile_Number: String(req.body.Mobile_Number),
        Email_Address: req.body.Email_Address,
        Destination_Tour_Name: req.body.Destination_Tour_Name,
        Travel_Date: req.body.Travel_Date,
        Travel_Type: req.body.Travel_Type,
        Number_of_Travelers: Number(req.body.Number_of_Travelers),
        Message_Special_Request: req.body.Message_Special_Request,
        Terms_Accepted: "Yes"
      }
    };

    /* ✅ CORRECT ZOHO CREATOR URL */
    const zohoURL =
  "https://www.zohoapis.in/creator/v2/rahulbpadaliya/invictus-experiences/form/Inquiry_Form/records";
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

    if (result.data) {
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

/* =====================================
   START SERVER
===================================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
