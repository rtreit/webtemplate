const {
    parsePrincipal,
    getEmail,
    loadRolesConfig,
    saveRolesConfig,
    resolveRole,
} = require("../shared/roles");

module.exports = async function (context, req) {
    const principal = parsePrincipal(req);
    const email = getEmail(principal);

    if (!email) {
        context.res = { status: 401, body: { error: "Not authenticated" } };
        return;
    }

    const config = await loadRolesConfig();
    const role = resolveRole(config, email);

    if (role !== "admin") {
        context.res = {
            status: 403,
            body: { error: "Admin access required", yourRole: role },
        };
        return;
    }

    if (req.method === "GET") {
        context.res = {
            status: 200,
            headers: { "Content-Type": "application/json" },
            body: config,
        };
        return;
    }

    const newConfig = req.body;
    if (!newConfig || !newConfig.roles || typeof newConfig.roles !== "object") {
        context.res = {
            status: 400,
            body: { error: 'Invalid config. Expected a "roles" object.' },
        };
        return;
    }

    if (!Array.isArray(newConfig.roles.admin) || newConfig.roles.admin.length === 0) {
        context.res = {
            status: 400,
            body: { error: "Admin role must contain at least one member." },
        };
        return;
    }

    const normalizedAdmins = newConfig.roles.admin.map((entry) => entry.toLowerCase().trim());
    if (!normalizedAdmins.includes(email)) {
        context.res = {
            status: 400,
            body: { error: "You cannot remove your own admin access." },
        };
        return;
    }

    if (!newConfig.defaultRole) {
        newConfig.defaultRole = "visitor";
    }

    await saveRolesConfig(newConfig);

    context.res = {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: { message: "Roles updated", config: newConfig },
    };
};
