# Authentication API Guide

Frontend base URL: `http://localhost:3000`

Frontend application URL: `http://localhost:3001`

All JSON requests must send:

```http
Content-Type: application/json
```

The API enables CORS for the configured frontend origin and credentials. Use `credentials: 'include'` in browser requests when cookies are needed.

## Authentication model

The API uses two JWTs:

- `accessToken`: short-lived token used in the `Authorization` header.
- `refreshToken`: longer-lived token used with `/auth/refresh` to issue a new token pair.

Register, login, refresh, and OAuth login also set these `HttpOnly` cookies:

- `access_token`: 15 minutes
- `refresh_token`: 7 days

Important: the current access-token guard reads the access token only from the
`Authorization` header. It does not read `access_token` from the cookie. The
email/password endpoints return tokens in JSON, but the OAuth browser flow
sets them as `HttpOnly` cookies and does not return them to the frontend. The
backend therefore needs either cookie-based access-token extraction or a
dedicated session endpoint before OAuth users can call protected endpoints
from the frontend.

For protected API calls, send the access token explicitly:

```http
Authorization: Bearer <accessToken>
```

Example frontend helper:

```ts
await fetch('http://localhost:3000/auth/me', {
  credentials: 'include',
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});
```

## Common response types

### Auth result

Returned by register, login, refresh, and successful OAuth processing:

```json
{
  "user": {
    "id": "uuid",
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "googleId": null,
    "githubId": "12345678",
    "avatarUrl": "https://avatars.githubusercontent.com/u/12345678",
    "createdAt": "2026-09-09T12:00:00.000Z",
    "updatedAt": "2026-09-09T12:00:00.000Z"
  },
  "accessToken": "jwt-access-token",
  "refreshToken": "jwt-refresh-token"
}
```

`passwordHash`, `refreshTokenHash`, and password-reset fields are never returned in the user object.

### Validation errors

Invalid request bodies normally return HTTP `400` with a NestJS validation response. Unknown body properties are rejected.

```json
{
  "statusCode": 400,
  "message": ["email must be an email"],
  "error": "Bad Request"
}
```

## Endpoints

### Register

```http
POST /auth/register
```

Request body:

```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "password": "at-least-8-characters"
}
```

Rules:

- `name` must be a string with at least 2 characters.
- `email` must be valid.
- `password` must be a string with at least 8 characters.

Success: `201 Created`, returns an [Auth result](#auth-result).

Duplicate email: `409 Conflict`.

### Login

```http
POST /auth/login
```

Request body:

```json
{
  "email": "ada@example.com",
  "password": "at-least-8-characters"
}
```

Success: `200 OK`, returns an [Auth result](#auth-result).

Invalid credentials: `401 Unauthorized`.

### Refresh tokens

```http
POST /auth/refresh
```

Request body:

```json
{
  "refreshToken": "jwt-refresh-token"
}
```

Success: `200 OK`, returns a new [Auth result](#auth-result). The frontend should replace both stored token values with the returned values.

Invalid or expired token: `401 Unauthorized`.

### Get current user

```http
GET /auth/me
```

Required header:

```http
Authorization: Bearer <accessToken>
```

Success: `200 OK`, returns the safe user object.

Missing, invalid, or expired access token: `401 Unauthorized`.

### Logout

```http
POST /auth/logout
```

Required header:

```http
Authorization: Bearer <accessToken>
```

Success: `200 OK`:

```json
{
  "success": true
}
```

Logout invalidates the stored refresh token. The frontend should clear its local token state after a successful response.

Missing, invalid, or expired access token: `401 Unauthorized`.

## Password reset

### Request password reset

```http
POST /auth/forgot-password
```

Request body:

```json
{
  "email": "ada@example.com"
}
```

Success: `200 OK`:

```json
{
  "success": true
}
```

The same success response is returned whether the email exists or not. If the account exists, the backend sends a reset email containing the configured frontend reset URL and a token valid for 15 minutes.

### Set a new password

```http
POST /auth/reset-password
```

Request body:

```json
{
  "token": "token-from-the-reset-email",
  "newPassword": "new-password-at-least-8-characters"
}
```

Rules:

- `token` must be a string.
- `newPassword` must be a string with at least 8 characters.

Success: `200 OK`:

```json
{
  "success": true
}
```

Invalid or expired token: `401 Unauthorized`.

After a successful password reset, the previous refresh token is invalidated. The user must log in again.

## OAuth login

OAuth is browser redirect flow, not a JSON `fetch` flow. Start it by navigating the browser to the backend endpoint:

```ts
window.location.assign('http://localhost:3000/auth/google');
// or
window.location.assign('http://localhost:3000/auth/github');
```

The backend redirects to the provider, verifies the callback, sets the auth cookies, and redirects to:

```text
http://localhost:3001/auth/callback
```

On failure, it redirects with one of these query values:

```text
/auth/callback?error=invalid_oauth_state
/auth/callback?error=google_auth_failed
/auth/callback?error=github_auth_failed
```

The frontend callback page should read `error` from the URL, display an error, and provide a way to retry. On success, call `/auth/me` with the access token to load the authenticated user.

### Google

Start URL:

```http
GET /auth/google
```

Google provider callback configured in the backend:

```text
http://localhost:3000/auth/google/callback
```

### GitHub

Start URL:

```http
GET /auth/github
```

GitHub provider callback configured in the backend:

```text
http://localhost:3000/auth/github/callback
```

The provider must return an email address. GitHub accounts with a private email use the `user:email` permission to find a verified email.

## Frontend auth flow

### Email login

1. POST credentials to `/auth/login`.
2. Store the returned `accessToken` and `refreshToken` according to the frontend security policy.
3. Send `Authorization: Bearer <accessToken>` to protected endpoints.
4. When access expires, POST the refresh token to `/auth/refresh`.
5. If refresh fails, clear auth state and redirect to the login screen.

### OAuth login

1. Navigate the browser to `/auth/google` or `/auth/github`.
2. Render the frontend `/auth/callback` route.
3. Read the optional `error` query parameter.
4. On success, the backend has set authentication cookies. The current
   backend does not yet expose the OAuth access token to JavaScript, and its
   guard does not read that cookie. Protected OAuth requests therefore require
   the backend authentication implementation to be extended as described
   above.

## Environment expectations

The frontend and backend must agree on these URLs:

```text
Backend:  http://localhost:3000
Frontend: http://localhost:3001
```

The OAuth provider callback URLs must point to the backend, not the frontend:

```text
http://localhost:3000/auth/google/callback
http://localhost:3000/auth/github/callback
```
