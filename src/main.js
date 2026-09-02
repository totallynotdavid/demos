const form = document.getElementById("attendance-form");
const submitBtn = document.getElementById("submit-btn");
const choiceError = document.getElementById("choice-error");
const submitError = document.getElementById("submit-error");
const success = document.getElementById("success");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = document.getElementById("field-name").value.trim();
  const attendance = form.querySelector(
    'input[name="attendance"]:checked',
  )?.value;

  if (!attendance) {
    choiceError.hidden = false;
    return;
  }
  choiceError.hidden = true;
  submitError.hidden = true;
  submitBtn.disabled = true;
  submitBtn.textContent = "Enviando…";

  try {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, attendance }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error("registration failed");

    form.hidden = true;
    success.hidden = false;
  } catch {
    submitError.hidden = false;
    submitBtn.disabled = false;
    submitBtn.textContent = "Registrar asistencia";
  }
});
