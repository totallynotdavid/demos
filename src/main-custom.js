import { FORM_ACTION, FIELD_NAME, FIELD_ATTENDANCE } from "./config-custom.js";

const form = document.getElementById("attendance-form");
const nameInput = document.getElementById("field-name");
const attendanceInputs = document.querySelectorAll(".field-attendance");
const choiceError = document.getElementById("choice-error");
const submitBtn = form.querySelector(".submit-btn");
const successState = document.getElementById("success");
const iframe = document.getElementById("hidden-submit-target");

nameInput.name = FIELD_NAME;
attendanceInputs.forEach((input) => {
  input.name = FIELD_ATTENDANCE;
});

form.action = FORM_ACTION;
form.method = "POST";
form.target = iframe.name;

// The cross-origin iframe response cannot verify the submission.
// Ignore its initial load. A later load is only a best-effort success signal.
let submissionPending = false;

iframe.addEventListener("load", () => {
  if (!submissionPending) return;
  submissionPending = false;
  form.hidden = true;
  successState.hidden = false;
});

form.addEventListener("submit", (event) => {
  const attendanceChosen = Array.from(attendanceInputs).some(
    (input) => input.checked,
  );

  if (!attendanceChosen) {
    event.preventDefault();
    choiceError.hidden = false;
    return;
  }

  choiceError.hidden = true;
  submissionPending = true;
  submitBtn.disabled = true;
  submitBtn.textContent = "Enviando…";
});
