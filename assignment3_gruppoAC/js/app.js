document.addEventListener("DOMContentLoaded", () => {

    // MOSTRA / NASCONDI PASSWORD
    document.querySelectorAll(".show-password").forEach(button => {
        button.addEventListener("click", () => {
            const input = document.getElementById(button.dataset.target);
            const visible = input.type === "password";

            input.type = visible ? "text" : "password";
            button.textContent = visible ? "Nascondi" : "Mostra";
        });
    });


    const params = new URLSearchParams(window.location.search);
    const ruoloRichiesto = params.get("ruolo");

    if (ruoloRichiesto) {
        const roleControl = document.querySelector(
            '[name="ruolo"], [name="role"], #role'
        );

        if (roleControl) {
            roleControl.value = ruoloRichiesto;
            roleControl.dispatchEvent(new Event("change", { bubbles: true }));
        }
    }

    // CAMBIO TIPO DI LOGIN
    const roles = {
        progettista: {
            title: "Login progettista",
            description: "Accedi per gestire i tuoi progetti e le tue campagne.",
            button: "Accedi come progettista"
        },
        partner: {
            title: "Login Partner",
            description: "Accedi per seguire i progetti e le collaborazioni.",
            button: "Accedi come partner"
        },
        manager: {
            title: "Login Campaign manager",
            description: "Accedi per gestire e monitorare le campagne.",
            button: "Accedi come campaign manager"
        }
    };

    document.querySelectorAll(".role").forEach(button => {
        button.addEventListener("click", () => {
            document.querySelectorAll(".role").forEach(role => {
                role.classList.remove("active");
            });

            button.classList.add("active");

            const data = roles[button.dataset.role];

            document.getElementById("loginTitle").textContent = data.title;
            document.getElementById("loginDescription").textContent = data.description;
            document.getElementById("loginButtonText").textContent = data.button;
            document.getElementById("loginMessage").textContent = "";
        });
    });

    // ==========================================
    // GESTIONE NAVBAR UTENTE LOGGATO
    // ==========================================
    const utenteLoggato = localStorage.getItem("utenteAttivo");
    if (utenteLoggato) {
        try {
            const utente = JSON.parse(utenteLoggato);
            const mainNavContainer = document.getElementById("mainNav") || document.querySelector("nav");

            document.querySelectorAll("a[href*='login.html'], a[href*='registrazione.html']").forEach(el => el.remove());

            if (mainNavContainer) {
                const iniziale = utente.nome ? utente.nome.charAt(0).toUpperCase() : "U";

                const profileDropdown = document.createElement("div");
                profileDropdown.className = "partner-dropdown user-dropdown";
                profileDropdown.innerHTML = `
                    <button class="partner-btn profile-main-btn" id="profileBtn" aria-expanded="false">
                        <span class="profile-icon">${iniziale}</span> 
                        <span>Ciao, ${utente.nome}</span> 
                        <span>▾</span>
                    </button>
                    <div class="partner-menu" id="profileMenu">
                        <a href="errore.html">Gestione profilo</a>
                        <a href="#" id="logoutBtn">Logout</a>
                    </div>
                `;

                mainNavContainer.appendChild(profileDropdown);

                const profileBtn = document.getElementById("profileBtn");
                const profileMenu = document.getElementById("profileMenu");

                profileBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const isOpen = profileMenu.classList.toggle("active");
                    profileBtn.setAttribute("aria-expanded", isOpen);
                });

                document.addEventListener("click", (e) => {
                    if (!profileDropdown.contains(e.target)) {
                        profileMenu.classList.remove("active");
                        profileBtn.setAttribute("aria-expanded", "false");
                    }
                });

                document.getElementById("logoutBtn").addEventListener("click", (e) => {
                    e.preventDefault();
                    localStorage.removeItem("utenteAttivo");
                    window.location.href = "index.html";
                });
            }
        } catch (err) {
            console.error("Errore utente loggato", err);
        }
    }

    // VALIDAZIONE REGISTRAZIONE
    const form = document.getElementById("registrationForm");

    if (form) {
        const nome = document.getElementById("nome");
        const cognome = document.getElementById("cognome");
        const email = document.getElementById("email");
        const username = document.getElementById("username");
        const password = document.getElementById("password");
        const confirm = document.getElementById("confirmPassword");
        const terms = document.getElementById("terms");

        const rules = {
            length: value => value.length >= 8,
            upper: value => /[A-Z]/.test(value),
            lower: value => /[a-z]/.test(value),
            number: value => /[0-9]/.test(value),
            special: value => /[^A-Za-z0-9]/.test(value)
        };

        function showError(input, message, valid = false) {
            const group = input.closest(".form-group");
            const error = group.querySelector(".error");

            error.textContent = message;

            input.classList.toggle("invalid", Boolean(message));
            input.classList.toggle("valid", valid && !message);
        }

        function validate(input) {
            const value = input.value.trim();
            let message = "";
            let valid = value.length > 0;

            if (input === nome || input === cognome) {
                if (!value) message = "Questo campo è obbligatorio.";
                else if (value.length < 2) message = "Inserisci almeno 2 caratteri.";
            }

            if (input === email) {
                if (!value) message = "Inserisci la tua email.";
                else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
                    message = "Inserisci un indirizzo email valido.";
                }
            }

            if (input === username) {
                if (!value) {
                    message = "Inserisci uno username.";
                } else if (!/^[A-Za-z0-9._-]{3,24}$/.test(value)) {
                    message = "Usa 3-24 caratteri: lettere, numeri, . _ -";
                }
            }

            if (input === password) {
                Object.entries(rules).forEach(([name, test]) => {
                    const passed = test(input.value);
                    const rule = document.querySelector(`[data-rule="${name}"]`);

                    if (rule) {
                        rule.classList.toggle("passed", passed);
                        rule.textContent = (passed ? "✓ " : "○ ") +
                            rule.textContent.replace(/^[✓○]\s*/, "");
                    }
                });

                valid = Object.values(rules).every(test => test(input.value));

                if (!input.value) {
                    message = "Inserisci una password.";
                } else if (!valid) {
                    message = "Completa tutti i requisiti della password.";
                }
            }

            if (input === confirm) {
                if (!input.value) {
                    message = "Conferma la password.";
                } else if (input.value !== password.value) {
                    message = "Le password non coincidono.";
                }
            }

            showError(input, message, valid);
            return !message && valid;
        }

        [nome, cognome, email, username, password, confirm].forEach(input => {
            input.addEventListener("input", () => {
                validate(input);

                if (input === password && confirm.value) {
                    validate(confirm);
                }
            });

            input.addEventListener("blur", () => {
                if (input.value) validate(input);
            });
        });

        terms.addEventListener("change", () => {
            document.getElementById("termsError").textContent =
                terms.checked ? "" : "Devi accettare le condizioni.";
        });

        form.addEventListener("submit", event => {
            event.preventDefault();

            const validFields = [
                nome, cognome, email, username, password, confirm
            ].map(validate).every(Boolean);

            const validTerms = terms.checked;

            document.getElementById("termsError").textContent =
                validTerms ? "" : "Devi accettare le condizioni.";

            const message = document.getElementById("registrationMessage");

            if (validFields && validTerms) {
                const nuovoUtente = {
                    nome: nome.value.trim(),
                    cognome: cognome.value.trim(),
                    username: username.value.trim(),
                    email: email.value.trim().toLowerCase(),
                    password: password.value.trim()
                };

                localStorage.setItem("accountRegistrato", JSON.stringify(nuovoUtente));

                message.textContent = "Registrazione completata con successo! Reindirizzamento al login...";
                message.style.color = "#66863d";

                setTimeout(() => {
                    window.location.href = "login.html";
                }, 1200);
            } else {
                message.textContent =
                    "Controlla i campi evidenziati prima di continuare.";

                const firstInvalid = form.querySelector(".invalid");
                if (firstInvalid) firstInvalid.focus();
            }
        });
    }

    // VALIDAZIONE LOGIN & SALVATAGGIO UTENTE ATTIVO
    const loginForm = document.getElementById("loginForm");

    if (loginForm) {
        const user = document.getElementById("loginUser");
        const password = document.getElementById("loginPassword");

        function validateLogin(input) {
            const group = input.closest(".form-group");
            const error = group.querySelector(".error");
            const value = input.value.trim();
            let message = "";

            if (!value) {
                message = "Questo campo è obbligatorio.";
            } else if (
                input === user &&
                value.includes("@") &&
                !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
            ) {
                message = "Inserisci un indirizzo email valido.";
            }

            error.textContent = message;
            input.classList.toggle("invalid", Boolean(message));
            input.classList.toggle("valid", !message);

            return !message;
        }

        [user, password].forEach(input => {
            input.addEventListener("input", () => validateLogin(input));
            input.addEventListener("blur", () => validateLogin(input));
        });

        loginForm.addEventListener("submit", event => {
            event.preventDefault();

            const valid = [user, password]
                .map(validateLogin)
                .every(Boolean);

            const message = document.getElementById("loginMessage");

            if (!valid) {
                message.textContent = "Correggi i campi evidenziati.";
                message.style.color = "#c64e45";
                return;
            }

            const accountSalvato = localStorage.getItem("accountRegistrato");
            const userVal = user.value.trim().toLowerCase();
            const passVal = password.value.trim();

            if (!accountSalvato) {
                message.textContent = "Nessun account trovato. Registrati prima!";
                message.style.color = "#c64e45";
                return;
            }

            const utenteRegistrato = JSON.parse(accountSalvato);
            const isUserValid = (userVal === utenteRegistrato.email || userVal === utenteRegistrato.username.toLowerCase() || userVal === utenteRegistrato.nome.toLowerCase());
            const isPassValid = (passVal === utenteRegistrato.password);

            if (!isUserValid || !isPassValid) {
                message.textContent = "Credenziali errate o utente non registrato.";
                message.style.color = "#c64e45";
                return;
            }

            const utenteAttivo = {
                nome: utenteRegistrato.nome,
                email: utenteRegistrato.email
            };

            localStorage.setItem("utenteAttivo", JSON.stringify(utenteAttivo));

            message.textContent = "Login effettuato con successo! Reindirizzamento...";
            message.style.color = "#66863d";

            setTimeout(() => {
                window.location.href = "index.html";
            }, 1000);
        });

        document.getElementById("forgotPassword").addEventListener("click", event => {
            event.preventDefault();
            document.getElementById("loginMessage").textContent =
                "La procedura di recupero password deve essere configurata dal supporto.";
        });
    }

});



const partnerBtn = document.getElementById("partnerBtn");
const partnerMenu = document.getElementById("partnerMenu");

if (partnerBtn && partnerMenu) {

    partnerBtn.addEventListener("click", function (e) {
        e.stopPropagation();

        const isOpen = partnerMenu.classList.toggle("active");

        partnerBtn.setAttribute("aria-expanded", isOpen);

        if (!isOpen) {
            closeSubmenus();
        }
    });

    const submenuButtons = document.querySelectorAll(".submenu-btn");

    submenuButtons.forEach(function (button) {

        button.addEventListener("click", function (e) {
            e.stopPropagation();

            const currentSubmenu =
                button.nextElementSibling;

            const isOpen =
                currentSubmenu.classList.contains("active");

            closeSubmenus();

            if (!isOpen) {
                currentSubmenu.classList.add("active");
                button.setAttribute("aria-expanded", "true");
            }
        });

    });

    function closeSubmenus() {
        document.querySelectorAll(".partner-submenu").forEach(
            function (submenu) {
                submenu.classList.remove("active");
            }
        );

        document.querySelectorAll(".submenu-btn").forEach(
            function (button) {
                button.setAttribute("aria-expanded", "false");
            }
        );
    }

    document.addEventListener("click", function (e) {
        if (!partnerMenu.contains(e.target) &&
            !partnerBtn.contains(e.target)) {

            partnerMenu.classList.remove("active");
            partnerBtn.setAttribute("aria-expanded", "false");

            closeSubmenus();
        }
    });
}


// BURGER MENU

const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");

if (menuToggle && mainNav) {

    menuToggle.addEventListener("click", () => {
        const aperto = mainNav.classList.toggle("active");

        menuToggle.textContent = aperto ? "✕" : "☰";
        menuToggle.setAttribute("aria-expanded", aperto);
        menuToggle.setAttribute(
            "aria-label",
            aperto ? "Chiudi menu" : "Apri menu"
        );
    });

    mainNav.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            mainNav.classList.remove("active");
            menuToggle.textContent = "☰";
            menuToggle.setAttribute("aria-expanded", "false");
            menuToggle.setAttribute("aria-label", "Apri menu");
        });
    });
}


// --- ORDINAMENTO ALFABETICO DINAMICO DROPDOWN PARTNER ---

const partnerSubmenus = document.querySelectorAll('.partner-submenu');
partnerSubmenus.forEach(submenu => {
    const links = Array.from(submenu.querySelectorAll('a'));
    links.sort((a, b) => a.textContent.trim().localeCompare(b.textContent.trim()));
    links.forEach(link => submenu.appendChild(link));
});

const partnerMenuContainer = document.getElementById('partnerMenu');
if (partnerMenuContainer) {
    const categories = Array.from(partnerMenuContainer.querySelectorAll('.partner-item'));
    categories.sort((a, b) => {
        const textA = a.querySelector('.submenu-btn').textContent.replace('›', '').trim();
        const textB = b.querySelector('.submenu-btn').textContent.replace('›', '').trim();
        return textA.localeCompare(textB);
    });
    categories.forEach(category => partnerMenuContainer.appendChild(category));
}

// Gestione tema chiaro/scuro
document.addEventListener("DOMContentLoaded", () => {

    const themeToggle = document.getElementById("themeToggle");

    if (!themeToggle) return;

    let savedTheme = localStorage.getItem("theme");

    if (!savedTheme) {
        savedTheme = "light";
    }

    function applyTheme(theme) {

        document.documentElement.setAttribute("data-theme", theme);

        if (theme === "dark") {
            themeToggle.textContent = "☀️";
            themeToggle.setAttribute("aria-label", "Attiva modalità chiara");
            themeToggle.setAttribute("aria-pressed", "true");
        } else {
            themeToggle.textContent = "🌙";
            themeToggle.setAttribute("aria-label", "Attiva modalità scura");
            themeToggle.setAttribute("aria-pressed", "false");
        }

        localStorage.setItem("theme", theme);
    }

    applyTheme(savedTheme);

    themeToggle.addEventListener("click", () => {

        const currentTheme =
            document.documentElement.getAttribute("data-theme");

        const newTheme = currentTheme === "dark" ? "light" : "dark";

        applyTheme(newTheme);
    });

});


(function () {

    const LINGUA_DEFAULT = "it";
    const LINGUE = ["it", "en", "es", "fr", "de"];

    // Recupera lingua salvata
    function linguaSalvata() {
        return localStorage.getItem("linguaSito") || LINGUA_DEFAULT;
    }

    // Inizializza Google Translate
    window.googleTranslateElementInit = function () {

        new google.translate.TranslateElement({
            pageLanguage: "it",
            includedLanguages: "it,en,es,fr,de",
            autoDisplay: false
        }, "google_translate_element");

        // Ripristina la lingua
        const lingua = linguaSalvata();

        aggiornaMenu(lingua);

        if (lingua !== "it") {
            applicaLingua(lingua);
        }
    };

    // Applica traduzione
    function applicaLingua(lang, tentativi = 40) {

        const select = document.querySelector(".goog-te-combo");

        if (select) {

            if (select.value !== lang) {

                select.value = lang;

                select.dispatchEvent(
                    new Event("change", { bubbles: true })
                );
            }

        } else if (tentativi > 0) {

            setTimeout(function () {
                applicaLingua(lang, tentativi - 1);
            }, 500);
        }
    }

    // Aggiorna menu
    function aggiornaMenu(lang) {

        const menu = document.getElementById("languageSelect");

        if (menu) {
            menu.value = lang;
        }
    }

    // Cambio lingua manuale
    window.cambiaLinguaGoogle = function (lang) {

        if (!LINGUE.includes(lang)) return;

        localStorage.setItem("linguaSito", lang);

        aggiornaMenu(lang);

        if (lang === "it") {

            // Rimuove il cookie di Google Translate
            document.cookie =
                "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";

            document.cookie =
                "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=" + location.hostname;

            location.reload();

            return;
        }

        // Imposta lingua nel cookie
        document.cookie =
            "googtrans=/it/" + lang + "; path=/; SameSite=Lax";

        applicaLingua(lang);
    };

    // Caricamento automatico ad ogni pagina
    function avviaGoogleTranslate() {

        const lingua = linguaSalvata();

        aggiornaMenu(lingua);

        if (!document.getElementById("google_translate_element")) {
            return;
        }

        if (window.google && window.google.translate) {

            window.googleTranslateElementInit();

        } else if (!document.getElementById("google-translate-script")) {

            const script = document.createElement("script");

            script.id = "google-translate-script";

            script.src =
                "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";

            document.body.appendChild(script);
        }
    }

    if (document.readyState === "loading") {

        document.addEventListener("DOMContentLoaded", avviaGoogleTranslate);

    } else {

        avviaGoogleTranslate();
    }

})();

