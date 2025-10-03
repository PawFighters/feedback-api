import { VercelRequest, VercelResponse } from '@vercel/node';
import { Octokit } from '@octokit/rest';

interface FeedbackRequest {
    appName: string;
    title: string;
    body: string;
    version: string;
}

const GITHUB_OWNER = 'PawFighters';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { appName, title, body, version }: FeedbackRequest = req.body;

        if (!appName || !title || !body || !version) {
            return res.status(400).json({
                error: 'Missing required parameters',
                required: ['appName', 'title', 'body', 'version']
            });
        }

        const githubToken = process.env.GITHUB_TOKEN;
        if (!githubToken) {
            console.error('GITHUB_TOKEN environment variable is not set');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const octokit = new Octokit({
            auth: githubToken,
        });

        const repoExists = await checkRepositoryExists(octokit, GITHUB_OWNER, appName);
        if (!repoExists) {
            return res.status(400).json({
                error: 'Repository not found',
                message: `Repository ${GITHUB_OWNER}/${appName} does not exist`
            });
        }

        const requiredLabels = ['feedback', version];

        await ensureLabelsExist(octokit, GITHUB_OWNER, appName, requiredLabels);

        const issueResponse = await octokit.rest.issues.create({
            owner: GITHUB_OWNER,
            repo: appName,
            title: title,
            body: `${body}\n\n---\n**App:** ${appName}\n**Version:** ${version}`,
            labels: requiredLabels,
        });

        return res.status(201).json({
            success: true,
            issueUrl: issueResponse.data.html_url,
            issueNumber: issueResponse.data.number,
            message: 'Feedback submitted successfully'
        });

    } catch (error) {
        console.error('Error creating GitHub issue:', error);

        if (error instanceof Error && 'status' in error) {
            const githubError = error as any;
            return res.status(githubError.status || 500).json({
                error: 'GitHub API error',
                message: githubError.message,
                details: githubError.response?.data
            });
        }

        return res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

async function checkRepositoryExists(
    octokit: Octokit,
    owner: string,
    repo: string
): Promise<boolean> {
    try {
        await octokit.rest.repos.get({
            owner,
            repo,
        });
        return true;
    } catch (error: any) {
        if (error.status === 404) {
            return false;
        }
        throw error;
    }
}

async function ensureLabelsExist(
    octokit: Octokit,
    owner: string,
    repo: string,
    labelNames: string[]
): Promise<void> {
    for (const labelName of labelNames) {
        try {
            await octokit.rest.issues.getLabel({
                owner,
                repo,
                name: labelName,
            });
        } catch (error: any) {
            if (error.status !== 404) {
                console.error(`Error checking label ${labelName}:`, error);
                continue;
            }

            const labelColor = labelName === 'feedback' ? '0052CC' : '28A745';
            try {
                await octokit.rest.issues.createLabel({
                    owner,
                    repo,
                    name: labelName,
                    color: labelColor,
                    description: labelName === 'feedback'
                        ? 'User feedback from mobile app'
                        : `Version ${labelName}`,
                });
                console.log(`Created label: ${labelName}`);
            } catch (createError) {
                console.error(`Failed to create label ${labelName}:`, createError);
            }
        }
    }
}