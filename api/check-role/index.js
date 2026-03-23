const { parsePrincipal, getEmail, getEmailDomain, getMicrosoftExampleAccess, loadRolesConfig, resolveRole } = require("../shared/roles");

module.exports = async function (context, req) {
    const principal = parsePrincipal(req);
    const email = getEmail(principal);
    const microsoftExampleAccess = getMicrosoftExampleAccess(principal);

    if (!principal || !email) {
        context.res = {
            status: 200,
            headers: { "Content-Type": "application/json" },
            body: {
                authenticated: false,
                role: "anonymous",
                email: null,
                emailDomain: null,
                isAdmin: false,
                hasMicrosoftExampleAccess: false,
                microsoftExample: microsoftExampleAccess,
            },
        };
        return;
    }

    const config = await loadRolesConfig();
    const role = resolveRole(config, email);
    const emailDomain = getEmailDomain(email);

    context.res = {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: {
            authenticated: true,
            role,
            email,
            emailDomain,
            isAdmin: role === "admin",
            hasMicrosoftExampleAccess: microsoftExampleAccess.authorized,
            microsoftExample: microsoftExampleAccess,
        },
    };
};
