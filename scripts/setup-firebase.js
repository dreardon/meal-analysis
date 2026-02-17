import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Helper to run commands
const run = (cmd, ignoreError = false) => {
    try {
        return execSync(cmd, { stdio: 'pipe', encoding: 'utf-8' }).trim();
    } catch (e) {
        if (!ignoreError) {
            console.error(`Error running command: ${cmd}`);
            console.error(e.stderr || e.message);
            process.exit(1);
        }
        return e.stdout ? e.stdout.trim() : '';
    }
};

// Helper for interactive commands (stdio inherit)
const runInteractive = (cmd) => {
    try {
        execSync(cmd, { stdio: 'inherit' });
    } catch (e) {
        console.error(`Command failed: ${cmd}`);
        process.exit(1);
    }
};

console.log("🔥 Starting Automated Firebase Setup...");

// 1. Load .env variables
const envPath = path.join(process.cwd(), '.env');
let envContent = "";
if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
}
const getEnvVar = (key) => {
    const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return match ? match[1].trim() : process.env[key];
};

const PROJECT_ID = getEnvVar('GOOGLE_CLOUD_PROJECT');

if (!PROJECT_ID) {
    console.error("❌ Error: GOOGLE_CLOUD_PROJECT not found in .env or environment variables.");
    console.error("Please set it in .env before running this script.");
    process.exit(1);
}

// 2. Check for firebase CLI
const firebaseCmd = 'npx firebase';

// 3. Login
console.log("\n🔑 Checking Firebase CLI login status...");
try {
    const userOutput = run(`${firebaseCmd} login:list`);
    // Output is usually "Logged in as user@email.com" or "✔  Logged in as user@email.com"
    const emailMatch = userOutput.match(/Logged in as (.*)/);
    if (userOutput.includes('No users logged in')) {
        console.log("Please log in to Firebase:");
        runInteractive(`${firebaseCmd} login`);
    } else if (emailMatch) {
        console.log(`Logged in as: ${emailMatch[1].trim()}`);
    } else {
        // Fallback
        console.log("Logged in.");
    }
} catch (e) {
    runInteractive(`${firebaseCmd} login`);
}

// 4. Ensure Project is Initialized
console.log("\n🔨 Verifying Firebase Project Setup...");
let projects = [];
try {
    const projectsOutput = run(`${firebaseCmd} projects:list --json`, true);
    projects = JSON.parse(projectsOutput);
    // If output is { result: [...] } or something wrapper
    if (projects.result) projects = projects.result; 
    if (!Array.isArray(projects)) projects = [];
} catch (e) {
    console.log("⚠️  Failed to list projects. Your Firebase session might be expired or missing scopes.");
    console.log("Attempting re-authentication...");
    try {
        runInteractive(`${firebaseCmd} login --reauth`);
        // Retry list
        const projectsOutput = run(`${firebaseCmd} projects:list --json`);
        projects = JSON.parse(projectsOutput);
        if (projects.result) projects = projects.result; 
    } catch (retryErr) {
        console.error("❌ Failed to list projects even after re-auth. Please check your internet connection or permissions.");
        // We will proceed, as maybe the project list failed but explicit checks later might work
    }
}

try {
    const existingProject = projects.find(p => p.projectId === PROJECT_ID);

    if (!existingProject && projects.length > 0) {
        // Only attempt automated add if we successfully listed projects and confirmed it's missing
        console.log(`Project ${PROJECT_ID} is not yet a Firebase project. Adding Firebase...`);
        try {
            runInteractive(`${firebaseCmd} projects:addfirebase ${PROJECT_ID}`);
        } catch (addErr) {
            console.error("Failed to add Firebase to project. You may need to do this manually in console.");
            throw addErr;
        }
    } else if (existingProject) {
        console.log(`Project ${PROJECT_ID} is a valid Firebase project.`);
    }
} catch (e) {
    console.warn("Warning: Could not verify project status. Attempting to proceed...");
}

// 5. Get Config
console.log("\n🌐 Configuring Web App...");
// We use explicit --project flag instead of 'firebase use' to be stateless

let configObj = null;
try {
    const appsOutput = run(`${firebaseCmd} apps:list --project ${PROJECT_ID} --json`);
    
    let appsData = [];
    try {
        appsData = JSON.parse(appsOutput);
    } catch (parseErr) {
        // If it's just text "No apps found" or similar which happens sometimes
        console.log("Could not parse apps list JSON. Assuming empty or error:", appsOutput);
    }

    if (appsData && appsData.status === 'error') {
         throw new Error(appsData.error);
    }

    // Ensure array
    if (appsData && appsData.result) appsData = appsData.result;
    if (!Array.isArray(appsData)) {
        appsData = [];
    }

    const webApp = appsData.find(a => a.platform === 'WEB' && a.displayName === 'Meal Analysis');
    
    let appId;
    if (webApp) {
        console.log("Found existing Web App.");
        appId = webApp.appId;
    } else {
        console.log("Creating new Web App 'Meal Analysis'...");
        const createResult = run(`${firebaseCmd} apps:create web "Meal Analysis" --project ${PROJECT_ID} --json`);
        const createData = JSON.parse(createResult);
        appId = createData.result ? createData.result.appId : createData.appId;
    }
    
    console.log("\n📥 Fetching Configuration...");
    // User verified that this command works and returns JSON-like structure
    const configOutput = run(`${firebaseCmd} apps:sdkconfig --project ${PROJECT_ID}`);
    
    try {
        // Try direct JSON parse first (cleaning potential prefix text)
        // Find the first '{' and last '}'
        const firstBrace = configOutput.indexOf('{');
        const lastBrace = configOutput.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1) {
            const jsonStr = configOutput.substring(firstBrace, lastBrace + 1);
            configObj = JSON.parse(jsonStr);
        } else {
             // Fallback to legacy snippet parsing
            const match = configOutput.match(/firebase\.initializeApp\(({[\s\S]*?})\);/);
            if (match && match[1]) {
                const parsedConfig = new Function(`return ${match[1]}`)();
                configObj = parsedConfig;
            } else {
                throw new Error("No config object found in output");
            }
        }
    } catch (e) {
        console.error("Could not parse SDK config output:", e);
        console.log("Raw Output:", configOutput);
        process.exit(1);
    }

} catch (e) {
    console.error("Error managing web app:", e);
    process.exit(1);
}

// 6. Write to .env
console.log("\n📝 Updating .env file...");

// Helper to update or add a line
const updateEnvLine = (lines, key, value) => {
    const index = lines.findIndex(line => line.startsWith(`${key}=`));
    if (index !== -1) {
        lines[index] = `${key}=${value}`;
    } else {
        lines.push(`${key}=${value}`);
    }
};

let lines = envContent.split('\n');

// Add individual keys
if (configObj) {
    updateEnvLine(lines, 'VITE_FIREBASE_API_KEY', `"${configObj.apiKey}"`);
    updateEnvLine(lines, 'VITE_FIREBASE_AUTH_DOMAIN', `"${configObj.authDomain}"`);
    updateEnvLine(lines, 'VITE_FIREBASE_PROJECT_ID', `"${configObj.projectId}"`);
    updateEnvLine(lines, 'VITE_FIREBASE_STORAGE_BUCKET', `"${configObj.storageBucket}"`);
    updateEnvLine(lines, 'VITE_FIREBASE_MESSAGING_SENDER_ID', `"${configObj.messagingSenderId}"`);
    updateEnvLine(lines, 'VITE_FIREBASE_APP_ID', `"${configObj.appId}"`);
}

fs.writeFileSync(envPath, lines.join('\n'));
console.log("Updated Firebase configuration in .env");

// 7. Deploy Rules
console.log("\n🛡️  Deploying Security Rules...");

try {
    console.log("   - Deploying Firestore Rules...");
    runInteractive(`${firebaseCmd} deploy --only firestore:rules --project ${PROJECT_ID}`);
} catch (e) {
    console.error("❌ Failed to deploy Firestore rules. Ensure Firestore is initialized.");
}

console.log("\n✅ Firebase Setup Complete!");
console.log("Please restart your dev server (npm run dev) to apply changes.");
