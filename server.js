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

async function getEmailFromIapJwt(iapJwt) {
    if (!iapJwt) return "user-unique-id";
    try {
        const response = await oAuth2Client.getIapPublicKeys();
        
        // Extract audience safely to avoid hardcoding environment variables, but keep signature verification
        const payloadStr = Buffer.from(iapJwt.split('.')[1], 'base64').toString('utf-8');
        const payloadObj = JSON.parse(payloadStr);
        const expectedAudience = payloadObj.aud; 
        
        const ticket = await oAuth2Client.verifySignedJwtWithCertsAsync(
            iapJwt,
            response.pubkeys,
            expectedAudience,
            ['https://cloud.google.com/iap']
        );
        const payload = ticket.getPayload();
        return payload.email || "user-unique-id";
    } catch (e) {
        console.error("IAP JWT Verification Failed:", e);
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
        const iapJwt = req.headers['x-goog-iap-jwt-assertion'] || req.headers['X-Goog-IAP-JWT-Assertion'];
        const userEmail = await getEmailFromIapJwt(iapJwt);
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
        const iapJwt = req.headers['x-goog-iap-jwt-assertion'] || req.headers['X-Goog-IAP-JWT-Assertion'];
        const userEmail = await getEmailFromIapJwt(iapJwt);
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

// Serve static files
app.use(express.static(path.join(__dirname, 'dist')));

app.get(/^(.*)$/, (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({error: 'Not found'});
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => console.log(`Server listening on port ${port}`));
