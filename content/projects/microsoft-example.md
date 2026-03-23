---
title: "Microsoft Tenant Example"
description: "API-backed starter example that is only surfaced to signed-in users whose tenant ID claim matches the allowed Microsoft tenant."
requiredRole: "public"
requiredAccess: "microsoft-example"
layout: "microsoft-example"
url: "/microsoft-example/"
---

This page demonstrates a common starter-kit pattern: keep the route generic and safe to publish, then load the sensitive portion from an authenticated Azure Function that checks the authenticated tenant ID claim.
