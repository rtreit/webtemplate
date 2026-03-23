document.addEventListener('DOMContentLoaded', function() {
    const navToggle = document.querySelector('.nav-toggle');
    const links = document.querySelector('.nav-links');
    const authLoginLink = document.getElementById('auth-login-link');
    const authLogoutLink = document.getElementById('auth-logout-link');
    const memberZoneLink = document.getElementById('member-zone-link');
    const microsoftExampleLink = document.getElementById('microsoft-example-link');
    const adminLink = document.getElementById('admin-link');
    const authUserDisplay = document.getElementById('auth-user-display');
    const themeToggle = document.getElementById('theme-toggle');
    const root = document.documentElement;
    const themeStorageKey = 'theme-preference';
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

    if (navToggle && links) {
        navToggle.addEventListener('click', function() {
            links.classList.toggle('open');
            const expanded = navToggle.getAttribute('aria-expanded') === 'true';
            navToggle.setAttribute('aria-expanded', String(!expanded));
        });

        links.querySelectorAll('a').forEach(function(link) {
            link.addEventListener('click', function() {
                links.classList.remove('open');
                navToggle.setAttribute('aria-expanded', 'false');
            });
        });
    }

    function toggleHidden(element, shouldHide) {
        if (!element) {
            return;
        }

        element.classList.toggle('is-hidden', shouldHide);
        if (shouldHide) {
            element.setAttribute('aria-hidden', 'true');
        } else {
            element.removeAttribute('aria-hidden');
        }
    }

    function normalizeDomain(domain) {
        return String(domain || '').trim().toLowerCase();
    }

    function hasRequiredRole(roleData, requiredRole) {
        return requiredRole === 'public'
            || (roleData.authenticated && roleData.isAdmin)
            || (roleData.authenticated && roleData.role === requiredRole);
    }

    function hasRequiredDomain(roleData, requiredDomain) {
        if (!requiredDomain) {
            return true;
        }

        return roleData.authenticated && normalizeDomain(roleData.emailDomain) === normalizeDomain(requiredDomain);
    }

    function hasRequiredAccess(roleData, requiredAccess) {
        if (!requiredAccess) {
            return true;
        }

        if (requiredAccess === 'microsoft-example') {
            return roleData.authenticated && !!roleData.hasMicrosoftExampleAccess;
        }

        return false;
    }

    function applyProjectAccess(roleData) {
        document.querySelectorAll('[data-required-role]').forEach(function(card) {
            const requiredRole = String(card.dataset.requiredRole || 'public').trim().toLowerCase();
            const requiredDomain = normalizeDomain(card.dataset.requiredDomain);
            const requiredAccess = String(card.dataset.requiredAccess || '').trim().toLowerCase();
            const allowed = hasRequiredRole(roleData, requiredRole)
                && hasRequiredDomain(roleData, requiredDomain)
                && hasRequiredAccess(roleData, requiredAccess);
            card.classList.toggle('is-hidden', !allowed);
        });
    }

    function renderLoggedOutState() {
        if (authUserDisplay) {
            authUserDisplay.textContent = '';
        }
        toggleHidden(authLoginLink, false);
        toggleHidden(authLogoutLink, true);
        toggleHidden(memberZoneLink, true);
        toggleHidden(microsoftExampleLink, true);
        toggleHidden(adminLink, true);
        toggleHidden(authUserDisplay, true);
        applyProjectAccess({ authenticated: false, role: 'anonymous', emailDomain: null, isAdmin: false, hasMicrosoftExampleAccess: false });
    }

    async function syncAuthUi() {
        if (!authLoginLink || !authLogoutLink || !authUserDisplay) {
            return;
        }

        try {
            const response = await fetch('/.auth/me', {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                credentials: 'include',
            });

            if (!response.ok) {
                renderLoggedOutState();
                return;
            }

            const payload = await response.json();
            let principal = null;

            if (Array.isArray(payload)) {
                principal = payload[0] && payload[0].clientPrincipal ? payload[0].clientPrincipal : null;
            } else {
                principal = payload && payload.clientPrincipal ? payload.clientPrincipal : null;
            }

            if (!principal || !principal.userId) {
                renderLoggedOutState();
                return;
            }

            authUserDisplay.textContent = 'Signed in: ' + (principal.userDetails || principal.userId);
            toggleHidden(authLoginLink, true);
            toggleHidden(authLogoutLink, false);
            toggleHidden(authUserDisplay, false);

            try {
                const roleResp = await fetch('/api/check-role', { credentials: 'include' });
                const roleData = await roleResp.json();
                toggleHidden(memberZoneLink, !(roleData.authenticated && (roleData.role === 'member' || roleData.isAdmin)));
                toggleHidden(microsoftExampleLink, !roleData.hasMicrosoftExampleAccess);
                toggleHidden(adminLink, !roleData.isAdmin);
                applyProjectAccess(roleData);
            } catch {
                toggleHidden(memberZoneLink, true);
                toggleHidden(microsoftExampleLink, true);
                toggleHidden(adminLink, true);
                applyProjectAccess({ authenticated: true, role: 'visitor', emailDomain: null, isAdmin: false, hasMicrosoftExampleAccess: false });
            }
        } catch (err) {
            renderLoggedOutState();
            console.warn('Unable to determine auth status from /.auth/me', err);
        }
    }

    function effectiveTheme() {
        const forced = root.getAttribute('data-theme');
        if (forced === 'light' || forced === 'dark') {
            return forced;
        }
        return prefersDark.matches ? 'dark' : 'light';
    }

    function syncThemeToggleUi() {
        if (!themeToggle) {
            return;
        }

        const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
        const label = 'Switch to ' + next + ' mode';
        themeToggle.textContent = next;
        themeToggle.setAttribute('aria-label', label);
        themeToggle.setAttribute('title', label + ' (Shift+Click to use system default)');
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', function(event) {
            if (event.shiftKey) {
                root.removeAttribute('data-theme');
                try {
                    localStorage.removeItem(themeStorageKey);
                } catch (err) {
                }
                syncThemeToggleUi();
                return;
            }

            const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
            root.setAttribute('data-theme', next);
            try {
                localStorage.setItem(themeStorageKey, next);
            } catch (err) {
            }
            syncThemeToggleUi();
        });

        if (prefersDark.addEventListener) {
            prefersDark.addEventListener('change', function() {
                if (!root.getAttribute('data-theme')) {
                    syncThemeToggleUi();
                }
            });
        }
    }

    syncThemeToggleUi();
    syncAuthUi();
});
