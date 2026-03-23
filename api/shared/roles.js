const { BlobServiceClient } = require("@azure/storage-blob");

const CONTAINER = "site-config";
const BLOB_NAME = "roles.json";
const DEFAULT_MICROSOFT_EXAMPLE_DOMAINS = ["microsoft.com", "ntdev.microsoft.com"];

function getDefaultConfig() {
    const bootstrapAdmin = String(process.env.BOOTSTRAP_ADMIN_EMAIL || "admin@example.com").trim().toLowerCase();
    return {
        roles: {
            admin: [bootstrapAdmin],
            member: [],
            visitor: [],
        },
        defaultRole: "visitor",
    };
}

function parsePrincipal(req) {
    const header = req.headers["x-ms-client-principal"];
    if (!header) return null;
    try {
        const decoded = Buffer.from(header, "base64").toString("utf8");
        return JSON.parse(decoded);
    } catch {
        return null;
    }
}

function getEmail(principal) {
    if (!principal || !principal.userDetails) return null;
    return String(principal.userDetails).trim().toLowerCase();
}

function getEmailDomain(email) {
    if (!email) return null;
    const normalized = String(email).trim().toLowerCase();
    const atIndex = normalized.lastIndexOf("@");
    if (atIndex < 0 || atIndex === normalized.length - 1) {
        return null;
    }

    return normalized.slice(atIndex + 1);
}

function normalizeDomain(domain) {
    return String(domain || "").trim().toLowerCase();
}

function parseAllowedDomains(value) {
    const normalizedDomains = String(value || "")
        .split(/[,\s;]+/)
        .map(normalizeDomain)
        .filter(Boolean);

    return normalizedDomains.length
        ? Array.from(new Set(normalizedDomains))
        : DEFAULT_MICROSOFT_EXAMPLE_DOMAINS.slice();
}

function getMicrosoftExampleAllowedDomains() {
    return parseAllowedDomains(process.env.MICROSOFT_EXAMPLE_ALLOWED_DOMAINS);
}

function hasEmailDomain(email, requiredDomain) {
    const normalizedDomain = String(requiredDomain || "").trim().toLowerCase();
    if (!normalizedDomain) return false;
    return getEmailDomain(email) === normalizedDomain;
}

function hasEmailDomainOrSubdomain(email, requiredDomain) {
    const normalizedDomain = normalizeDomain(requiredDomain);
    const emailDomain = getEmailDomain(email);
    if (!normalizedDomain || !emailDomain) return false;
    return emailDomain === normalizedDomain || emailDomain.endsWith("." + normalizedDomain);
}

function getMicrosoftExampleAccess(principal) {
    const email = getEmail(principal);
    const emailDomain = getEmailDomain(email);
    const allowedDomains = getMicrosoftExampleAllowedDomains();
    const matchedDomain = emailDomain
        ? allowedDomains.find((domain) => hasEmailDomainOrSubdomain(email, domain)) || null
        : null;
    const accessRule = "Authenticated users must sign in with an email address in one of these domains: " + allowedDomains.join(", ") + ".";

    if (!principal || !email) {
        return {
            authorized: false,
            authenticated: false,
            user: null,
            emailDomain: null,
            allowedDomains,
            matchedDomain: null,
            accessRule,
            message: "Sign in with Microsoft to test the authorized-domain example.",
        };
    }

    if (!emailDomain) {
        return {
            authorized: false,
            authenticated: true,
            user: email,
            emailDomain,
            allowedDomains,
            matchedDomain: null,
            accessRule,
            message: "Signed in as " + email + ", but this example requires a usable email domain in x-ms-client-principal.userDetails.",
        };
    }

    if (!matchedDomain) {
        return {
            authorized: false,
            authenticated: true,
            user: email,
            emailDomain,
            allowedDomains,
            matchedDomain: null,
            accessRule,
            message: "Signed in as " + email + ", but this example is limited to authorized domains: " + allowedDomains.join(", ") + ".",
        };
    }

    return {
        authorized: true,
        authenticated: true,
        user: email,
        emailDomain,
        allowedDomains,
        matchedDomain,
        accessRule,
        message: "Access granted for " + email + " because email domain " + emailDomain + " matches authorized domain " + matchedDomain + ".",
    };
}

async function loadRolesConfig() {
    const connectionString = process.env.STORAGE_CONNECTION_STRING;
    const defaultConfig = getDefaultConfig();
    if (!connectionString) return defaultConfig;

    try {
        const blobService = BlobServiceClient.fromConnectionString(connectionString);
        const container = blobService.getContainerClient(CONTAINER);
        await container.createIfNotExists();

        const blob = container.getBlockBlobClient(BLOB_NAME);
        const exists = await blob.exists();

        if (!exists) {
            const content = JSON.stringify(defaultConfig, null, 2);
            await blob.upload(content, Buffer.byteLength(content), {
                blobHTTPHeaders: { blobContentType: "application/json" },
            });
            return defaultConfig;
        }

        const download = await blob.downloadToBuffer();
        return JSON.parse(download.toString("utf8"));
    } catch (err) {
        console.error("Failed to load roles config:", err.message);
        return defaultConfig;
    }
}

async function saveRolesConfig(config) {
    const connectionString = process.env.STORAGE_CONNECTION_STRING;
    if (!connectionString) throw new Error("STORAGE_CONNECTION_STRING not set");

    const blobService = BlobServiceClient.fromConnectionString(connectionString);
    const container = blobService.getContainerClient(CONTAINER);
    await container.createIfNotExists();

    const blob = container.getBlockBlobClient(BLOB_NAME);
    const content = JSON.stringify(config, null, 2);
    await blob.upload(content, Buffer.byteLength(content), {
        blobHTTPHeaders: { blobContentType: "application/json" },
    });
}

function resolveRole(config, email) {
    if (!email) return "anonymous";
    const normalized = email.toLowerCase().trim();
    const roles = config.roles || {};

    if (Array.isArray(roles.admin) && roles.admin.some((entry) => entry.toLowerCase() === normalized)) {
        return "admin";
    }

    for (const [roleName, members] of Object.entries(roles)) {
        if (roleName === "admin" || roleName === "visitor") continue;
        if (Array.isArray(members) && members.some((entry) => entry.toLowerCase() === normalized)) {
            return roleName;
        }
    }

    return config.defaultRole || "visitor";
}

module.exports = {
    parsePrincipal,
    getEmail,
    getEmailDomain,
    hasEmailDomain,
    hasEmailDomainOrSubdomain,
    getMicrosoftExampleAllowedDomains,
    getMicrosoftExampleAccess,
    loadRolesConfig,
    saveRolesConfig,
    resolveRole,
    getDefaultConfig,
    DEFAULT_MICROSOFT_EXAMPLE_DOMAINS,
};
