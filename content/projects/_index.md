---
title: "Projects"
description: "Example project cards with different visibility levels."
---

These example cards show one pattern for auth-aware UI:

- public cards are always visible
- member cards appear for `member` and `admin`
- admin cards appear only for `admin`
- the Microsoft authorized-domain example appears only for signed-in users whose email domain matches an allowed domain and loads its protected payload from an Azure Function

Use Azure Functions for real authorization when the content itself must stay private.
