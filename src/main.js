import { FORM_URL } from "./config.js";

const iframe = document.getElementById("attendance-form");
const loading = document.getElementById("loading");

iframe.addEventListener("load", () => {
  loading.classList.add("hidden");
  iframe.classList.add("visible");
});

iframe.src = FORM_URL;
