import express from 'express';
import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';
import { loadEnvFile } from 'node:process';

try {
    loadEnvFile();
} catch (e) {
    // .env might not exist in production if vars are set via Cloud Run
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json({ limit: '50mb' }));

const auth = new GoogleAuth({
    scopes: 'https://www.googleapis.com/auth/cloud-platform'
});

const oAuth2Client = new OAuth2Client();

async function getEmailFromIdToken(idToken) {
    if (!idToken) return "user-unique-id";
    try {
        const ticket = await oAuth2Client.verifyIdToken({
            idToken: idToken,
            audience: process.env.VITE_GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        return payload.email || "user-unique-id";
    } catch (e) {
        console.error("ID Token Verification Failed:", e);
        return "user-unique-id";
    }
}

async function getAuthHeaders() {
    const client = await auth.getClient();
    const tokenParams = await client.getAccessToken();
    return {
        "Authorization": `Bearer ${tokenParams.token}`,
        "Content-Type": "application/json"
    };
}

const getBaseUrl = () => {
    // Prefer clean name, fallback to old VITE_ name for safety during transition
    const url = process.env.REASONING_ENGINE_URL_BASE || process.env.VITE_REASONING_ENGINE_URL_BASE;
    if (!url) throw new Error("REASONING_ENGINE_URL_BASE environment variable is not set");
    return url;
};

app.post('/api/session', async (req, res) => {
    try {
        const idToken = req.headers['x-user-id-token'];
        const userEmail = await getEmailFromIdToken(idToken);
        if (req.body && req.body.input) req.body.input.user_id = userEmail;

        const baseUrl = getBaseUrl();
        const isLocal = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');

        if (isLocal) {
            const appName = "agent"; 
            const userId = userEmail || "user-unique-id";
            const response = await fetch(`${baseUrl}/apps/${appName}/users/${userId}/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            if (!response.ok) return res.status(response.status).send(await response.text());
            const data = await response.json();
            return res.json({ output: data });
        } else {
            const headers = await getAuthHeaders();
            const response = await fetch(`${baseUrl}:query`, {
                method: 'POST',
                headers,
                body: JSON.stringify(req.body)
            });
            if (!response.ok) return res.status(response.status).send(await response.text());
            res.json(await response.json());
        }
    } catch (e) {
        console.error("Session Error:", e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/streamQuery', async (req, res) => {
    try {
        const idToken = req.headers['x-user-id-token'];
        const userEmail = await getEmailFromIdToken(idToken);
        if (req.body && req.body.input) req.body.input.user_id = userEmail;

        const baseUrl = getBaseUrl();
        const isLocal = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');

        if (isLocal) {
            const parts = (req.body.input.message?.parts || []).map(p => {
                const newPart = { ...p };
                if (newPart.inline_data) {
                    newPart.inlineData = {
                        mimeType: newPart.inline_data.mime_type,
                        data: newPart.inline_data.data
                    };
                    delete newPart.inline_data;
                }
                return newPart;
            });

            const payload = {
                appName: "agent",
                userId: userEmail || "user-unique-id",
                sessionId: req.body.input.session_id,
                newMessage: { ...req.body.input.message, parts }
            };

            const response = await fetch(`${baseUrl}/run_sse`, {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) return res.status(response.status).send(await response.text());
            
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            });
            
            Readable.fromWeb(response.body).pipe(res);
            return;
        }

        const headers = await getAuthHeaders();
        const response = await fetch(`${baseUrl}:streamQuery?alt=sse`, {
            method: 'POST',
            headers,
            body: JSON.stringify(req.body)
        });
        
        if (!response.ok) return res.status(response.status).send(await response.text());
        
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });
        
        Readable.fromWeb(response.body).pipe(res);
    } catch (e) {
        console.error("Stream Error:", e);
        if (!res.headersSent) res.status(500).json({ error: e.message });
        else res.end();
    }
});

// Serve runtime configuration
app.get('/config.js', (req, res) => {
    res.type('application/javascript');
    const config = {
        VITE_GOOGLE_CLIENT_ID: process.env.VITE_GOOGLE_CLIENT_ID,
        VITE_FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY,
        VITE_FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN,
        VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID,
        VITE_FIREBASE_STORAGE_BUCKET: process.env.VITE_FIREBASE_STORAGE_BUCKET,
        VITE_FIREBASE_MESSAGING_SENDER_ID: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        VITE_FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID,
    };
    res.send(`window.ENV = ${JSON.stringify(config)};`);
});

// Serve static files
app.use(express.static(path.join(__dirname, 'dist')));

app.get(/^(.*)$/, (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({error: 'Not found'});
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => console.log(`Server listening on port ${port}`));
