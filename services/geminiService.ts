
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { AnalysisResults, AuditMovement, BalanceData, ExtractedDeclaration, DeclarationMetadata, ReviewData, AuditOperation, ProcessedDeclaration } from "../types";

const apiKey = process.env.API_KEY || "";
if (!apiKey) {
    console.error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey });

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const cleanJsonResponse = (text: string | undefined): string => {
    if (!text) return "[]";
    let clean = text.trim();
    // Remove markdown code blocks if present
    if (clean.startsWith("```")) {
        clean = clean.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }
    return clean;
};

const generateContentWithRetry = async (
    payload: { model: string, contents: any, config?: any },
    retries = 3,
    initialDelay = 15000 // Increased to 15s initial wait
): Promise<GenerateContentResponse> => {
    if (!apiKey) throw new Error("API Key is missing.");

    let attempt = 0;
    let delay = initialDelay;

    while (attempt < retries) {
        try {
            const response = await ai.models.generateContent(payload);
            return response;
        } catch (error: any) {
            attempt++;
            const errorMessage = String(error);
            const isRateLimitError = errorMessage.includes('429') || /rate|quota|resource_exhausted/i.test(errorMessage);
            const isBadRequest = errorMessage.includes('400') || errorMessage.includes('INVALID_ARGUMENT');

            if (isBadRequest) {
                console.error(`Gemini API 400 Error: ${errorMessage}`);
                throw error;
            }

            if (isRateLimitError) {
                // Extremely aggressive backoff for quota errors: 60s + jitter
                const rateLimitDelay = 60000 + (attempt * 20000) + Math.floor(Math.random() * 10000); 
                console.warn(`Gemini API quota exceeded. Pausing for ${Math.round(rateLimitDelay / 1000)}s... (Attempt ${attempt}/${retries})`);
                
                if (attempt >= retries) throw new Error("Quota exceeded. Please try again later or reduce file size.");
                
                await sleep(rateLimitDelay);
            } else if (attempt < retries) {
                 console.warn(`Gemini API error. Retrying in ${delay / 1000}s...`);
                 await sleep(delay);
                 delay *= 2; 
            } else {
                console.error(`Gemini API call failed after ${attempt} attempts:`, error);
                throw error; 
            }
        }
    }
    throw new Error("Gemini API call failed after all retries.");
};

export const generateBatchComments = async (linesContent: string[]): Promise<string[]> => {
    if (linesContent.length === 0) return [];

    const prompt = `Analiza XML. Comentario BREVE (máx 10 palabras).
Entrada:
${linesContent.map((line, index) => `${index + 1}. ${line.trim().substring(0, 200)}`).join('\n')}

JSON Array strings.`;

    try {
        const response = await generateContentWithRetry({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });

        const jsonStr = cleanJsonResponse(response.text);
        const comments = JSON.parse(jsonStr);
        if (Array.isArray(comments)) return comments;
        return linesContent.map(() => "Error formato IA.");

    } catch (error) {
        return linesContent.map(() => "Error IA.");
    }
};

export const extractDeclarationMetadata = async (textContent: string): Promise<DeclarationMetadata> => {
    if (!textContent) return { numero: "", fecha: "", nit: "", numeral: "", valor: 0, moneda: "USD", tipoOperacion: "Egreso" };

    const prompt = `
    Extrae metadata declaración.
    Texto: """ ${textContent.substring(0, 50000)} """
    JSON: {numero, fecha (YYYY-MM-DD), nit, numeral, valor (number), moneda, tipoOperacion (Ingreso/Egreso)}
    `;

    try {
        const response = await generateContentWithRetry({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { 
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        numero: { type: Type.STRING },
                        fecha: { type: Type.STRING },
                        nit: { type: Type.STRING },
                        numeral: { type: Type.STRING },
                        valor: { type: Type.NUMBER },
                        moneda: { type: Type.STRING },
                        tipoOperacion: { type: Type.STRING }
                    }
                }
            }
        });
        const jsonStr = cleanJsonResponse(response.text);
        return JSON.parse(jsonStr) as DeclarationMetadata;
    } catch (error) {
        return { numero: "", fecha: "", nit: "", numeral: "", valor: 0, moneda: "USD", tipoOperacion: "Egreso" };
    }
};

export const extractBulkDeclarationMetadata = async (docs: { id: string; name: string; content: string }[]): Promise<ProcessedDeclaration[]> => {
    const results: ProcessedDeclaration[] = [];
    
    // Strictly 1 by 1
    const BATCH_SIZE = 1; 
    
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batch = docs.slice(i, i + BATCH_SIZE);
        const validBatch = batch.filter(d => d.content && d.content.trim().length > 0);
        if (validBatch.length === 0) continue;

        // Throttling: Pause 15s between declaration requests
        if (i > 0) {
            await sleep(15000); 
        }

        const prompt = `
        Extrae: id, date (AAAA-MM-DD), amount, number, numeral.
        Doc:
        ${validBatch.map(d => `ID: ${d.id}\n${d.content.substring(0, 50000)}...`).join('\n---\n')}
        JSON Array.
        `;

        try {
             const response = await generateContentWithRetry({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING },
                                date: { type: Type.STRING },
                                amount: { type: Type.NUMBER },
                                number: { type: Type.STRING },
                                numeral: { type: Type.STRING }
                            }
                        }
                    }
                }
            });
            
            const jsonStr = cleanJsonResponse(response.text);
            const parsedBatch = JSON.parse(jsonStr);
            
            if (Array.isArray(parsedBatch)) {
                parsedBatch.forEach((item: any) => {
                    const originalDoc = batch.find(b => b.id === item.id);
                    if (originalDoc) {
                        results.push({
                            id: item.id,
                            fileName: originalDoc.name,
                            date: item.date || '',
                            amount: Number(item.amount) || 0,
                            number: item.number || '',
                            numeral: item.numeral || '',
                            contentSample: originalDoc.content.substring(0, 100) 
                        });
                    }
                });
            }
        } catch (e) {
            console.error("Batch extraction error", e);
            batch.forEach(b => results.push({ id: b.id, fileName: b.name, date: '', amount: 0, number: '', numeral: '', contentSample: '' }));
        }
    }
    return results;
};

// Helper function to process a chunk of pages
const processStatementChunk = async (chunkText: string, filename: string, auditContext?: any): Promise<any[]> => {
    if (!chunkText || chunkText.length < 20) return [];

    const prompt = `Analiza este fragmento de extracto bancario y extrae TODAS las transacciones.
    
    CONTEXTO DE AUDITORÍA:
    - Periodo Auditoría: ${auditContext?.startDate || 'N/A'} a ${auditContext?.endDate || 'N/A'}.
    - Año Auditoría Principal: ${auditContext?.startDate ? auditContext.startDate.split('-')[0] : 'Detectar del texto'}.
    
    INSTRUCCIONES CRÍTICAS:
    1. Extrae TODOS los movimientos visibles en este fragmento.
    2. Si el año no es explícito en la línea, usa el año del contexto o el encabezado del archivo.
    3. Incluye: transferencias, comisiones (Fees), GMF (4x1000), IVA, intereses.
    4. Formato fecha: YYYY-MM-DD.
    5. Monto: Negativo para egresos/débitos, Positivo para ingresos/créditos.
    
    Texto del fragmento:
    ${chunkText}`;

    try {
        const response = await generateContentWithRetry({
            model: 'gemini-2.5-flash', 
            contents: prompt,
            config: { 
                responseMimeType: "application/json",
                responseSchema: { 
                    type: Type.ARRAY, 
                    items: { 
                        type: Type.OBJECT, 
                        properties: { 
                            date: {type: Type.STRING}, 
                            description: {type: Type.STRING}, 
                            amount: {type: Type.NUMBER} 
                        },
                        required: ["date", "description", "amount"]
                    } 
                }
            }
        });
        
        const jsonStr = cleanJsonResponse(response.text);
        const raw = JSON.parse(jsonStr);
        return Array.isArray(raw) ? raw : [];
    } catch (e) {
        console.error("Error processing chunk", e);
        return [];
    }
};

export const extractMovementsFromStatements = async (statements: { name: string; contentPages: string[] }[], auditDetails?: any): Promise<AuditMovement[]> => {
    const allMovements: AuditMovement[] = [];
    
    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        
        // Chunking strategy: Process 2 pages at a time to ensure output token limits aren't hit
        // and every single transaction is captured.
        const CHUNK_SIZE = 2;
        const pages = stmt.contentPages || [];
        
        if (pages.length === 0) continue;

        let movementsInFile = 0;

        for (let j = 0; j < pages.length; j += CHUNK_SIZE) {
            const chunkPages = pages.slice(j, j + CHUNK_SIZE);
            const chunkText = chunkPages.join('\n');
            
            // Add a small delay between chunks to avoid rate limits
            if (i > 0 || j > 0) {
                await sleep(2000); 
            }

            const chunkMovements = await processStatementChunk(chunkText, stmt.name, auditDetails);
            
            if (chunkMovements.length > 0) {
                movementsInFile += chunkMovements.length;
                allMovements.push(...chunkMovements.map((m: any) => ({
                    id: `mov-${Math.random().toString(36).substring(2, 11)}`, 
                    date: m.date, 
                    description: m.description, 
                    amount: Number(m.amount), 
                    sourceFile: stmt.name,
                    operations: [{ 
                        id: `op-${Math.random().toString(36).substring(2, 11)}`, 
                        amount: Number(m.amount), 
                        includeInReview: true, 
                        reviewData: { 
                            documental: { status: '', correctionStatus: null, correctionDate: null }, 
                            banrep: { status: '', correctionStatus: null, correctionDate: null }, 
                            dian: { status: '', correctionStatus: null, correctionDate: null }, 
                            comments: '' 
                        } 
                    }]
                })));
            }
        }

        // If no movements found in the entire file after chunking
        if (movementsInFile === 0) {
             allMovements.push({
                id: `mov-info-${Math.random().toString(36).substring(2, 9)}`,
                date: new Date().toISOString().split('T')[0],
                description: `INFO: No se detectaron movimientos en ${stmt.name} (Revisado ${pages.length} páginas).`,
                amount: 0,
                sourceFile: stmt.name,
                operations: [{
                    id: `op-info-${Math.random().toString(36).substring(2, 9)}`,
                    amount: 0,
                    includeInReview: false,
                    reviewData: { 
                        documental: { status: 'N/A', correctionStatus: null, correctionDate: null }, 
                        banrep: { status: 'N/A', correctionStatus: null, correctionDate: null }, 
                        dian: { status: 'N/A', correctionStatus: null, correctionDate: null }, 
                        comments: 'Verificación automática: Sin transacciones detectadas.' 
                    }
                }]
            });
        }
    }
    return allMovements;
};

export const generateBatchPdfDescriptions = async (fileTexts: string[]) => fileTexts.map(() => "");
export const generateGlobalSummary = async (auditDetails: any, stats: any) => "";
export const performAuditAnalysis = async (docs: any, range: any) => ({ balanceComparison: [], ndcLinks: [], chronologicalReport: [] });
export const generateDocumentSummaryTable = async (docs: any) => ""; 
export const extractDeclarationsDataFromFiles = async (docs: any) => []; 
export const extractCommentsFromPdfReport = async (pdfText: string) => [];
