# Production Environment Setup Guide

This document provides step-by-step instructions for setting up production environment variables.

## Backend (.env.production)

Located in `talki-backend/.env.production`

### Required Variables

#### Database & Supabase

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-api-key
```

Get these from your Supabase project settings.

#### Security

```env
SECRET_KEY=your-super-secret-key-change-this
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

Generate a secure SECRET_KEY:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

#### App Settings

```env
APP_NAME=Talki
DEBUG=false
ENVIRONMENT=production
```

#### AI Services

**Google Cloud (Speech-to-Text & Text-to-Speech):**

```env
GOOGLE_APPLICATION_CREDENTIALS=/keys/google-credentials.json
```

Place your `google-credentials.json` in `./secrets/` directory.

**OpenAI (GPT for AI responses):**

```env
OPENAI_API_KEY=sk-...
```

Get from https://platform.openai.com/api-keys

#### Media & File Storage

**Cloudinary:**

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Get from https://cloudinary.com/console/

#### CORS & Frontend

```env
FRONTEND_URL=https://your-domain.com
```

#### Optional: Email Notifications

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

For Gmail, use [App Passwords](https://myaccount.google.com/apppasswords)

#### Optional: Payment Processing

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
```

Get from https://dashboard.stripe.com/

---

## Frontend (.env.production)

Located in `frontend/.env.production`

### Required Variables

#### API Configuration

```env
VITE_API_BASE_URL=https://your-domain.com/api
```

#### Supabase

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Important:** Use the ANON key (not the secret key) for frontend.

#### Environment

```env
VITE_ENV=production
```

#### Feature Flags

```env
VITE_ENABLE_VOICE_CONTROLS=true
VITE_ENABLE_ADMIN_PANEL=true
VITE_ENABLE_ACHIEVEMENTS=true
```

#### Optional: Analytics

```env
VITE_ANALYTICS_ID=your-analytics-id
```

---

## Security Best Practices

1. **Never commit .env.production files**
   - Already in `.gitignore`
   - Keep secret keys safe!

2. **Use strong SECRET_KEY**

   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

3. **Rotate keys regularly**
   - Change API keys every 3-6 months
   - Immediately if compromised

4. **Use environment-specific keys**
   - Development keys
   - Staging keys
   - Production keys (different)

5. **Store securely**
   - Don't save in browser
   - Use password manager (1Password, LastPass)
   - Document but don't commit

6. **Restrict API key permissions**
   - Google: Service account with minimal permissions
   - Stripe: Restricted keys for production
   - Cloudinary: Restricted upload settings

---

## Getting Credentials

### Supabase

1. Go to https://supabase.com/
2. Create project → Copy Project URL & API Key
3. Use API Key (not service key) for backend

### Google Cloud

1. Create Service Account: https://console.cloud.google.com/
2. Download JSON key → save as `secrets/google-credentials.json`
3. Enable APIs: Speech-to-Text, Text-to-Speech
4. Backend reads from `/keys/google-credentials.json`

### OpenAI

1. Go to https://platform.openai.com/api-keys
2. Create new API key
3. Copy and save securely

### Cloudinary

1. Sign up at https://cloudinary.com/
2. Dashboard → Get Cloud Name, API Key, API Secret

### Stripe (if using payments)

1. Create account at https://stripe.com/
2. API Keys → Secret Key (sk*live*...)
3. Publishable Key (pk*live*...)

---

## Database Migrations

Before first deploy, ensure database is initialized:

```bash
# Run Supabase migrations
# Either via Supabase dashboard or:
supabase migration up
```

Check `frontend/supabase/migrations/` for all migration files.

---

## Environment Validation

Check that all required variables are set:

```bash
# Backend
grep "SUPABASE_URL\|SUPABASE_KEY\|SECRET_KEY\|OPENAI_API_KEY\|GOOGLE_APPLICATION_CREDENTIALS" talki-backend/.env.production

# Frontend
grep "VITE_API_BASE_URL\|VITE_SUPABASE_URL\|VITE_SUPABASE_ANON_KEY" frontend/.env.production
```

---

## Testing Environment Setup

Before deploying to production:

```bash
# Test locally with production environment
docker-compose -f docker-compose.prod.yml up -d

# Check health
curl http://localhost:8000/health
curl http://localhost:5173
```

---

## Troubleshooting

### "Invalid SUPABASE_URL"

- Verify URL format: `https://xxxxx.supabase.co` (not http)
- Check project was created in Supabase

### "OpenAI API key invalid"

- Generate new key from https://platform.openai.com/api-keys
- Ensure no extra spaces in .env file

### "Google credentials not found"

- Place `google-credentials.json` in `./secrets/`
- Docker will mount it at `/keys/google-credentials.json`

### Frontend can't reach API

- Check `VITE_API_BASE_URL` matches your domain
- Ensure backend is running
- Check CORS settings in backend

---

## Emergency: Change Credentials

If credentials are compromised:

1. **Immediately revoke old keys**
   - Supabase: API Settings
   - Google: Console → Service accounts
   - OpenAI: API Keys page
   - Cloudinary: Settings

2. **Generate new keys**
   - Update .env.production files
   - Restart containers: `docker-compose -f docker-compose.prod.yml restart`

3. **Review logs** for unauthorized access

---

For more help, see [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md)
