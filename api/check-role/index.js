const { parsePrincipal, getEmail, loadRolesConfig, resolveRole } = require("../shared/roles");

module.exports = async function (context, req) {
    const principal = parsePrincipal(req);
    const email = getEmail(principal);

    if (!principal || !email) {
        context.res = {
            status: 200,
            headers: { "Content-Type": "application/json" },
            body: {
                authenticated: false,
                role: "anonymous",
                email: null,
                isAdmin: false,
            },
        };
        return;
    }

    const config = await loadRolesConfig();
    const role = resolveRole(config, email);

    context.res = {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: {
            authenticated: true,
            role,
            email,
            isAdmin: role === "admin",
        },
    };
};
