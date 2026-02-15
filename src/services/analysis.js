
/**
 * Helper to convert Blob/File to Base64
 */
const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
});

export async function analyzeFoodImage(file, idToken, onProgress) {
    const headers = {
        "Content-Type": "application/json",
        "X-User-Id-Token": idToken || ""
    };

    try {
        // 1. Create ADK Session via Proxy
        const sessionResponse = await fetch('/api/session', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                class_method: "async_create_session",
                input: { user_id: "user-unique-id" }
            })
        });

        if (!sessionResponse.ok) {
            const errText = await sessionResponse.text();
            throw new Error(`Session creation failed: ${errText}`);
        }

        const sessionData = await sessionResponse.json();
        const createdSession = sessionData.output || sessionData;
        const sessionId = createdSession.id;

        if (!sessionId) throw new Error("Could not obtain session ID from Reasoning Engine.");

        // 2. Stream Query via Proxy
        const encodedImage = await fileToBase64(file);
        const payload = {
            class_method: "async_stream_query",
            input: {
                user_id: "user-unique-id",
                session_id: sessionId,
                message: {
                    parts: [
                        { inline_data: { mime_type: file.type || "image/jpeg", data: encodedImage } },
                        { text: "Please analyze this meal image." }
                    ]
                }
            }
        };

        const streamResponse = await fetch('/api/streamQuery', {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });

        if (!streamResponse.ok) {
            const errText = await streamResponse.text();
            throw new Error(`Stream query failed: ${errText}`);
        }

        // 3. Robust SSE Stream Processing
        const reader = streamResponse.body.getReader();
        const decoder = new TextDecoder();
        let fullTextBuffer = "";
        let lineBuffer = "";
        const agentStates = []; // To keep track of all agent outputs

        while (true) {
            const { value, done } = await reader.read();

            const chunk = decoder.decode(value || new Uint8Array(), { stream: !done });
            lineBuffer += chunk;

            const lines = lineBuffer.split('\n');
            lineBuffer = lines.pop(); // Keep the last (potentially partial) line

            for (const line of lines) {
                processLine(line);
            }

            if (done) {
                // Process any remaining partial line in the buffer
                if (lineBuffer.trim()) {
                    processLine(lineBuffer);
                }
                break;
            }
        }

        function processLine(line) {
            const trimmedLine = line.trim();
            if (!trimmedLine) return;

            // Handle both SSE 'data: {...}' and raw JSON '{...}'
            let dataStr = trimmedLine;
            if (trimmedLine.startsWith('data:')) {
                dataStr = trimmedLine.replace('data:', '').trim();
            }
            if (dataStr === '[DONE]') return;

            try {
                // If it looks like multiple JSONs concatenated ( {..}{..} )
                // we'll let extractJsonFromResult handle the extraction from the raw buffer later,
                // but for now let's try to parse it as a single chunk if it's high quality.
                const data = JSON.parse(dataStr);
                agentStates.push(data);

                let textUpdate = "";
                const author = data.author || "system";
                
                // Extract any text parts for the fallback buffer
                const contentParts = data.content?.parts || data.output?.content?.parts;
                if (Array.isArray(contentParts)) {
                    textUpdate = contentParts.map(p => p.text).filter(Boolean).join("\n");
                    contentParts.forEach(p => {
                        if (p.text) fullTextBuffer += "\n" + p.text;
                    });
                } else if (typeof data.output === 'string') {
                    textUpdate = data.output;
                    fullTextBuffer += "\n" + data.output;
                }

                if (onProgress) {
                    const isDone = data.actions?.endOfAgent === true;
                    if (textUpdate || isDone) {
                        onProgress({ author, text: textUpdate, isDone });
                    }
                }
            } catch (e) {
                // If parsing fails, the chunk might be part of a larger JSON
                // or have weird formatting. We'll rely on global extraction at the end.
                // Just append it to the buffer if it contains any braces.
                if (dataStr.includes('{')) {
                    fullTextBuffer += "\n" + dataStr;
                }
            }
        }

        // 4. Extract Final Result
        console.log("Stream finished. Buffer length:", fullTextBuffer.length);

        // First attempt: Check the calculator agent's specific state
        const calculatorOutput = agentStates.reverse().find(s => s.author === "calculator_agent");
        if (calculatorOutput) {
            const potentialText = calculatorOutput.content?.parts?.map(p => p.text).join("\n") || "";
            if (potentialText) {
                try {
                    return extractJsonFromResult(potentialText);
                } catch (e) { /* fallback */ }
            }
        }

        // Second attempt: Search the entire accumulated buffer
        return extractJsonFromResult(fullTextBuffer);

    } catch (error) {
        console.error("Error in analyzeFoodImage:", error);
        throw error;
    }
}

function extractJsonFromResult(text) {
    if (!text) throw new Error("No response text found to extract JSON from.");

    // Find all potential JSON strings by looking for balanced braces
    const results = [];
    let stack = 0;
    let startIdx = -1;

    for (let i = 0; i < text.length; i++) {
        if (text[i] === '{') {
            if (stack === 0) startIdx = i;
            stack++;
        } else if (text[i] === '}') {
            if (stack > 0) {
                stack--;
                if (stack === 0 && startIdx !== -1) {
                    results.push(text.substring(startIdx, i + 1));
                }
            }
        }
    }

    // Iterate backwards through found blocks to find the most complete nutritional data
    for (let i = results.length - 1; i >= 0; i--) {
        try {
            const cleanJson = results[i].trim();
            const data = JSON.parse(cleanJson);

            // Check for our target fields
            if (data.calories !== undefined && (data.foodName || data.items)) {
                return data;
            }
        } catch (e) {
            // Not valid JSON, skip
        }
    }

    // Final fallback: just try the last one found if any
    if (results.length > 0) {
        try {
            return JSON.parse(results[results.length - 1]);
        } catch (e) { /* ignore */ }
    }

    throw new Error("Could not extract nutritional data. The agent might still be thinking or returned an unexpected format.");
}
