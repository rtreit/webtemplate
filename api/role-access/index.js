const { parsePrincipal, getEmail, loadRolesConfig, resolveRole } = require("../shared/roles");

module.exports = async function (context, req) {
    const requiredRole = String(req.query.role || req.headers["x-required-role"] || "").trim().toLowerCase();
    if (!requiredRole) {
        context.res = {
            status: 400,
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
            body: { authorized: false, error: "Missing required role." },
        };
        return;
    }

    const principal = parsePrincipal(req);
    const email = getEmail(principal);
    if (!email) {
        context.res = {
            status: 403,
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
            body: {
                authorized: false,
                authenticated: false,
                user: null,
                requiredRole,
                message: "Not authenticated. Please log in.",
            },
        };
        return;
    }

    const config = await loadRolesConfig();
    const role = resolveRole(config, email);
    const authorized = role === requiredRole || role === "admin";

    context.res = {
        status: authorized ? 200 : 403,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        body: {
            authorized,
            authenticated: true,
            user: email,
            role,
            requiredRole,
            message: authorized
                ? "Access granted."
                : "This section requires the " + requiredRole + " role.",
        },
    };
};
