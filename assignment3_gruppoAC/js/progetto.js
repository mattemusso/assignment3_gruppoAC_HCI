const euro = amount => new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0
}).format(Number(amount) || 0);

function readLocalStorage(key, fallback = []) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value ?? fallback;
  } catch (error) {
    console.error(`Errore lettura ${key}:`, error);
    return fallback;
  }
}

function saveLocalStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Errore salvataggio ${key}:`, error);
    return false;
  }
}

function calculateDays(deadline, fallbackDays) {
  if (!deadline) {
    return typeof fallbackDays === "number" ? fallbackDays : null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = new Date(`${deadline}T00:00:00`);

  if (Number.isNaN(end.getTime())) return null;

  return Math.ceil((end - today) / (1000 * 60 * 60 * 24));
}

function isProjectOwner(project) {
  try {
    const user = JSON.parse(localStorage.getItem("utenteAttivo") || "null");
    return Boolean(
        user?.email &&
        project.creator?.email &&
        user.email.toLowerCase() === project.creator.email.toLowerCase()
    );
  } catch {
    return false;
  }
}

function addProjectOwnerActions(project) {
  if (!isProjectOwner(project)) return;

  const title = document.getElementById("projectTitle");
  if (!title) return;

  const existingActions = document.querySelector(".project-owner-actions");
  if (existingActions) existingActions.remove();

  const actions = document.createElement("div");
  actions.className = "project-owner-actions";

  const editButton = document.createElement("a");
  editButton.className = "btn edit-project-btn";
  editButton.textContent = "Modifica progetto";
  editButton.href = `aggiungi.html?modifica=${encodeURIComponent(project.id)}`;

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "btn delete-project-btn";
  deleteButton.textContent = "Elimina progetto";

  deleteButton.addEventListener("click", () => {
    deleteUserProjectFromDetail(project);
  });

  actions.append(editButton, deleteButton);
  title.insertAdjacentElement("afterend", actions);
}

function deleteUserProjectFromDetail(project) {
  const user = readLocalStorage("utenteAttivo", null);

  if (
      !user?.email ||
      !project.creator?.email ||
      user.email.toLowerCase() !== project.creator.email.toLowerCase()
  ) {
    alert("Non puoi eliminare questo progetto.");
    return;
  }

  if (!confirm(`Vuoi eliminare "${project.title}"?`)) {
    return;
  }

  const projects = readLocalStorage("progettiUtente", []);
  const updatedProjects = projects.filter(item =>
      !(
          String(item.id) === String(project.id) &&
          item.creator?.email?.toLowerCase() === user.email.toLowerCase()
      )
  );

  if (!saveLocalStorage("progettiUtente", updatedProjects)) {
    alert("Non è stato possibile eliminare il progetto.");
    return;
  }

  const donations = readLocalStorage("storicoDonazioni", []);
  saveLocalStorage(
      "storicoDonazioni",
      donations.filter(donation => String(donation.progettoId) !== String(project.id))
  );

  window.location.href = "progetti.html";
}

async function loadProjectDetail() {
  const errorElement = document.getElementById("detailError");
  const detail = document.getElementById("projectDetail");

  const id = new URLSearchParams(window.location.search).get("id");

  try {
    if (!id) {
      throw new Error("Nessun progetto selezionato.");
    }

    const jsonProjects = window.progettiPredefiniti;

    if (!Array.isArray(jsonProjects)) {
      throw new Error(
          "I progetti predefiniti non sono stati caricati. Controlla progetti-dati.js e il suo collegamento nell'HTML."
      );
    }

    const userProjects = readLocalStorage("progettiUtente", []);
    const allProjects = [
      ...jsonProjects,
      ...(Array.isArray(userProjects) ? userProjects : [])
    ];

    const project = allProjects.find(item => String(item.id) === String(id));

    if (!project) {
      throw new Error("Progetto non trovato.");
    }

    // Normalizza numeri e categorie
    project.target = Number(project.target ?? project.goal ?? 0);
    project.raised = Number(project.raised) || 0;
    project.supporters = Number(project.supporters) || 0;

    const categoryColors = {
      ambiente: "green",
      cultura: "purple",
      tecnologia: "blue",
      sociale: "orange"
    };

    project.color = project.color || categoryColors[project.category] || "green";

    project.categoryLabel =
        project.categoryLabel ||
        ({
          ambiente: "Ambiente",
          cultura: "Cultura",
          tecnologia: "Tecnologia",
          sociale: "Sociale"
        }[project.category] || project.category || "Progetto");

    // Recupera le donazioni
    const allDonations = readLocalStorage("storicoDonazioni", []);
    const projectDonations = allDonations.filter(
        donation => donation.progetto === project.title || String(donation.progettoId) === String(project.id)
    );

    const extraRaised = projectDonations.reduce(
        (sum, donation) => sum + (Number(donation.importo) || 0),
        0
    );

    project.raised += extraRaised;
    project.supporters += projectDonations.length;

    const percent = project.target > 0
        ? Math.round((project.raised / project.target) * 100)
        : 0;

    const barWidth = Math.min(100, Math.max(0, percent));

    const days = calculateDays(project.deadline, project.giorni);
    const daysElement = document.getElementById("giorniMancanti");

    if (daysElement) {
      daysElement.textContent =
          days === null ? "Non specificata" :
              days <= 0 ? "Scaduta" :
                  days;
    }

    document.title = `${project.title} | UniTogether`;

    const setText = (elemId, value) => {
      const element = document.getElementById(elemId);
      if (element) {
        element.textContent = value ?? "";
      }
    };

    // 1. TITOLO
    setText("breadcrumbProjectTitle", project.title);
    setText("projectTitle", project.title);
    addProjectOwnerActions(project);
    setText("projectCategory", project.categoryLabel);

    // 2. SOTTOTITOLO (per progetti utente usa subtitle, per JSON usa eyebrow)
    const subtitleEl = document.getElementById("projectSubtitle");
    const subtitleText = project.subtitle || project.eyebrow || "";
    if (subtitleEl) {
      subtitleEl.textContent = subtitleText;
      subtitleEl.hidden = !subtitleText;
    }

    // 3. LA NOSTRA IDEA -> ci va quello che c'è in Descrizione breve (shortDescription)
    // (Se è un progetto del JSON che non ha shortDescription, usa description)
    setText("projectIdea", project.shortDescription || project.description || "");

    // 4. DESCRIZIONE COMPLETA -> ci va il racconto del progetto (description)
    // (Se è un progetto del JSON che aveva il testo lungo in idea, mostra quello)
    setText("projectDescription", project.description && project.shortDescription ? project.description : (project.idea || project.description || ""));

    const websiteContainer = document.getElementById("projectWebsiteContainer");
    const websiteButton = document.getElementById("projectWebsite");
    const website = project.website?.trim();

    if (websiteContainer && websiteButton && website) {
      websiteButton.href = /^https?:\/\//i.test(website)
          ? website
          : `https://${website}`;

      websiteContainer.hidden = false;
    } else if (websiteContainer) {
      websiteContainer.hidden = true;
    }

    // 5. CHI C'È DIETRO -> ci va il Team
    setText("projectTeam", project.team || project.creator?.nome || "Non specificato");

    // 6. IMPATTO -> ci va Impatto atteso (impact)
    const impactSection = document.getElementById("impactSection");
    const impactText = project.impact || (Array.isArray(project.fundUses) ? project.fundUses.join(" ") : "");
    if (impactSection) {
      if (impactText) {
        setText("projectImpact", impactText);
        impactSection.hidden = false;
      } else {
        setText("projectImpact", "Non specificato");
      }
    }

    // Dati raccolta
    setText("raisedAmount", euro(project.raised));
    setText("targetAmount", euro(project.target));
    setText("supporterCount", project.supporters);

    let statusLabel = project.statusLabel;
    if (!statusLabel) {
      if (days !== null && days <= 0) {
        statusLabel = "Campagna conclusa";
      } else if (project.status === "completato") {
        statusLabel = "Obiettivo raggiunto";
      } else {
        statusLabel = "Raccolta attiva";
      }
    }
    setText("projectStatus", statusLabel);

    const progressBar = document.getElementById("progressBar");
    if (progressBar) {
      progressBar.style.width = `${barWidth}%`;
    }

    setText("progressLabel", `${percent}% dell'obiettivo raggiunto`);

    // Immagine di copertina o riquadro categoria nel dettaglio
    const image = document.getElementById("detailImage");
    if (image) {
      image.replaceChildren();

      if (project.image) {
        image.className = "project-image detail-image";
        image.style.backgroundImage = `url("${project.image}")`;
        image.style.backgroundSize = "cover";
        image.style.backgroundPosition = "center";
        image.style.backgroundRepeat = "no-repeat";
      } else {
        image.className = `project-image project-image-${project.color} detail-image`;
        image.style.backgroundImage = "";

        const categoryBadge = document.createElement("span");
        categoryBadge.className = "project-category-badge";
        categoryBadge.textContent = (project.categoryLabel || project.category || "Progetto").toUpperCase();
        image.append(categoryBadge);
      }
    }

    setupDonationLogic(project);

    const button = document.getElementById("supportButton");
    const donationFormContainer = document.getElementById("donationFormContainer");

    const campaignEnded = project.status === "completato" || (days !== null && days <= 0);

    if (button && donationFormContainer) {
      if (campaignEnded) {
        button.disabled = true;
        button.textContent = "Campagna conclusa";
      } else {
        button.onclick = event => {
          event.preventDefault();

          const activeUser = localStorage.getItem("utenteAttivo");
          if (!activeUser) {
            const message = document.getElementById("supportMessage") || document.getElementById("donationMessage");
            if (message) {
              message.textContent = "Per sostenere il progetto, devi prima accedere.";
              message.style.color = "#c64e45";
            }
            return;
          }

          const visible = donationFormContainer.style.display === "block";
          donationFormContainer.style.display = visible ? "none" : "block";
        };
      }
    }

    if (detail) {
      detail.hidden = false;
    }

  } catch (error) {
    console.error("Caricamento dettaglio non riuscito:", error);
    if (errorElement) {
      errorElement.hidden = false;
      errorElement.textContent = "Non è stato possibile caricare il progetto. Riprova più tardi.";
    }
  }
}

function setupDonationLogic(project) {
  const donationForm = document.getElementById("donationForm");
  const amountButtons = document.querySelectorAll(".amount-btn");
  const amountInput = document.getElementById("donationAmount");
  const donationMessage = document.getElementById("donationMessage");
  const anonymousCheckbox = document.getElementById("anonimoDonation");

  if (!donationForm || !amountInput) return;

  amountButtons.forEach(button => {
    button.addEventListener("click", () => {
      amountButtons.forEach(item => item.classList.remove("active"));
      button.classList.add("active");
      amountInput.value = button.dataset.amount;
    });
  });

  donationForm.onsubmit = event => {
    event.preventDefault();

    const importo = Number(amountInput.value);

    if (!Number.isFinite(importo) || importo <= 0) {
      donationMessage.textContent = "Inserisci un importo valido.";
      donationMessage.style.color = "#c64e45";
      return;
    }

    const activeUser = localStorage.getItem("utenteAttivo");
    if (!activeUser) {
      donationMessage.textContent = "Per donare devi prima accedere.";
      donationMessage.style.color = "#c64e45";
      return;
    }

    let user = {};
    try {
      user = JSON.parse(activeUser);
    } catch {
      donationMessage.textContent = "Sessione utente non valida. Effettua nuovamente l'accesso.";
      donationMessage.style.color = "#c64e45";
      return;
    }

    const nomeDonatore = anonymousCheckbox?.checked ? "Utente Anonimo" : (user.nome || "Utente");
    const donations = readLocalStorage("storicoDonazioni", []);

    donations.push({
      progetto: project.title,
      progettoId: project.id,
      donatore: nomeDonatore,
      importo: importo,
      data: new Date().toISOString()
    });

    if (!saveLocalStorage("storicoDonazioni", donations)) {
      donationMessage.textContent = "Non è stato possibile salvare la donazione.";
      donationMessage.style.color = "#c64e45";
      return;
    }

    project.raised += importo;
    project.supporters += 1;

    const percent = project.target > 0
        ? Math.round((project.raised / project.target) * 100)
        : 0;

    const barWidth = Math.min(100, Math.max(0, percent));

    const raisedElement = document.getElementById("raisedAmount");
    const supportersElement = document.getElementById("supporterCount");
    const progressBar = document.getElementById("progressBar");
    const progressLabel = document.getElementById("progressLabel");

    if (raisedElement) raisedElement.textContent = euro(project.raised);
    if (supportersElement) supportersElement.textContent = project.supporters;
    if (progressBar) progressBar.style.width = `${barWidth}%`;
    if (progressLabel) progressLabel.textContent = `${percent}% dell'obiettivo raggiunto`;

    // Chiude il box del form
    const container = document.getElementById("donationFormContainer");
    if (container) container.style.display = "none";

    // Pulisce eventuali messaggi di errore interni al form
    donationMessage.textContent = "";

    // Mostra il messaggio carino fuori dal box (sotto il bottone Sostieni)
    const supportMessage = document.getElementById("supportMessage");
    if (supportMessage) {
      supportMessage.textContent = `Grazie ${nomeDonatore}! Donazione di ${euro(importo)} effettuata con successo!`;
      supportMessage.style.color = "#66863d";
      supportMessage.style.fontWeight = "700";
      supportMessage.style.marginTop = "14px";
      supportMessage.style.textAlign = "center";
    }

    donationForm.reset();
    amountButtons.forEach(button => button.classList.remove("active"));


  };
}

loadProjectDetail();