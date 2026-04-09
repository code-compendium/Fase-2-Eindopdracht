// ============================================
// STATE
// De enige bron van waarheid voor de app.
// Alle UI wordt hier vanuit opgebouwd.
// ============================================
let taken = [];
let huidigFilter = "all"; // "all" | "open" | "afgerond"

// ============================================
// STORAGE
// Lezen en schrijven naar LocalStorage.
// Altijd JSON.stringify/parse omdat LocalStorage
// alleen strings accepteert.
// ============================================
function laadTaken() {
  try {
    const opgeslagen = localStorage.getItem("taken");
    return opgeslagen ? JSON.parse(opgeslagen) : [];
  } catch {
    // Beschermt tegen corrupte of niet-parseerbare data
    return [];
  }
}

function slaaTakenOp() {
  try {
    localStorage.setItem("taken", JSON.stringify(taken));
  } catch (fout) {
    console.error("LocalStorage schrijven mislukt:", fout);
  }
}

// ============================================
// FILTERS
// Puur - geeft altijd een nieuwe array terug,
// past de originele `taken` array nooit aan.
// ============================================
function filterTaken(taken, filter) {
  if (filter === "open") return taken.filter(t => !t.afgerond);
  if (filter === "afgerond") return taken.filter(t => t.afgerond);
  return taken; // "all"
}

function legeStaatTekst(filter) {
  if (filter === "open") return "Geen openstaande taken. Goed bezig!";
  if (filter === "afgerond") return "Nog geen afgeronde taken.";
  return "Geen taken. Voeg er een toe hierboven!";
}

// ============================================
// RENDER
// Tekent de volledige UI opnieuw vanuit de state.
// Wordt aangeroepen na elke state-wijziging.
// ============================================
function render() {
  const zichtbareTaken = filterTaken(taken, huidigFilter);
  renderTakenLijst(zichtbareTaken);
  renderTeller();
  renderLegeStaat(zichtbareTaken);
  renderFilterKnoppen();
  renderWisAfgerondKnop();
}

function renderTakenLijst(zichtbareTaken) {
  const lijst = document.getElementById("taken-lijst");

  // map() bouwt de HTML op als array, join("") zet het samen
  lijst.innerHTML = zichtbareTaken
    .map(taak => `
      <li
        class="taak-item${taak.afgerond ? " taak-item--afgerond" : ""}"
        data-id="${taak.id}"
      >
        <input
          type="checkbox"
          class="taak-checkbox"
          id="taak-${taak.id}"
          ${taak.afgerond ? "checked" : ""}
          aria-label="Markeer '${escapeHtml(taak.tekst)}' als ${taak.afgerond ? "open" : "afgerond"}"
        />
        <label class="taak-label" for="taak-${taak.id}">
          <span class="taak-tekst">${escapeHtml(taak.tekst)}</span>
        </label>
        <button
          class="btn btn--icon taak-verwijder"
          data-actie="verwijder"
          aria-label="Verwijder '${escapeHtml(taak.tekst)}'"
          title="Verwijder taak"
        >
          &#10005;
        </button>
      </li>
    `)
    .join("");
}

function renderTeller() {
  const teller = document.querySelector(".app-teller");
  const aantalOpen = taken.filter(t => !t.afgerond).length;
  const totaal = taken.length;

  if (totaal === 0) {
    teller.textContent = "";
    return;
  }

  // some() - zijn er nog openstaande taken?
  const heeftOpenTaken = taken.some(t => !t.afgerond);

  // every() - zijn alle taken afgerond?
  const alleAfgerond = taken.every(t => t.afgerond);

  if (alleAfgerond) {
    teller.textContent = "Alles afgerond!";
  } else {
    teller.textContent = `${aantalOpen} van ${totaal} ${aantalOpen === 1 ? "taak" : "taken"} open`;
  }
}

function renderLegeStaat(zichtbareTaken) {
  const legeStaat = document.getElementById("lege-staat");
  const legeStaatTekstEl = document.getElementById("lege-staat__tekst");

  if (zichtbareTaken.length === 0) {
    legeStaat.hidden = false;
    legeStaatTekstEl.textContent = legeStaatTekst(huidigFilter);
  } else {
    legeStaat.hidden = true;
  }
}

function renderFilterKnoppen() {
  document.querySelectorAll(".filter-btn").forEach(knop => {
    const isActief = knop.dataset.filter === huidigFilter;
    knop.classList.toggle("filter-btn--active", isActief);
    knop.setAttribute("aria-pressed", isActief);
  });
}

function renderWisAfgerondKnop() {
  const knop = document.getElementById("wis-afgerond-btn");
  const heeftAfgerond = taken.some(t => t.afgerond);
  knop.disabled = !heeftAfgerond;
  knop.style.opacity = heeftAfgerond ? "1" : "0.4";
}

// ============================================
// ACTIES
// Elke actie: pas de state aan, sla op, render.
// State wordt nooit direct gemuteerd -
// altijd een nieuwe array via map/filter/spread.
// ============================================
function voegTaakToe(tekst) {
  const getrimde = tekst.trim();
  if (!getrimde) return;

  const nieuweTaak = {
    id: Date.now(),   // Unieke id via timestamp - nooit de array index
    tekst: getrimde,
    afgerond: false,
  };

  taken = [...taken, nieuweTaak]; // Spread - geen directe mutatie
  slaaTakenOp();
  render();
}

function toggleTaak(id) {
  // findIndex() om de taak op id te vinden
  const index = taken.findIndex(t => t.id === id);
  if (index === -1) return;

  // map() maakt een nieuwe array - de gevonden taak wordt vervangen
  taken = taken.map(t =>
    t.id === id ? { ...t, afgerond: !t.afgerond } : t
  );
  slaaTakenOp();
  render();
}

function verwijderTaak(id) {
  // filter() maakt een nieuwe array zonder de verwijderde taak
  taken = taken.filter(t => t.id !== id);
  slaaTakenOp();
  render();
}

function wisAfgerond() {
  taken = taken.filter(t => !t.afgerond);
  slaaTakenOp();
  render();
}

function setFilter(filter) {
  huidigFilter = filter;
  render();
}

// ============================================
// HULPFUNCTIES
// ============================================

// Voorkomt XSS bij het invoegen van gebruikerstekst als HTML
function escapeHtml(tekst) {
  const div = document.createElement("div");
  div.textContent = tekst;
  return div.innerHTML;
}

// ============================================
// EVENT LISTENERS
// ============================================

// Formulier - taak toevoegen via Enter of knopklik
const form = document.getElementById("invoer-form");
form.addEventListener("submit", (event) => {
  event.preventDefault(); // Voorkomt paginaherlaad
  const invoerVeld = document.getElementById("taak-invoer");
  voegTaakToe(invoerVeld.value);
  invoerVeld.value = "";
  invoerVeld.focus(); // Focus terug naar het invoerveld
});

// Takenlijst - event delegation voor toggle en verwijder
// Eén listener op de lijst in plaats van per taak
const takenLijst = document.getElementById("taken-lijst");
takenLijst.addEventListener("click", (event) => {
  // Verwijderknop geklikt
  const verwijderKnop = event.target.closest("[data-actie='verwijder']");
  if (verwijderKnop) {
    const taakItem = verwijderKnop.closest("[data-id]");
    verwijderTaak(Number(taakItem.dataset.id));
    return;
  }

  // Checkbox geklikt
  const checkbox = event.target.closest(".taak-checkbox");
  if (checkbox) {
    const taakItem = checkbox.closest("[data-id]");
    toggleTaak(Number(taakItem.dataset.id));
  }
});

// Filterbalk - event delegation voor filterknoppen
const filterBar = document.querySelector(".filter-bar");
filterBar.addEventListener("click", (event) => {
  const knop = event.target.closest(".filter-btn");
  if (!knop) return;
  setFilter(knop.dataset.filter);
});

// Wis afgerond knop
document.getElementById("wis-afgerond-btn").addEventListener("click", () => {
  const aantalAfgerond = taken.filter(t => t.afgerond).length;
  if (aantalAfgerond === 0) return;
  wisAfgerond();
});

// ============================================
// INITIALISATIE
// Laad bestaande taken uit LocalStorage
// en render de UI voor het eerst.
// ============================================
taken = laadTaken();
render();
