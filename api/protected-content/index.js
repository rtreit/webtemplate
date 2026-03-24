const { BlobServiceClient } = require("@azure/storage-blob");
const { parsePrincipal, getEmail, getEmailDomain, getMicrosoftExampleAccess } = require("../shared/roles");

const CONTAINER = "protected-content";

module.exports = async function (context, req) {
    const slug = context.bindingData.slug;
    if (!slug || /[^a-z0-9\-]/.test(slug)) {
        context.res = { status: 400, headers: { "Content-Type": "application/json" }, body: { error: "Invalid content slug." } };
        return;
    }

    const principal = parsePrincipal(req);
    const access = getMicrosoftExampleAccess(principal);

    if (!access.authorized) {
        context.res = {
            status: access.authenticated ? 403 : 401,
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
            body: access,
        };
        return;
    }

    const connectionString = process.env.STORAGE_CONNECTION_STRING;
    if (!connectionString) {
        context.res = { status: 500, headers: { "Content-Type": "application/json" }, body: { error: "Storage not configured." } };
        return;
    }

    try {
        const blobService = BlobServiceClient.fromConnectionString(connectionString);
        const container = blobService.getContainerClient(CONTAINER);
        const blob = container.getBlockBlobClient(slug + ".html");
        const exists = await blob.exists();

        if (!exists) {
            context.res = { status: 404, headers: { "Content-Type": "application/json" }, body: { error: "Content not found: " + slug } };
            return;
        }

        const download = await blob.downloadToBuffer();
        context.res = {
            status: 200,
            headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
            body: download.toString("utf8"),
        };
    } catch (err) {
        context.log.error("Failed to load protected content:", err.message);
        context.res = { status: 500, headers: { "Content-Type": "application/json" }, body: { error: "Failed to load content." } };
    }
};
