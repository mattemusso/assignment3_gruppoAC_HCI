const searchInput = document.getElementById("searchProject");
const categoryFilter = document.getElementById("categoryFilter");
const statusFilter = document.getElementById("statusFilter");
const projectGrid = document.getElementById("projectGrid");
const resultCount = document.getElementById("resultCount");
const emptyState = document.getElementById("emptyState");
const loadError = document.getElementById("loadError");

let allProjects = [];

const euro = amount => new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0
}).format(Number(amount) || 0);

const escapeClass = value =>
    String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "");

const categoryLabels = {
  ambiente: "Ambiente",
  cultura: "Cultura",
  tecnologia: "Tecnologia",
  sociale: "Sociale"
};

const categoryColors = {
  ambiente: "green",
  cultura: "purple",
  tecnologia: "blue",
  sociale: "orange"
};

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

function deleteUserProject(projectId) {
  const user = JSON.parse(localStorage.getItem("utenteAttivo") || "null");
  if (!user?.email) return;

  const projects = JSON.parse(localStorage.getItem("progettiUtente") || "[]");
  const project = projects.find(item =>
      String(item.id) === String(projectId) &&
      item.creator?.email?.toLowerCase() === user.email.toLowerCase()
  );

  if (!project) {
    alert("Non puoi eliminare questo progetto.");
    return;
  }

  if (!confirm(`Vuoi eliminare il progetto "${project.title}"?`)) {
    return;
  }

  const updatedProjects = projects.filter(item =>
      !(
          String(item.id) === String(projectId) &&
          item.creator?.email?.toLowerCase() === user.email.toLowerCase()
      )
  );

  localStorage.setItem("progettiUtente", JSON.stringify(updatedProjects));

  const donations = JSON.parse(localStorage.getItem("storicoDonazioni") || "[]");
  localStorage.setItem(
      "storicoDonazioni",
      JSON.stringify(donations.filter(donation => String(donation.progettoId) !== String(projectId)))
  );

  loadProjects();
}

// CREA LA MINICARD DEL PROGETTO
function createProjectCard(project) {
  const article = document.createElement("article");
  article.className = "project-card";
  article.dataset.category = project.category || "";
  article.dataset.status = project.status || "";

  // Immagine o riquadro categoria
  // Immagine o riquadro categoria
  const image = document.createElement("div");

  if (project.image) {
    // Mette l'immagine come sfondo dello stesso identico riquadro, senza testo categoria
    image.className = "project-image";
    image.style.backgroundImage = `url("${project.image}")`;
    image.style.backgroundSize = "cover";
    image.style.backgroundPosition = "center";
    image.style.backgroundRepeat = "no-repeat";
    image.setAttribute("role", "img");
    image.setAttribute("aria-label", `Copertina di ${project.title}`);
  } else {
    // Riquadro colorato classico con scritta della categoria
    image.className = `project-image project-image-${escapeClass(project.color || "green")}`;
    image.setAttribute("role", "img");
    image.setAttribute("aria-label", `Immagine del progetto ${project.title}`);

    const categoryLabel = document.createElement("span");
    categoryLabel.textContent =
        project.categoryLabel ||
        categoryLabels[project.category] ||
        project.category ||
        "Progetto";

    image.append(categoryLabel);
  }

  // Contenuto minicard
  const content = document.createElement("div");
  content.className = "project-content";

  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent =
      project.eyebrow ||
      project.subtitle ||
      project.categoryLabel ||
      categoryLabels[project.category] ||
      "Progetto universitario";

  // 1. TITOLO
  const title = document.createElement("h2");
  title.textContent = project.title || "Progetto senza titolo";

  // 2. DESCRIZIONE BREVE (priorità a shortDescription!)
  const description = document.createElement("p");
  description.textContent =
      project.shortDescription ||
      project.description ||
      project.subtitle ||
      "";

  // 3. BARRA
  const progress = document.createElement("div");
  progress.className = "progress-track";

  const progressBar = document.createElement("span");
  const target = Number(project.target) || 0;
  const raisedAmount = Number(project.raised) || 0;

  const percent = target > 0
      ? Math.round((raisedAmount / target) * 100)
      : 0;

  progressBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
  progress.append(progressBar);

  // 4. SOLDI
  const amounts = document.createElement("p");
  const raised = document.createElement("strong");
  raised.textContent = euro(raisedAmount);

  amounts.append(
      raised,
      document.createTextNode(` raccolti su ${euro(target)}`)
  );

  // 5. PERCENTUALE
  const percentage = document.createElement("small");
  percentage.textContent = `${percent}% dell'obiettivo raggiunto`;

  // 6. BOTTONE DETTAGLIO
  const link = document.createElement("a");
  link.href = `progetto.html?id=${encodeURIComponent(project.id)}`;
  link.className = "btn primary-btn";
  link.textContent = "Dettaglio progetto";

  content.append(
      eyebrow,
      title,
      description,
      progress,
      amounts,
      percentage,
      link
  );

  if (isProjectOwner(project)) {
    const actions = document.createElement("div");
    actions.className = "project-owner-actions";

    const editButton = document.createElement("a");
    editButton.className = "btn edit-project-btn";
    editButton.textContent = "Modifica";
    editButton.href = `aggiungi.html?modifica=${encodeURIComponent(project.id)}`;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "btn delete-project-btn";
    deleteButton.textContent = "Elimina";

    deleteButton.addEventListener("click", () => {
      deleteUserProject(project.id);
    });

    actions.append(editButton, deleteButton);
    content.append(actions);
  }

  article.append(image, content);
  return article;
}

function renderProjects() {
  const term = searchInput.value.trim().toLocaleLowerCase("it");
  const category = categoryFilter.value;
  const status = statusFilter.value;

  const filtered = allProjects.filter(project => {
    const searchable = [
      project.title,
      project.subtitle,
      project.description,
      project.shortDescription,
      project.category,
      project.categoryLabel,
      project.eyebrow,
      project.team,
      project.university
    ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("it");

    return searchable.includes(term)
        && (!category || project.category === category)
        && (!status || project.status === status);
  });

  projectGrid.replaceChildren(...filtered.map(createProjectCard));

  resultCount.textContent = `${filtered.length} ${
      filtered.length === 1 ? "progetto trovato" : "progetti trovati"
  }`;

  emptyState.hidden = filtered.length !== 0;
}

async function loadProjects() {
  loadError.hidden = true;

  try {
    const projectsFromJson = window.progettiPredefiniti;

    if (!Array.isArray(projectsFromJson)) {
      throw new Error(
          "I progetti predefiniti non sono stati caricati. Controlla progetti-dati.js e il suo collegamento nell'HTML."
      );
    }

    let userProjects = [];
    try {
      const savedProjects = JSON.parse(localStorage.getItem("progettiUtente") || "[]");
      if (Array.isArray(savedProjects)) {
        userProjects = savedProjects;
      }
    } catch (error) {
      console.error("Errore lettura progetti utente:", error);
    }

    const normalizedUserProjects = userProjects.map(project => ({
      ...project,
      id: String(project.id),
      target: Number(project.target ?? project.goal ?? 0),
      raised: Number(project.raised) || 0,
      supporters: Number(project.supporters) || 0,
      color: project.color || categoryColors[project.category] || "green",
      categoryLabel: project.categoryLabel || categoryLabels[project.category] || project.category
    }));

    const normalizedJsonProjects = projectsFromJson.map(project => ({
      ...project,
      id: String(project.id),
      target: Number(project.target ?? project.goal ?? 0),
      raised: Number(project.raised) || 0,
      supporters: Number(project.supporters) || 0,
      color: project.color || categoryColors[project.category] || "green",
      categoryLabel: project.categoryLabel || categoryLabels[project.category] || project.category
    }));

    const projects = [...normalizedJsonProjects, ...normalizedUserProjects];

    let allDonations = [];
    try {
      const savedDonations = JSON.parse(localStorage.getItem("storicoDonazioni") || "[]");
      if (Array.isArray(savedDonations)) {
        allDonations = savedDonations;
      }
    } catch (error) {
      console.error("Errore lettura donazioni:", error);
    }

    allProjects = projects.map(project => {
      const projectDonations = allDonations.filter(
          donation => donation.progetto === project.title || String(donation.progettoId) === String(project.id)
      );

      const extraRaised = projectDonations.reduce(
          (sum, donation) => sum + (Number(donation.importo) || 0),
          0
      );

      return {
        ...project,
        target: Number(project.target) || 0,
        raised: (Number(project.raised) || 0) + extraRaised,
        supporters: (Number(project.supporters) || 0) + projectDonations.length
      };
    });

    categoryFilter.replaceChildren();
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Tutte le categorie";
    categoryFilter.append(defaultOption);

    const categories = [...new Set(allProjects.map(p => p.category).filter(Boolean))];
    categories.forEach(category => {
      const project = allProjects.find(item => item.category === category);
      const option = document.createElement("option");
      option.value = category;
      option.textContent = project.categoryLabel || categoryLabels[category] || category;
      categoryFilter.append(option);
    });

    renderProjects();

  } catch (error) {
    console.error("Caricamento progetti non riuscito:", error);
    loadError.hidden = false;
    resultCount.textContent = "";
    projectGrid.replaceChildren();
    emptyState.hidden = true;
  }
}

searchInput.addEventListener("input", renderProjects);
categoryFilter.addEventListener("change", renderProjects);
statusFilter.addEventListener("change", renderProjects);

loadProjects();