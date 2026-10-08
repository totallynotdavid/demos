import { ApiFailure, byId, request } from "./api.ts";

interface FormMeta {
  title: string;
  heading: string;
  details: string[];
}

const header = byId("event");
const heading = byId("event-heading");
const meta = byId("event-meta");
const loadError = byId("load-error");
const loadErrorText = byId("load-error-text");
const form = byId<HTMLFormElement>("attendance-form");
const nameInput = byId<HTMLInputElement>("field-name");
const nameError = byId("name-error");
const choiceError = byId("choice-error");
const submitError = byId("submit-error");
const submitButton = byId<HTMLButtonElement>("submit-btn");
const success = byId("success");

const SUBMIT_LABEL = submitButton.textContent?.trim() ?? "";

const choice = () =>
  form.querySelector<HTMLInputElement>('input[name="attendance"]:checked')
    ?.value as "yes" | "no" | undefined;

function show(error: HTMLElement, input: HTMLElement | null, visible: boolean) {
  error.hidden = !visible;
  input?.setAttribute("aria-invalid", String(visible));
}

async function loadEvent() {
  loadError.hidden = true;
  header.hidden = false;
  header.setAttribute("aria-busy", "true");
  try {
    const data = await request<FormMeta>("/api/form");
    document.title = data.title || document.title;
    heading.textContent = data.heading || data.title;
    meta.textContent = data.details.join(" · ");
    meta.hidden = data.details.length === 0;
    form.hidden = false;
  } catch (error) {
    header.hidden = true;
    form.hidden = true;
    loadErrorText.textContent = describeLoadFailure(error);
    loadError.hidden = false;
    byId("retry-btn").focus();
  } finally {
    header.removeAttribute("aria-busy");
  }
}

function describeLoadFailure(error: unknown) {
  if (error instanceof ApiFailure && error.code !== "network") {
    return error.message;
  }
  return "Revisa tu conexión e inténtalo de nuevo.";
}

function describeSubmitFailure(error: unknown) {
  if (error instanceof ApiFailure) {
    if (error.status === 400) return error.message;
    if (error.code === "form_rejected") {
      return "El formulario no está aceptando respuestas. Avisa a los organizadores.";
    }
  }
  return "No pudimos registrar tu respuesta. Revisa tu conexión e intenta de nuevo.";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = nameInput.value.trim();
  const attendance = choice();

  show(nameError, nameInput, !name);
  show(choiceError, null, !attendance);
  submitError.hidden = true;
  if (!name) return nameInput.focus();
  if (!attendance) return byId<HTMLInputElement>("attendance-yes").focus();

  submitButton.disabled = true;
  submitButton.setAttribute("aria-busy", "true");
  submitButton.textContent = "Enviando…";

  try {
    await request("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, attendance }),
    });
    byId("success-title").textContent =
      attendance === "yes" ? "Listo, te esperamos" : "Gracias por avisar";
    byId("success-text").textContent =
      attendance === "yes"
        ? "Tu asistencia quedó registrada."
        : "Registramos que no podrás asistir.";
    form.hidden = true;
    success.hidden = false;
    success.focus();
  } catch (error) {
    submitError.textContent = describeSubmitFailure(error);
    submitError.hidden = false;
  } finally {
    submitButton.disabled = false;
    submitButton.removeAttribute("aria-busy");
    submitButton.textContent = SUBMIT_LABEL;
  }
});

nameInput.addEventListener("input", () => show(nameError, nameInput, false));
// Only the radios clear the error: a change event from the name field fires
// on blur, and hiding the error then moves the submit button mid-click.
form.addEventListener("change", (event) => {
  if (
    event.target instanceof HTMLInputElement &&
    event.target.type === "radio"
  ) {
    show(choiceError, null, false);
  }
});

byId("retry-btn").addEventListener("click", loadEvent);
byId("again-btn").addEventListener("click", () => {
  form.reset();
  success.hidden = true;
  form.hidden = false;
  nameInput.focus();
});

loadEvent();
