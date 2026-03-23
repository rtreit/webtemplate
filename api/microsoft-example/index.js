const { parsePrincipal, getMicrosoftExampleAccess } = require("../shared/roles");

module.exports = async function (context, req) {
    const principal = parsePrincipal(req);
    const access = getMicrosoftExampleAccess(principal);

    if (!access.authorized) {
        context.res = {
            status: 403,
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
            body: access,
        };
        return;
    }

    context.res = {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        body: {
            ...access,
            title: "Microsoft authorized-domain starter example",
            summary: "This payload is only returned after Azure Functions verify that the signed-in user's x-ms-client-principal email domain matches an authorized domain.",
            highlights: [
                {
                    heading: "Protected data path",
                    detail: "The page shell is static, but the example content comes from an authenticated API response.",
                },
                {
                    heading: "Shared auth helpers",
                    detail: "The Function reuses shared helpers in api/shared/roles.js to read x-ms-client-principal, inspect userDetails, and match the email domain server-side.",
                },
                {
                    heading: "Starter-kit adaptation point",
                    detail: "Set MICROSOFT_EXAMPLE_ALLOWED_DOMAINS to a comma-separated list of allowed base domains such as microsoft.com or subdomains you want to permit.",
                },
            ],
        },
    };
};
