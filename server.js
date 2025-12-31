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

async function refreshAccessToken() {
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
    console.error("Token refresh failed:", data);
    throw new Error("Zoho token refresh failed");
  }

  accessToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;
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
  res.send("Invictus Inquiry Backend is running 🚀");
});

/* =====================================
   SUBMIT INQUIRY API
===================================== */
app.post("/submit-inquiry", async (req, res) => {
  try {
    await ensureToken();

    /* 🔥 READ UPPERCASE BODY (EXACT ZOHO FIELD LINK NAMES) */
    const payload = {
      data: {
        Full_Name: req.body.Full_Name,
        Mobile_Number: req.body.Mobile_Number,
        Email_Address: req.body.Email_Address,
        Destination_Tour_Name: req.body.Destination_Tour_Name,
        Travel_Date: req.body.Travel_Date,            // YYYY-MM-DD
        Travel_Type: req.body.Travel_Type,            // EXACT picklist value
        Number_of_Travelers: Number(req.body.Number_of_Travelers),
        Message_Special_Request: req.body.Message_Special_Request,
        Terms_Accepted: "Yes"                          // Checkbox FIX
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
    console.log("ZOHO RESPONSE:", result);

    if (result?.data) {
      return res.json({
        status: "success",
        zoho_response: result
      });
    }

    return res.status(400).json({
      status: "error",
      zoho_response: result
    });

  } catch (error) {
    console.error(error);
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
  console.log(`Backend running on port ${PORT}`);
});
