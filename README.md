<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/2b8c18d6-5053-4290-8d15-b97c8c947098

## Run Locally

**Prerequisites:** Node.js (LTS) and npm.

1. Copy `.env.example` to `.env` in the project root.
2. Set `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and a random `JWT_SECRET` of at least 32 characters in `.env`. Add OAuth credentials only when configuring the providers.
3. Install dependencies: `npm install`
4. Start the local development server: `npm run dev`
5. Open the local URL printed in the terminal.

Never commit `.env` or share its contents. `.env.example` contains placeholders only.

## Important production note

This export is a development starting point, not production-ready. The current server uses in-memory demo data, and the customer email/password and client-submitted OAuth fallback flows require replacement with verified authentication. Do not deploy or use it with real customer data or payment proofs until the database, authentication, authorization, private file storage, and payment workflows have been reviewed and tested.
