const FORM_ACTION =
  "https://docs.google.com/forms/d/e/1FAIpQLSc502LnDGVBT-jffPbDCqDwSADyBWauWaWlPeljPMURz9eSFg/formResponse";

const FIELD_NAME = "entry.856162853";
const FIELD_ATTENDANCE = "entry.51289651";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false });
    return;
  }

  const { name, attendance } = req.body || {};

  if (attendance !== "Sí" && attendance !== "No") {
    res.status(400).json({ ok: false });
    return;
  }

  const body = new URLSearchParams({
    [FIELD_NAME]: name,
    [FIELD_ATTENDANCE]: attendance,
  });

  const googleRes = await fetch(FORM_ACTION, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!googleRes.ok) {
    res.status(502).json({ ok: false });
    return;
  }

  res.status(200).json({ ok: true });
};
