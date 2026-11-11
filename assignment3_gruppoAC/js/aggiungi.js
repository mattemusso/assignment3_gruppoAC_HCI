
document.addEventListener("DOMContentLoaded", () => {

    // CONTROLLO UTENTE AUTENTICATO
    const utenteSalvato = localStorage.getItem("utenteAttivo");

    if (!utenteSalvato) {
        alert("Per gestire un progetto devi prima accedere.");
        window.location.href = "login.html?ruolo=progettista";
        return;
    }

    let utente;

    try {
        utente = JSON.parse(utenteSalvato);
    } catch {
        localStorage.removeItem("utenteAttivo");
        window.location.href = "login.html";
        return;
    }

    if (!utente || !utente.email) {
        window.location.href = "login.html";
        return;
    }

    const form = document.getElementById("projectForm");
    const panels = [...document.querySelectorAll(".wizard-panel")];
    const steps = [...document.querySelectorAll(".wizard-step")];

    const previousButton = document.getElementById("previousStep");
    const nextButton = document.getElementById("nextStep");
    const submitButton = document.getElementById("submitProject");

    const progressBar = document.getElementById("progressBar");
    const progressPercentage = document.getElementById("progressPercentage");

    const draftStatus = document.getElementById("draftStatus");
    const formMessage = document.getElementById("formMessage");

    const draftKey = "bozzaProgetto_" + utente.email;
    const projectsKey = "progettiUtente";

    // Controlla se siamo in modalità modifica
    const editId = new URLSearchParams(window.location.search)
        .get("modifica");

    let editingProject = null;
    let currentStep = 0;
    let imageBase64 = "";

    const titles = [
        ["PASSAGGIO 1 DI 5", "Presenta la tua idea", "Cominciamo dalle informazioni principali."],
        ["PASSAGGIO 2 DI 5", "Definisci il tuo obiettivo", "Scegli la categoria e stabilisci quanto vuoi raccogliere."],
        ["PASSAGGIO 3 DI 5", "Racconta la tua storia", "Spiega perché il tuo progetto merita di essere sostenuto."],
        ["PASSAGGIO 4 DI 5", "Aggiungi le immagini", "Un'immagine efficace aiuta a raccontare la tua idea."],
        ["PASSAGGIO 5 DI 5", "Controlla il progetto", "Verifica che tutte le informazioni siano corrette."]
    ];

    const fields = [
        "projectTitle",
        "projectSubtitle",
        "projectUniversity",
        "projectLocation",
        "projectTeam",
        "projectGoal",
        "projectDeadline",
        "projectBeneficiaries",
        "projectShortDescription",
        "projectDescription",
        "projectImpact",
        "projectWebsite"
    ];

    // RECUPERA I PROGETTI SALVATI
    function getProjects() {
        try {
            const projects = JSON.parse(
                localStorage.getItem(projectsKey) || "[]"
            );

            return Array.isArray(projects) ? projects : [];
        } catch {
            return [];
        }
    }

    // CARICA IL PROGETTO DA MODIFICARE
    function loadProjectForEditing() {
        if (!editId) return false;

        const projects = getProjects();

        editingProject = projects.find(project =>
            String(project.id) === String(editId)
        );

        if (!editingProject) {
            alert("Il progetto da modificare non è stato trovato.");
            window.location.href = "progetti.html";
            return false;
        }

        // Controlla che il progetto appartenga all'utente
        if (
            !editingProject.creator?.email ||
            editingProject.creator.email.toLowerCase() !==
            utente.email.toLowerCase()
        ) {
            alert("Non sei autorizzato a modificare questo progetto.");
            window.location.href = "progetti.html";
            return false;
        }

        // Compila automaticamente tutti i campi
        const values = {
            projectTitle: editingProject.title,
            projectSubtitle: editingProject.subtitle,
            projectUniversity: editingProject.university,
            projectLocation: editingProject.location,
            projectTeam: editingProject.team,
            projectGoal: editingProject.goal ?? editingProject.target,
            projectDeadline: editingProject.deadline,
            projectBeneficiaries: editingProject.beneficiaries,
            projectShortDescription: editingProject.shortDescription,
            projectDescription: editingProject.description,
            projectImpact: editingProject.impact,
            projectWebsite: editingProject.website
        };

        fields.forEach(id => {
            const input = document.getElementById(id);

            if (input) {
                input.value = values[id] ?? "";
            }
        });

        // Seleziona la categoria esistente
        if (editingProject.category) {
            const categoryRadio = document.querySelector(
                `input[name="category"][value="${editingProject.category}"]`
            );

            if (categoryRadio) {
                categoryRadio.checked = true;
            }
        }

        // Recupera l'immagine già caricata
        imageBase64 = editingProject.image || "";

        if (imageBase64) {
            showImage(imageBase64);
        }

        // Cambia il testo del pulsante finale
        submitButton.textContent = "Salva modifiche";

        // Aggiorna il titolo della pagina
        document.title = "Modifica progetto | UniTogether";

        document.getElementById("stepTitle").textContent =
            "Modifica il tuo progetto";

        draftStatus.textContent = "Stai modificando un progetto esistente";

        updateCounters();

        return true;
    }

    function showStep(index) {
        currentStep = index;

        panels.forEach((panel, i) => {
            panel.classList.toggle("active", i === index);
        });

        steps.forEach((step, i) => {
            step.classList.toggle("active", i === index);
            step.classList.toggle("completed", i < index);
        });

        const percentage = Math.round(
            ((index + 1) / panels.length) * 100
        );

        progressBar.style.width = percentage + "%";
        progressPercentage.textContent = percentage + "%";

        document.getElementById("stepEyebrow").textContent =
            titles[index][0];

        document.getElementById("stepTitle").textContent =
            editId && index === 0
                ? "Modifica il tuo progetto"
                : titles[index][1];

        document.getElementById("stepDescription").textContent =
            titles[index][2];

        previousButton.hidden = index === 0;
        nextButton.hidden = index === panels.length - 1;
        submitButton.hidden = index !== panels.length - 1;

        if (index === 4) createReview();

        formMessage.textContent = "";

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    function getCategory() {
        return document.querySelector(
            'input[name="category"]:checked'
        )?.value || "";
    }

    function validateStep(index) {
        let valid = true;
        const panel = panels[index];

        panel.querySelectorAll(".field-error").forEach(error => {
            error.textContent = "";
        });

        panel.querySelectorAll(".invalid").forEach(input => {
            input.classList.remove("invalid");
        });

        function errorFor(input, message) {
            input.classList.add("invalid");

            const error = input.closest(".field-group")
                ?.querySelector(".field-error");

            if (error) error.textContent = message;

            valid = false;
        }

        if (index === 0) {
            ["projectTitle", "projectUniversity", "projectLocation"]
                .forEach(id => {
                    const input = document.getElementById(id);

                    if (!input.value.trim()) {
                        errorFor(input, "Questo campo è obbligatorio.");
                    }
                });

            const titleInput = document.getElementById("projectTitle");

            if (titleInput.value.trim().length < 3) {
                errorFor(titleInput, "Inserisci almeno 3 caratteri.");
            }
        }

        if (index === 1) {
            if (!getCategory()) {
                document.getElementById("categoryError").textContent =
                    "Seleziona una categoria.";

                valid = false;
            }

            const goal = document.getElementById("projectGoal");
            const deadline = document.getElementById("projectDeadline");

            if (!goal.value || Number(goal.value) <= 0) {
                errorFor(goal, "Inserisci un obiettivo economico valido.");
            }

            if (
                !deadline.value ||
                deadline.value <= new Date().toISOString().slice(0, 10)
            ) {
                errorFor(deadline, "La scadenza deve essere futura.");
            }
        }

        if (index === 2) {
            ["projectShortDescription", "projectDescription"]
                .forEach(id => {
                    const input = document.getElementById(id);

                    if (!input.value.trim()) {
                        errorFor(input, "Questo campo è obbligatorio.");
                    }
                });
        }

        return valid;
    }

    function getData() {
        const data = {};

        fields.forEach(id => {
            const input = document.getElementById(id);
            data[id] = input.value.trim();
        });

        data.category = getCategory();
        data.image = imageBase64;

        return data;
    }

    // SALVATAGGIO BOZZA
    function saveDraft() {
        // Durante la modifica non sovrascrive la bozza personale
        if (editId) return;

        try {
            localStorage.setItem(
                draftKey,
                JSON.stringify(getData())
            );

            draftStatus.textContent = "✓ Bozza salvata";
        } catch {
            draftStatus.textContent = "Impossibile salvare la bozza";
        }
    }

    // RECUPERO BOZZA
    function loadDraft() {
        if (editId) return;

        const saved = localStorage.getItem(draftKey);

        if (!saved) return;

        try {
            const data = JSON.parse(saved);

            fields.forEach(id => {
                const input = document.getElementById(id);

                if (input && data[id] !== undefined) {
                    input.value = data[id];
                }
            });

            if (data.category) {
                const radio = document.querySelector(
                    `input[name="category"][value="${data.category}"]`
                );

                if (radio) radio.checked = true;
            }

            if (data.image) {
                imageBase64 = data.image;
                showImage(data.image);
            }

            updateCounters();
            draftStatus.textContent = "✓ Bozza recuperata";

        } catch {
            localStorage.removeItem(draftKey);
        }
    }

    function updateCounters() {
        document.getElementById("shortCount").textContent =
            document.getElementById("projectShortDescription").value.length;

        document.getElementById("descriptionCount").textContent =
            document.getElementById("projectDescription").value.length;
    }

    function showImage(source) {
        const preview = document.getElementById("imagePreview");

        preview.replaceChildren();

        const image = document.createElement("img");
        image.src = source;
        image.alt = "Anteprima copertina del progetto";

        preview.appendChild(image);

        document.getElementById("removeImage").hidden = false;
    }

    // RIEPILOGO
    function createReview() {
        const data = getData();
        const review = document.getElementById("projectReview");

        const categoryNames = {
            ambiente: "Ambiente",
            cultura: "Cultura",
            tecnologia: "Tecnologia",
            sociale: "Sociale"
        };

        const entries = [
            ["Titolo", data.projectTitle],
            ["Sottotitolo", data.projectSubtitle],
            ["Università", data.projectUniversity],
            ["Località", data.projectLocation],
            ["Team", data.projectTeam],
            ["Categoria", categoryNames[data.category] || "—"],
            [
                "Obiettivo economico",
                data.projectGoal
                    ? Number(data.projectGoal).toLocaleString("it-IT", {
                        style: "currency",
                        currency: "EUR"
                    })
                    : "—"
            ],
            ["Scadenza", data.projectDeadline],
            ["Destinatari", data.projectBeneficiaries],
            ["Descrizione breve", data.projectShortDescription],
            ["Descrizione completa", data.projectDescription],
            ["Impatto", data.projectImpact],
            ["Sito web", data.projectWebsite]
        ];

        review.replaceChildren();

        entries.forEach(([label, value]) => {
            const item = document.createElement("div");
            item.className = "review-item";

            const small = document.createElement("small");
            small.textContent = label;

            const strong = document.createElement("strong");
            strong.textContent = value || "Non specificato";

            item.append(small, strong);
            review.appendChild(item);
        });

        if (imageBase64) {
            const image = document.createElement("img");

            image.src = imageBase64;
            image.alt = "Copertina";
            image.className = "review-image";

            review.appendChild(image);
        }
    }

    // NAVIGAZIONE TRA PASSAGGI
    nextButton.addEventListener("click", () => {
        if (!validateStep(currentStep)) return;

        saveDraft();

        showStep(Math.min(currentStep + 1, panels.length - 1));
    });

    previousButton.addEventListener("click", () => {
        showStep(Math.max(currentStep - 1, 0));
    });

    steps.forEach(step => {
        step.addEventListener("click", () => {
            const target = Number(step.dataset.step);

            if (target <= currentStep) {
                showStep(target);
                return;
            }

            if (validateStep(currentStep)) {
                saveDraft();
                showStep(target);
            }
        });
    });

    // SALVATAGGIO AUTOMATICO
    form.querySelectorAll("input, textarea").forEach(input => {
        input.addEventListener("input", () => {
            updateCounters();
            saveDraft();
        });

        input.addEventListener("change", saveDraft);
    });

    document.getElementById("projectShortDescription")
        .addEventListener("input", updateCounters);

    document.getElementById("projectDescription")
        .addEventListener("input", updateCounters);

    // IMMAGINE
    document.getElementById("projectImage")
        .addEventListener("change", event => {
            const file = event.target.files[0];

            if (!file) return;

            if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                alert("Formato non supportato.");
                event.target.value = "";
                return;
            }

            if (file.size > 2 * 1024 * 1024) {
                alert("L'immagine non può superare 2 MB.");
                event.target.value = "";
                return;
            }

            const reader = new FileReader();

            reader.onload = () => {
                imageBase64 = reader.result;
                showImage(imageBase64);
                saveDraft();
            };

            reader.readAsDataURL(file);
        });

    document.getElementById("removeImage")
        .addEventListener("click", () => {
            imageBase64 = "";

            document.getElementById("projectImage").value = "";

            document.getElementById("imagePreview").innerHTML =
                "<span>📷</span><p>L'anteprima della tua immagine apparirà qui.</p>";

            document.getElementById("removeImage").hidden = true;

            saveDraft();
        });

    // INVIO O AGGIORNAMENTO PROGETTO
    form.addEventListener("submit", event => {
        event.preventDefault();

        if (
            !validateStep(0) ||
            !validateStep(1) ||
            !validateStep(2)
        ) {
            formMessage.textContent =
                "Controlla i passaggi precedenti: ci sono ancora informazioni mancanti.";

            return;
        }

        const confirmCheckbox = document.getElementById("confirmProject");

        if (!confirmCheckbox.checked) {
            document.getElementById("confirmError").textContent =
                "Devi confermare che le informazioni sono corrette.";

            return;
        }

        const data = getData();
        const projects = getProjects();

        try {

            if (editId) {
                // MODIFICA PROGETTO ESISTENTE
                const index = projects.findIndex(project =>
                    String(project.id) === String(editId) &&
                    project.creator?.email?.toLowerCase() ===
                    utente.email.toLowerCase()
                );

                if (index === -1) {
                    formMessage.textContent =
                        "Non è stato possibile trovare il progetto da modificare.";

                    return;
                }

                const oldProject = projects[index];

                projects[index] = {
                    ...oldProject,

                    title: data.projectTitle,
                    subtitle: data.projectSubtitle,
                    university: data.projectUniversity,
                    location: data.projectLocation,
                    team: data.projectTeam,
                    category: data.category,
                    goal: Number(data.projectGoal),
                    deadline: data.projectDeadline,
                    beneficiaries: data.projectBeneficiaries,
                    shortDescription: data.projectShortDescription,
                    description: data.projectDescription,
                    impact: data.projectImpact,
                    image: data.image,
                    website: data.projectWebsite

                    // ID, proprietario, raccolta, sostenitori,
                    // stato e data di creazione restano invariati.
                };

            } else {
                // CREAZIONE NUOVO PROGETTO
                const newProject = {
                    id: "utente-" + Date.now(),

                    title: data.projectTitle,
                    subtitle: data.projectSubtitle,
                    university: data.projectUniversity,
                    location: data.projectLocation,
                    team: data.projectTeam,
                    category: data.category,
                    goal: Number(data.projectGoal),
                    deadline: data.projectDeadline,
                    beneficiaries: data.projectBeneficiaries,
                    shortDescription: data.projectShortDescription,
                    description: data.projectDescription,
                    impact: data.projectImpact,
                    image: data.image,
                    website: data.projectWebsite,

                    raised: 0,
                    supporters: 0,

                    status: "in_attesa",
                    createdAt: new Date().toISOString(),

                    creator: {
                        nome: utente.nome,
                        email: utente.email
                    }
                };

                projects.push(newProject);
            }

            // SALVA I DATI
            localStorage.setItem(
                projectsKey,
                JSON.stringify(projects)
            );

            if (!editId) {
                localStorage.removeItem(draftKey);
            }

        } catch (error) {
            console.error("Errore salvataggio progetto:", error);

            formMessage.textContent =
                "Spazio di archiviazione insufficiente. Prova a rimuovere l'immagine.";

            return;
        }

        formMessage.style.color = "var(--success, #27864B)";

        formMessage.textContent = editId
            ? "Modifiche salvate correttamente!"
            : "Progetto inviato correttamente! È stato salvato in attesa di revisione.";

        submitButton.disabled = true;

        setTimeout(() => {
            window.location.href = editId
                ? `progetto.html?id=${encodeURIComponent(editId)}`
                : "progetti.html";
        }, 1500);
    });

    // AVVIO
    if (editId) {
        if (!loadProjectForEditing()) return;
    } else {
        loadDraft();
        updateCounters();
    }

    showStep(0);

});
