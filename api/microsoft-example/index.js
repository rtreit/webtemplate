const { parsePrincipal, getEmail, getEmailDomain, hasEmailDomain } = require("../shared/roles");

const REQUIRED_DOMAIN = "microsoft.com";

module.exports = async function (context, req) {
    const principal = parsePrincipal(req);
    const email = getEmail(principal);
    const emailDomain = getEmailDomain(email);

    if (!email) {
        context.res = {
            status: 403,
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
            body: {
                authorized: false,
                authenticated: false,
                user: null,
                emailDomain: null,
                requiredDomain: REQUIRED_DOMAIN,
                message: "Sign in with Microsoft to test the domain-gated example.",
            },
        };
        return;
    }

    if (!hasEmailDomain(email, REQUIRED_DOMAIN)) {
        context.res = {
            status: 403,
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
            body: {
                authorized: false,
                authenticated: true,
                user: email,
                emailDomain,
                requiredDomain: REQUIRED_DOMAIN,
                message: "Signed in as " + email + ", but this starter example is limited to @" + REQUIRED_DOMAIN + " users.",
            },
        };
        return;
    }

    context.res = {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        body: {
            authorized: true,
            authenticated: true,
            user: email,
            emailDomain,
            requiredDomain: REQUIRED_DOMAIN,
            title: "Microsoft.com starter example",
            summary: "This payload is only returned after Azure Functions verify that the signed-in email ends in @microsoft.com.",
            highlights: [
                {
                    heading: "Protected data path",
                    detail: "The page shell is static, but the example content comes from an authenticated API response.",
                },
                {
                    heading: "Shared auth helpers",
                    detail: "The Function reuses x-ms-client-principal parsing and shared email helpers from api/shared/roles.js.",
                },
                {
                    heading: "Starter-kit adaptation point",
                    detail: "Swap microsoft.com for your own partner or employee domain when tailoring this template.",
                },
            ],
        },
    };
};
