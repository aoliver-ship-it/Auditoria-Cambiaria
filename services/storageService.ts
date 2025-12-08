
import { ProgressData, SerializableAuditFile, SerializableAuditFileCategory, AuditFile, AuditFileCategory, FileData, AuditMovement, DeclarationReview } from "../types";

const DB_NAME = 'cca_audit_db';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';
const LEGACY_KEY_PREFIX = 'cca-progress-'; 

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME); 
            }
        };
        request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
        request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error);
    });
};

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

export const base64ToFile = (base64: string, filename: string, mimeType: string, lastModified: number): File => {
    try {
        const arr = base64.split(',');
        const extractedMime = arr.length > 1 ? arr[0].match(/:(.*?);/)?.[1] : null;
        let finalMime = extractedMime || mimeType;
        const ext = filename.split('.').pop()?.toLowerCase();
        
        if (ext === 'pdf') finalMime = 'application/pdf';
        else if (ext === 'xml') finalMime = 'text/xml';
        else if (ext === 'json') finalMime = 'application/json';
        else if (ext === 'txt') finalMime = 'text/plain';
        
        if (!finalMime) finalMime = 'application/octet-stream';

        const bstr = atob(arr.length > 1 ? arr[1] : arr[0]); 
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) { u8arr[n] = bstr.charCodeAt(n); }
        return new File([u8arr], filename, { type: finalMime, lastModified: lastModified || Date.now() });
    } catch (e) {
        console.error("Error converting base64 to file:", filename, e);
        const fallbackType = filename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';
        return new File([""], filename, { type: fallbackType, lastModified: lastModified || Date.now() });
    }
};

const cleanFileData = (fd: FileData[]): FileData[] => {
    if (!Array.isArray(fd)) return [];
    return fd.map(f => ({
        id: f.id,
        name: f.name,
        content: f.content,
        lines: Array.isArray(f.lines) ? f.lines.map(l => ({
            id: l.id,
            content: l.content,
            status: l.status,
            comment: l.comment
        })) : []
    }));
};

const cleanMovements = (movs: AuditMovement[]): AuditMovement[] => {
    if (!Array.isArray(movs)) return [];
    return movs.map(m => ({
        id: m.id,
        date: m.date,
        description: m.description,
        amount: m.amount,
        sourceFile: m.sourceFile,
        linkedDeclarations: Array.isArray(m.linkedDeclarations) ? m.linkedDeclarations.map(l => ({ ...l })) : [],
        linkedXmls: Array.isArray(m.linkedXmls) ? m.linkedXmls.map(l => ({ ...l })) : [],
        operations: Array.isArray(m.operations) ? m.operations.map(op => ({
            id: op.id,
            amount: op.amount,
            includeInReview: op.includeInReview,
            reviewData: {
                documental: { ...op.reviewData.documental },
                banrep: { ...op.reviewData.banrep },
                dian: { ...op.reviewData.dian },
                comments: op.reviewData.comments || ''
            }
        })) : []
    }));
};

const cleanReviews = (reviews: DeclarationReview[]): DeclarationReview[] => {
    if (!Array.isArray(reviews)) return [];
    return reviews.map(r => ({ ...r, metadata: { ...r.metadata } }));
};

export const prepareForJsonExport = async (
    data: ProgressData, 
    auditFiles: AuditFileCategory
): Promise<ProgressData> => {
    
    const exportData: ProgressData = {
        version: data.version || 1,
        auditDetails: { ...data.auditDetails },
        customComments: [...(data.customComments || [])],
        chronologicalMovements: cleanMovements(data.chronologicalMovements || []),
        fileData: cleanFileData(data.fileData || []),
        declarationReviews: cleanReviews(data.declarationReviews || []),
        processedDeclarations: [...(data.processedDeclarations || [])], // Export processed metadata
        auditFiles: { 
            declaraciones: [], banrep: [], extractos: [], soportesAduaneros: [], soportesBancarios: [], xmls: []
        }
    };
    
    const categories: (keyof AuditFileCategory)[] = ['declaraciones', 'banrep', 'extractos', 'soportesAduaneros', 'soportesBancarios', 'xmls'];
    
    for (const cat of categories) {
        const files = auditFiles[cat];
        const serializableFiles: SerializableAuditFile[] = [];
        
        if (Array.isArray(files)) {
            for (const fileObj of files) {
                const file = fileObj.file as unknown as File; 
                try {
                    if (!(file instanceof File)) continue;
                    const base64 = await fileToBase64(file);
                    serializableFiles.push({
                        id: fileObj.id,
                        file: {
                            name: file.name,
                            size: file.size,
                            type: file.type || 'application/octet-stream',
                            lastModified: file.lastModified
                        },
                        content: base64,
                        password: fileObj.password
                    });
                } catch (err) {
                    console.warn(`Failed to convert file ${file.name}`, err);
                }
            }
        }
        // @ts-ignore
        exportData.auditFiles[cat] = serializableFiles;
    }
    
    return exportData;
};

export const saveSessionToDB = async (username: string, data: ProgressData): Promise<void> => {
    const db = await openDB();
    
    const cleanData: ProgressData = {
        version: data.version || 1,
        auditDetails: { ...data.auditDetails },
        customComments: [...(data.customComments || [])],
        chronologicalMovements: cleanMovements(data.chronologicalMovements || []),
        fileData: cleanFileData(data.fileData || []),
        declarationReviews: cleanReviews(data.declarationReviews || []),
        processedDeclarations: [...(data.processedDeclarations || [])], // Save metadata
        auditFiles: data.auditFiles 
    };

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(cleanData, username);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const loadSessionFromDB = async (username: string): Promise<ProgressData | null> => {
    try {
        const db = await openDB();
        const idbData = await new Promise<ProgressData | undefined>((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(username);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        if (idbData) return idbData;
    } catch (e) {}
    const legacyData = localStorage.getItem(LEGACY_KEY_PREFIX + username);
    if (legacyData) { try { return JSON.parse(legacyData); } catch (e) {} }
    return null;
};

export const checkSessionExists = async (username: string): Promise<boolean> => {
    try {
        const db = await openDB();
        const existsInIDB = await new Promise<boolean>((resolve) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.count(username);
            request.onsuccess = () => resolve(request.result > 0);
            request.onerror = () => resolve(false);
        });
        if (existsInIDB) return true;
    } catch (e) {}
    return !!localStorage.getItem(LEGACY_KEY_PREFIX + username);
};

export const deleteSessionFromDB = async (username: string): Promise<void> => {
    try {
        const db = await openDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.delete(username);
    } catch (e) {}
    localStorage.removeItem(LEGACY_KEY_PREFIX + username);
};

export const reconstructAuditFiles = (serializableCategory: SerializableAuditFileCategory): AuditFileCategory => {
    const result: AuditFileCategory = { declaraciones: [], banrep: [], extractos: [], soportesAduaneros: [], soportesBancarios: [], xmls: [] };
    if (!serializableCategory) return result;
    const categories: (keyof AuditFileCategory)[] = ['declaraciones', 'banrep', 'extractos', 'soportesAduaneros', 'soportesBancarios', 'xmls'];
    for (const cat of categories) {
        // @ts-ignore
        const sFiles = serializableCategory[cat] || [];
        result[cat] = sFiles.map((sf: any) => {
            let fileObj: File;
            if (sf.file instanceof File) { fileObj = sf.file; } 
            else if (sf.content && typeof sf.content === 'string') { 
                let mimeType = sf.file.type;
                if (!mimeType || mimeType === 'application/octet-stream') {
                     if (sf.file.name.toLowerCase().endsWith('.pdf')) mimeType = 'application/pdf';
                     else if (sf.file.name.toLowerCase().endsWith('.xml')) mimeType = 'text/xml';
                }
                fileObj = base64ToFile(sf.content, sf.file.name, mimeType, sf.file.lastModified); 
            } 
            else { 
                fileObj = new File([""], sf.file?.name || "unknown", { type: sf.file?.type || "application/octet-stream", lastModified: sf.file?.lastModified || Date.now() }); 
            }
            return { id: sf.id, file: fileObj, password: sf.password };
        });
    }
    return result;
};