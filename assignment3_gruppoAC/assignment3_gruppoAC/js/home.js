document.addEventListener("DOMContentLoaded", async () => {

    const grid = document.getElementById("homeProjectGrid");

    const totalRaisedEl = document.getElementById("totalRaised");
    const totalProjectsEl = document.getElementById("totalProjects");
    const totalSupportersEl = document.getElementById("totalSupporters");

    if (!grid) return;

    const euro = new Intl.NumberFormat("it-IT", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0
    });

    const compact = new Intl.NumberFormat("it-IT", {
        notation: "compact",
        maximumFractionDigits: 1
    });

    const categoryColors = {
        ambiente: "green",
        cultura: "purple",
        tecnologia: "blue",
        sociale: "orange"
    };

    try {
        let projects = window.progettiPredefiniti;

        if (!Array.isArray(projects)) {
            throw new Error(
                "I progetti predefiniti non sono stati caricati. Controlla progetti-dati.js e il suo collegamento nell'HTML."
            );
        }

        projects = [...projects];

        let userProjects = [];
        try {
            const savedProjects = JSON.parse(localStorage.getItem("progettiUtente") || "[]");
            if (Array.isArray(savedProjects)) {
                userProjects = savedProjects;
            }
        } catch (err) {
            console.error("Errore lettura progetti utente in home:", err);
        }

        projects = [...projects, ...userProjects];

        const tutteLeDonazioni = JSON.parse(localStorage.getItem("storicoDonazioni") || "[]");

        projects = projects.map(project => {
            const donazioniDelProgetto = tutteLeDonazioni.filter(
                d => d.progetto === project.title || String(d.progettoId) === String(project.id)
            );
            const extraRaccolto = donazioniDelProgetto.reduce((sum, d) => sum + (Number(d.importo) || 0), 0);

            return {
                ...project,
                target: Number(project.target ?? project.goal ?? 0),
                raised: (Number(project.raised) || 0) + extraRaccolto,
                supporters: (Number(project.supporters) || 0) + donazioniDelProgetto.length
            };
        });

        const raisedTotal = projects.reduce((sum, p) => sum + p.raised, 0);
        const supportersTotal = projects.reduce((sum, p) => sum + p.supporters, 0);

        if (totalRaisedEl) totalRaisedEl.textContent = compact.format(raisedTotal);
        if (totalProjectsEl) totalProjectsEl.textContent = projects.length.toLocaleString("it-IT");
        if (totalSupportersEl) totalSupportersEl.textContent = compact.format(supportersTotal);

        const featuredProjects = projects.slice(0, 3);
        grid.replaceChildren();

        if (featuredProjects.length === 0) {
            grid.textContent = "Al momento non ci sono progetti da mostrare.";
            return;
        }

        featuredProjects.forEach((project) => {
            const raised = project.raised;
            const target = project.target;

            const percentage = target > 0 ? Math.round((raised / target) * 100) : 0;
            const barWidth = Math.min(100, Math.max(0, percentage));

            const visual = project.color || categoryColors[project.category] || "green";
            const category = project.categoryLabel || project.category || "PROGETTO";

            const card = document.createElement("article");
            card.className = "project-card";

            const image = document.createElement("div");

            if (project.image) {
                image.className = "project-image has-cover";
                const imgEl = document.createElement("img");
                imgEl.src = project.image;
                imgEl.alt = `Copertina di ${project.title}`;
                imgEl.className = "cover-img";
                image.appendChild(imgEl);
            } else {
                image.className = `project-image project-image-${visual}`;
                const categoryLabel = document.createElement("span");
                categoryLabel.textContent = category;
                image.appendChild(categoryLabel);
            }

            const content = document.createElement("div");
            content.className = "project-content";

            const eyebrow = document.createElement("p");
            eyebrow.className = "eyebrow";
            eyebrow.textContent = project.eyebrow || project.subtitle || category;

            const title = document.createElement("h3");
            title.textContent = project.title || "Progetto senza titolo";

            const description = document.createElement("p");
            description.textContent = project.shortDescription || project.description || "";

            const progress = document.createElement("div");
            progress.className = "progress-track";
            progress.setAttribute("aria-hidden", "true");

            const progressBar = document.createElement("span");
            progressBar.className = `w-${barWidth}`;
            progress.appendChild(progressBar);

            const amounts = document.createElement("p");
            amounts.className = "funding";

            const raisedStrong = document.createElement("strong");
            raisedStrong.textContent = euro.format(raised);

            amounts.append(
                raisedStrong,
                document.createTextNode(` raccolti su ${euro.format(target)}`)
            );

            const percentSmall = document.createElement("small");
            percentSmall.className = "percent-label";
            percentSmall.textContent = `${percentage}% dell'obiettivo raggiunto`;

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
                percentSmall,
                link
            );

            card.append(image, content);
            grid.appendChild(card);
        });

    } catch (error) {
        console.error("Errore nel caricamento dei progetti:", error);
        grid.replaceChildren();
        const errorMessage = document.createElement("p");
        errorMessage.textContent = "Impossibile caricare i progetti. Controlla progetti-dati.js e il suo collegamento nell'HTML.";
        grid.appendChild(errorMessage);
    }
});