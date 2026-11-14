# SOXLO Private Creator — integration draft

This directory is deliberately isolated from the existing SOXLO music website.

## Required before launch
1. Create a **separate** Supabase project for the creator. Disable public signups and create an invited user through secure administration. Enable email confirmation and MFA where supported.
2. Deploy an authenticated HTTPS image-generation backend (e.g. GPU service with ComfyUI). Backend must verify the Supabase JWT and authorized user on **every request**, enforce size/rate limits and content policy, and never expose model/provider credentials in browser JavaScript.
3. Set restricted CORS to the SOXLO site origin. Validate uploaded file types and sizes server-side. Store generated photos in private storage using short-lived signed URLs, not public GitHub files.
4. Set the three public CONFIG fields in index.html: Supabase URL, public anon/publishable key, and HTTPS generation endpoint. Never put a service-role key or backend API key here.
5. The endpoint accepts multipart POST with prompt, ratio, optional reference, and Authorization: Bearer <Supabase access token>. Returns JSON { "imageUrl": "https://short-lived-signed-url" }.
6. Review and merge only after auth and backend are functional. The draft intentionally shows a locked setup screen until configured.

## ChatGPT integration
This page does not grant ChatGPT automatic access. To let an assistant request images, build a separately authorized connector or custom API integration with user-controlled permissions. ChatGPT safety rules still apply.

## Privacy
GitHub Pages publishes all files in a public repository. An unlinked URL is not secret. Do not store private images, credentials, or personal data in this repository.
