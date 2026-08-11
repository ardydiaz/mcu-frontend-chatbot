# MCU Frontend Chatbot

React/Vite frontend for the MCU chatbot, admin dashboard, document management, and embeddable chatbot widget.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run build
```

## Environment

Create `.env` or `.env.production` from `.env.example`.

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_DEFAULT_API_EMAIL=adminmcu@mcu.edu.ph
VITE_DEFAULT_API_PASSWORD=your-api-password
VITE_MICROSOFT_AUTH_PATH=/api/auth/microsoft
VITE_MICROSOFT_CLIENT_ID=your-microsoft-app-client-id
VITE_MICROSOFT_AUTHORITY=https://login.microsoftonline.com/common
VITE_MICROSOFT_REDIRECT_URI=http://localhost:5173/
```

## Project Structure

```text
src/
  app/
    AppRouter.jsx          Route definitions
    ProtectedAdmin.jsx     Admin session guard

  admin/
    components/            Admin layout and shared widgets
    config/                Admin navigation/configuration
    data/                  Temporary/mock admin data
    pages/                 Admin screens
    services/              Admin API clients
    ui/                    Shared admin UI classes

  frontend/
    components/            Chatbot UI components
    pages/                 Public chatbot page
    services/              Chatbot API clients
    utils/                 Chatbot pure helper functions

  services/                Cross-app API/auth clients
  assets/                  Static assets imported by React
  App.jsx                  App bootstrap wrapper
  App.css                  Global and feature styling
  index.css                Design tokens and base styles
```

## Maintenance Guidelines

- Put new admin pages in `src/admin/pages`.
- Add new admin sidebar entries in `src/admin/config/navigation.js`.
- Reuse admin form/button classes from `src/admin/ui/classes.js`.
- Put public chatbot helpers in `src/frontend/utils`.
- Keep API calls inside `services` files, not directly inside components when possible.
- Keep `App.jsx` small; routing belongs in `src/app/AppRouter.jsx`.
- Avoid creating new top-level feature folders unless the feature is shared across admin and chatbot.

## Build Output

Vite builds static files to:

```text
dist/
```

The production web server should serve `dist/` through Nginx or another static web server.
