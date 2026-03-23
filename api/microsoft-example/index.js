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
            title: "Microsoft tenant starter example",
            summary: "This payload is only returned after Azure Functions verify that the signed-in x-ms-client-principal includes tenant ID claim " + access.requiredTenantId + ".",
            highlights: [
                {
                    heading: "Protected data path",
                    detail: "The page shell is static, but the example content comes from an authenticated API response.",
                },
                {
                    heading: "Shared auth helpers",
                    detail: "The Function reuses shared helpers that parse x-ms-client-principal claims and compare the tenant ID in api/shared/roles.js.",
                },
                {
                    heading: "Starter-kit adaptation point",
                    detail: "Swap the allowed tenant ID in api/shared/roles.js when tailoring this template for a different organization.",
                },
            ],
        },
    };
};
