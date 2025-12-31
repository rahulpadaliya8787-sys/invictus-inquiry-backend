
app.post("/submit-inquiry", async (req, res) => {
  try {
    await ensureToken();

    const payload = {
      data: [ req.body ]
    };

    const zohoRes = await fetch(zohoUrl, {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await zohoRes.json();

    console.log("🔥 ZOHO RESPONSE:", result); // 🔥 THIS LINE

    if (result.code === 3000) {
      return res.json({ status: "success" });
    }

    return res.status(400).json({ status: "error", zoho: result });

  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error" });
  }
});
