# Feedback API

Vercel serverless API for collecting app feedback and automatically creating GitHub issues.

## Features

- POST endpoint to receive app feedback
- Automatic GitHub issue creation
- Label management (creates labels if they don't exist)
- Support for multiple apps
- CORS enabled for web requests

## API Endpoint

### POST `/api/feedback`

Submit feedback for an app.

#### Request Body

```json
{
  "appName": "time_receipt",
  "title": "Bug report: Timer not working",
  "body": "When I try to start the timer, it doesn't respond to touch.",
  "version": "v1.0.0+23"
}
```

#### Parameters

- `appName` (string, required): Name of the app (currently supports: `time_receipt`)
- `title` (string, required): Feedback title
- `body` (string, required): Feedback description
- `version` (string, required): App version (e.g., "v1.0.0+23")

#### Response

**Success (201)**
```json
{
  "success": true,
  "issueUrl": "https://github.com/PawFighters/time_receipt/issues/123",
  "issueNumber": 123,
  "message": "Feedback submitted successfully"
}
```

**Error (400)**
```json
{
  "error": "Missing required parameters",
  "required": ["appName", "title", "body", "version"]
}
```

**Error (500)**
```json
{
  "error": "Internal server error",
  "message": "Error details"
}
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file or set environment variables in Vercel:

```
GITHUB_TOKEN=your_github_personal_access_token
```

#### GitHub Token Setup

1. Go to GitHub Settings > Developer settings > Personal access tokens
2. Generate a new token with the following permissions:
   - `repo` (Full control of private repositories)
   - `public_repo` (Access public repositories)
3. Copy the token and set it as `GITHUB_TOKEN` environment variable

### 3. Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### 4. Configure Environment Variable in Vercel

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings > Environment Variables
4. Add `GITHUB_TOKEN` with your GitHub personal access token

## Development

```bash
# Start development server
npm run dev

# Test the API
curl -X POST http://localhost:3000/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "appName": "time_receipt",
    "title": "Test feedback",
    "body": "This is a test feedback message",
    "version": "v1.0.0+23"
  }'
```

## Supported Apps

Currently supported apps and their GitHub repositories:

- `time_receipt` → [PawFighters/time_receipt](https://github.com/PawFighters/time_receipt)

To add support for new apps, update the `REPO_CONFIG` object in `api/feedback.ts`:

```typescript
const REPO_CONFIG: GitHubRepoConfig = {
  time_receipt: {
    owner: 'PawFighters',
    repo: 'time_receipt'
  },
  // Add new apps here
  new_app: {
    owner: 'PawFighters',
    repo: 'new_app'
  }
};
```

## Labels

The API automatically creates and assigns labels to GitHub issues:

- `feedback`: Default label for all feedback issues
- Version label (e.g., `v1.0.0+23`): Based on the provided version parameter

If these labels don't exist in the repository, they will be created automatically.

## Error Handling

The API includes comprehensive error handling for:

- Missing required parameters
- Unsupported app names
- GitHub API errors
- Missing environment variables
- Network issues

## CORS

CORS is enabled to allow requests from web applications. The API accepts requests from any origin (`*`).

## License

MIT