---
title: "Microsoft Authorized-Domain Example"
description: "API-backed starter example that is only surfaced to signed-in users whose email domain matches an authorized Microsoft domain such as microsoft.com or ntdev.microsoft.com."
requiredRole: "public"
requiredAccess: "microsoft-example"
layout: "microsoft-example"
url: "/microsoft-example/"
---

This page demonstrates a common starter-kit pattern: keep the route generic and safe to publish, then load the sensitive portion from an authenticated Azure Function that checks the signed-in user's email domain server-side.
