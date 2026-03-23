const { BlobServiceClient } = require("@azure/storage-blob");

const CONTAINER = "site-config";
const BLOB_NAME = "roles.json";
const MICROSOFT_EXAMPLE_TENANT_ID = "72f988bf-86f1-41af-91ab-2d7cd011db47";
const TENANT_ID_CLAIM_TYPES = [
    "tid",
    "tenantid",
    "http://schemas.microsoft.com/identity/claims/tenantid",
];

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

function getClaimValue(principal, claimTypes) {
    if (!principal || !Array.isArray(principal.claims)) {
        return null;
    }

    const normalizedClaimTypes = new Set(
        (Array.isArray(claimTypes) ? claimTypes : [claimTypes])
            .map((claimType) => String(claimType || "").trim().toLowerCase())
            .filter(Boolean)
    );

    if (!normalizedClaimTypes.size) {
        return null;
    }

    for (const claim of principal.claims) {
        const claimType = String(claim && claim.typ || "").trim().toLowerCase();
        if (!normalizedClaimTypes.has(claimType)) {
            continue;
        }

        const value = String(claim && claim.val || "").trim();
        if (value) {
            return value;
        }
    }

    return null;
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

function hasEmailDomain(email, requiredDomain) {
    const normalizedDomain = String(requiredDomain || "").trim().toLowerCase();
    if (!normalizedDomain) return false;
    return getEmailDomain(email) === normalizedDomain;
}

function hasEmailDomainOrSubdomain(email, requiredDomain) {
    const normalizedDomain = String(requiredDomain || "").trim().toLowerCase();
    const emailDomain = getEmailDomain(email);
    if (!normalizedDomain || !emailDomain) return false;
    return emailDomain === normalizedDomain || emailDomain.endsWith("." + normalizedDomain);
}

function getTenantId(principal) {
    const tenantId = getClaimValue(principal, TENANT_ID_CLAIM_TYPES);
    return tenantId ? tenantId.toLowerCase() : null;
}

function hasTenantId(principal, requiredTenantId) {
    const normalizedRequiredTenantId = String(requiredTenantId || "").trim().toLowerCase();
    if (!normalizedRequiredTenantId) {
        return false;
    }

    return getTenantId(principal) === normalizedRequiredTenantId;
}

function getMicrosoftExampleAccess(principal) {
    const email = getEmail(principal);
    const emailDomain = getEmailDomain(email);
    const tenantId = getTenantId(principal);
    const accessRule = "Authenticated users must have tenant ID claim " + MICROSOFT_EXAMPLE_TENANT_ID + ".";

    if (!principal || !email) {
        return {
            authorized: false,
            authenticated: false,
            user: null,
            emailDomain: null,
            tenantId: null,
            requiredTenantId: MICROSOFT_EXAMPLE_TENANT_ID,
            accessRule,
            message: "Sign in with Microsoft to test the tenant-restricted example.",
        };
    }

    if (!tenantId) {
        return {
            authorized: false,
            authenticated: true,
            user: email,
            emailDomain,
            tenantId: null,
            requiredTenantId: MICROSOFT_EXAMPLE_TENANT_ID,
            accessRule,
            message: "Signed in as " + email + ", but this example requires an Azure tenant ID claim.",
        };
    }

    if (!hasTenantId(principal, MICROSOFT_EXAMPLE_TENANT_ID)) {
        return {
            authorized: false,
            authenticated: true,
            user: email,
            emailDomain,
            tenantId,
            requiredTenantId: MICROSOFT_EXAMPLE_TENANT_ID,
            accessRule,
            message: "Signed in as " + email + ", but this example is limited to tenant " + MICROSOFT_EXAMPLE_TENANT_ID + ".",
        };
    }

    return {
        authorized: true,
        authenticated: true,
        user: email,
        emailDomain,
        tenantId,
        requiredTenantId: MICROSOFT_EXAMPLE_TENANT_ID,
        accessRule,
        message: "Access granted for " + email + " because tenant ID claim " + tenantId + " matches the allowed tenant.",
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
    getClaimValue,
    getEmailDomain,
    hasEmailDomain,
    hasEmailDomainOrSubdomain,
    getTenantId,
    hasTenantId,
    getMicrosoftExampleAccess,
    loadRolesConfig,
    saveRolesConfig,
    resolveRole,
    getDefaultConfig,
    MICROSOFT_EXAMPLE_TENANT_ID,
};
