



import React, { useState, useMemo } from 'react';
import { AuditFileCategory, FileData, ProcessedDeclaration, AuditDetails } from '../types';
import { UploadIcon, FilePdfIcon, TableIcon, TrashIcon, BriefcaseIcon, Loader, SearchCircleIcon, DownloadIcon, EyeIcon, EyeSlashIcon, SearchIcon, DuplicateIcon, UsersIcon, CalendarIcon } from './icons';
import { formatCurrency, mergePdfFiles } from '../utils';

interface FileManagementViewProps {
    auditDetails: AuditDetails;
    onUpdateAuditDetails: (details: AuditDetails) => void;
    auditFiles: AuditFileCategory;
    fileData?: FileData[];
    processedDeclarations?: ProcessedDeclaration[];
    onFilesAdded: (category: keyof AuditFileCategory, files: File[]) => void;
    onGenerateTemplate?: () => void;
    isGenerating?: boolean;
    isProcessingDeclarations?: boolean;
    onLoadProgress?: (file: File) => void;
    onNavigateSearchResult?: (result: { type: 'xml' | 'declaration', id: string, details: any }) => void;
    onRemoveFile?: (category: keyof AuditFileCategory, fileId: string) => void;
}

const FileManagementView: React.FC<FileManagementViewProps> = ({ 
    auditDetails, onUpdateAuditDetails,
    auditFiles, fileData = [], processedDeclarations = [], 
    onFilesAdded, onGenerateTemplate, isGenerating,
    isProcessingDeclarations, onLoadProgress, onNavigateSearchResult,
    onRemoveFile
}) => {
    const [isVisible, setIsVisible] = useState(true);
    const [globalSearch, setGlobalSearch] = useState('');
    const [isMerging, setIsMerging] = useState(false);
    const [dragActiveCategory, setDragActiveCategory] = useState<string | null>(null);
    
    // Global Search Logic
    const searchResults = useMemo(() => {
        if (!globalSearch || globalSearch.length < 2) return [];
        const term = globalSearch.toLowerCase();
        const results: { type: 'xml' | 'declaration', id: string, title: string, subtitle: string, details: any }[] = [];

        // 1. Search in Processed Declarations
        processedDeclarations.forEach(decl => {
            if (
                decl.number.toLowerCase().includes(term) ||
                decl.amount.toString().includes(term) ||
                (decl.numeral && decl.numeral.toLowerCase().includes(term)) ||
                decl.fileName.toLowerCase().includes(term)
            ) {
                results.push({
                    type: 'declaration',
                    id: decl.id,
                    title: `Declaración ${decl.number || 'S/N'}`,
                    subtitle: `${formatCurrency(decl.amount)} - ${decl.date} (${decl.fileName})`,
                    details: decl
                });
            }
        });

        // 2. Search in XML Files
        fileData.forEach(file => {
            file.lines.forEach((line, idx) => {
                if (line.content.toLowerCase().includes(term)) {
                    // Limit results per file to avoid flooding
                    if (results.filter(r => r.type === 'xml' && r.details.fileId === file.id).length < 5) {
                        results.push({
                            type: 'xml',
                            id: line.id,
                            title: `XML: ${file.name}`,
                            subtitle: `Línea ${idx + 1}: ${line.content.trim().substring(0, 60)}...`,
                            details: { fileId: file.id, lineId: line.id }
                        });
                    }
                }
            });
        });

        return results;
    }, [globalSearch, processedDeclarations, fileData]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, category: keyof AuditFileCategory) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            onFilesAdded(category, files);
            e.target.value = ''; 
        }
    };

    // Drag and Drop Handlers
    const handleDragOver = (e: React.DragEvent, categoryKey: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (dragActiveCategory !== categoryKey) {
            setDragActiveCategory(categoryKey);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActiveCategory(null);
    };

    const handleDrop = (e: React.DragEvent, categoryKey: keyof AuditFileCategory) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActiveCategory(null);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const droppedFiles = Array.from(e.dataTransfer.files) as File[];
            
            // Filter files by extension based on category
            const validFiles = droppedFiles.filter(file => {
                const name = file.name.toLowerCase();
                if (categoryKey === 'xmls') return name.endsWith('.xml');
                return name.endsWith('.pdf');
            });

            if (validFiles.length > 0) {
                onFilesAdded(categoryKey, validFiles);
            } else {
                alert(`Formato incorrecto. Por favor arrastre archivos ${categoryKey === 'xmls' ? '.xml' : '.pdf'} para esta sección.`);
            }
        }
    };

    const handleLoadProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            if (onLoadProgress) {
                onLoadProgress(e.target.files[0]);
            }
            e.target.value = '';
        }
    };

    const handleDownloadFile = (file: File) => {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleMergePdfs = async () => {
        const filesToMerge = auditFiles.declaraciones.map(af => af.file);
        if (filesToMerge.length < 2) {
            alert("Se requieren al menos 2 archivos para unificar.");
            return;
        }

        setIsMerging(true);
        try {
            const mergedPdfBytes = await mergePdfFiles(filesToMerge);
            const fileName = `declaraciones_unificadas_${new Date().toISOString().split('T')[0]}.pdf`;
            const mergedFile = new File([mergedPdfBytes], fileName, { type: 'application/pdf' });
            
            onFilesAdded('declaraciones', [mergedFile]);
            alert("¡PDFs unificados exitosamente! El nuevo archivo ha sido añadido a la lista y puede descargarlo si lo desea.");
        } catch (error) {
            alert("Error al unificar los PDFs. Verifique que los archivos sean válidos.");
            console.error(error);
        } finally {
            setIsMerging(false);
        }
    };

    const categories: { key: keyof AuditFileCategory, label: string, icon: React.ReactNode, accept: string, color: string }[] = [
        { key: 'xmls', label: 'Archivos XML', icon: <TableIcon className="w-6 h-6 text-indigo-500" />, accept: '.xml', color: 'bg-indigo-50 border-indigo-200' },
        { key: 'declaraciones', label: 'Declaraciones de Cambio', icon: <FilePdfIcon className="w-6 h-6 text-yellow-500" />, accept: '.pdf', color: 'bg-yellow-50 border-yellow-200' },
        { key: 'banrep', label: 'Archivos Banrep', icon: <FilePdfIcon className="w-6 h-6 text-green-500" />, accept: '.pdf', color: 'bg-green-50 border-green-200' },
        { key: 'extractos', label: 'Extractos Bancarios', icon: <FilePdfIcon className="w-6 h-6 text-blue-500" />, accept: '.pdf', color: 'bg-blue-50 border-blue-200' },
        { key: 'soportesAduaneros', label: 'Soportes Aduaneros (DEX/DIM)', icon: <FilePdfIcon className="w-6 h-6 text-purple-500" />, accept: '.pdf', color: 'bg-purple-50 border-purple-200' },
        { key: 'soportesBancarios', label: 'Soportes Bancarios', icon: <FilePdfIcon className="w-6 h-6 text-pink-500" />, accept: '.pdf', color: 'bg-pink-50 border-pink-200' },
    ];

    const hasExtracts = auditFiles.extractos.length > 0;

    return (
        <div className="h-full flex flex-col p-6 overflow-hidden bg-slate-50/50">
            <div className="mb-6 flex-shrink-0 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-slate-800">Carga de Documentos</h2>
                            <button 
                                onClick={() => setIsVisible(!isVisible)}
                                className="text-slate-400 hover:text-indigo-600 transition-colors p-1 rounded hover:bg-indigo-50"
                                title={isVisible ? "Ocultar panel de carga" : "Mostrar panel de carga"}
                            >
                                {isVisible ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                            </button>
                        </div>
                        <p className="text-slate-500">Gestione la información de la auditoría y sus archivos.</p>
                    </div>
                    
                    {onLoadProgress && (
                        <div className="flex flex-col items-end">
                            <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg shadow-sm cursor-pointer hover:bg-slate-50 transition-all group hover:border-indigo-300">
                                <div className="p-1 bg-indigo-50 rounded group-hover:bg-indigo-100 text-indigo-600">
                                    <UploadIcon className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <span className="block text-sm font-bold text-slate-700 group-hover:text-indigo-700">Cargar Progreso Anterior</span>
                                    <span className="block text-[10px] text-slate-400">Restaurar desde archivo .json</span>
                                </div>
                                <input type="file" accept=".json" className="hidden" onChange={handleLoadProgressChange} />
                            </label>
                        </div>
                    )}
                </div>

                {/* Audit Information Form */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <UsersIcon className="w-4 h-4 text-indigo-500"/>
                        Información de la Auditoría
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-1">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Nombre Empresa</label>
                            <input 
                                type="text"
                                className="w-full text-sm border-slate-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Ej: Importadora SAS"
                                value={auditDetails.companyName}
                                onChange={(e) => onUpdateAuditDetails({ ...auditDetails, companyName: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">NIT</label>
                            <input 
                                type="text"
                                className="w-full text-sm border-slate-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Ej: 900.123.456-7"
                                value={auditDetails.nit}
                                onChange={(e) => onUpdateAuditDetails({ ...auditDetails, nit: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-2 grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1"><CalendarIcon className="w-3 h-3"/> Inicio Periodo</label>
                                <input 
                                    type="date"
                                    className="w-full text-sm border-slate-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                                    value={auditDetails.startDate}
                                    onChange={(e) => onUpdateAuditDetails({ ...auditDetails, startDate: e.target.value })}
                                />
                             </div>
                             <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1"><CalendarIcon className="w-3 h-3"/> Fin Periodo</label>
                                <input 
                                    type="date"
                                    className="w-full text-sm border-slate-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                                    value={auditDetails.endDate}
                                    onChange={(e) => onUpdateAuditDetails({ ...auditDetails, endDate: e.target.value })}
                                />
                             </div>
                        </div>
                    </div>
                </div>

                {/* Global Search Bar */}
                <div className="relative w-full max-w-2xl">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className="h-5 w-5 text-slate-400" />
                    </div>
                    <input 
                        type="text" 
                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                        placeholder="Búsqueda General: Encuentra declaraciones (número, valor) o registros XML..."
                        value={globalSearch}
                        onChange={(e) => setGlobalSearch(e.target.value)}
                    />
                    {globalSearch && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-80 overflow-y-auto z-50">
                            {searchResults.length > 0 ? (
                                <div className="py-2">
                                    <div className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                                        Resultados ({searchResults.length})
                                    </div>
                                    {searchResults.map((result) => (
                                        <button
                                            key={result.id}
                                            onClick={() => {
                                                if (onNavigateSearchResult) onNavigateSearchResult(result);
                                                setGlobalSearch(''); 
                                            }}
                                            className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors border-b border-slate-50 last:border-0 flex items-start gap-3 group"
                                        >
                                            <div className={`p-2 rounded-lg flex-shrink-0 ${result.type === 'xml' ? 'bg-indigo-100 text-indigo-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                                {result.type === 'xml' ? <TableIcon className="w-5 h-5" /> : <FilePdfIcon className="w-5 h-5" />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-700 truncate">{result.title}</p>
                                                <p className="text-xs text-slate-500 truncate font-mono">{result.subtitle}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-slate-400">
                                    <SearchCircleIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">No se encontraron coincidencias</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-grow overflow-y-auto pb-20 transition-all">
                {isVisible ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
                        {categories.map(cat => (
                            <div 
                                key={cat.key} 
                                className={`bg-white rounded-lg shadow-sm border flex flex-col h-full hover:shadow-md transition-all duration-200 ${
                                    dragActiveCategory === cat.key 
                                        ? 'border-indigo-500 ring-2 ring-indigo-200 bg-indigo-50/30 border-dashed scale-[1.01]' 
                                        : 'border-slate-200'
                                }`}
                                onDragOver={(e) => handleDragOver(e, cat.key)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, cat.key)}
                            >
                                <div className={`p-4 border-b flex items-center justify-between transition-colors ${dragActiveCategory === cat.key ? 'bg-indigo-100/50' : cat.color}`}>
                                    <div className="flex items-center gap-3">
                                        {cat.icon}
                                        <h3 className="font-semibold text-slate-700">{cat.label}</h3>
                                        {cat.key === 'declaraciones' && isProcessingDeclarations && (
                                            <span className="flex items-center gap-1 text-[10px] text-indigo-600 bg-white/70 px-2 py-0.5 rounded-full animate-pulse">
                                                <Loader /> Procesando...
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs font-bold bg-white/50 px-2 py-1 rounded text-slate-600">
                                        {auditFiles[cat.key].length}
                                    </span>
                                </div>
                                
                                <div className={`p-4 flex-1 min-h-[120px] transition-colors ${dragActiveCategory === cat.key ? 'bg-indigo-50/20' : 'bg-slate-50'}`}>
                                    {auditFiles[cat.key].length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm italic">
                                            {dragActiveCategory === cat.key ? (
                                                <>
                                                    <UploadIcon className="w-8 h-8 mb-2 text-indigo-500 animate-bounce" />
                                                    <span className="text-indigo-600 font-medium">Suelta los archivos aquí</span>
                                                </>
                                            ) : (
                                                "Sin archivos cargados"
                                            )}
                                        </div>
                                    ) : (
                                        <ul className="space-y-2 relative z-10">
                                            {auditFiles[cat.key].map(file => (
                                                <li key={file.id} className="flex items-center justify-between text-sm bg-white p-2 rounded border border-slate-200 shadow-sm group">
                                                    <div className="flex flex-col min-w-0 pr-2">
                                                        <span className="truncate text-slate-600 font-medium" title={file.file.name}>{file.file.name}</span>
                                                        <span className="text-xs text-slate-400">{(file.file.size / 1024).toFixed(0)} KB</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button 
                                                            onClick={() => handleDownloadFile(file.file)}
                                                            className="p-1.5 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded transition-colors"
                                                            title="Descargar archivo"
                                                        >
                                                            <DownloadIcon className="w-4 h-4" />
                                                        </button>
                                                        {onRemoveFile && (
                                                            <button 
                                                                onClick={() => onRemoveFile(cat.key, file.id)}
                                                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                                title="Eliminar archivo"
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                            {dragActiveCategory === cat.key && (
                                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded border-2 border-indigo-400 border-dashed z-20">
                                                    <span className="text-indigo-600 font-bold">Agregar archivos...</span>
                                                </div>
                                            )}
                                        </ul>
                                    )}
                                </div>

                                <div className="p-4 border-t border-slate-100 bg-white rounded-b-lg space-y-2">
                                    <label className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-white border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors">
                                        <UploadIcon className="w-4 h-4 text-slate-500" />
                                        <span>Cargar Archivos</span>
                                        <input 
                                            type="file" 
                                            multiple 
                                            accept={cat.accept} 
                                            className="hidden" 
                                            onChange={(e) => handleFileChange(e, cat.key)} 
                                        />
                                    </label>
                                    
                                    {cat.key === 'declaraciones' && auditFiles.declaraciones.length > 1 && (
                                        <button 
                                            onClick={handleMergePdfs}
                                            disabled={isMerging}
                                            className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-indigo-50 border border-indigo-200 rounded-md shadow-sm text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
                                            title="Unificar todos los PDFs cargados en un solo archivo"
                                        >
                                            {isMerging ? <Loader /> : <DuplicateIcon className="w-4 h-4" />}
                                            <span>{isMerging ? "Unificando..." : "Unificar PDFs"}</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-slate-400 animate-fade-in">
                        <p className="text-sm font-medium">Panel de carga oculto</p>
                        <button 
                            onClick={() => setIsVisible(true)}
                            className="mt-2 text-indigo-600 hover:underline text-sm flex items-center gap-1"
                        >
                            <EyeIcon className="w-4 h-4" /> Mostrar archivos
                        </button>
                    </div>
                )}
            </div>

            {/* Footer with Action Buttons */}
            <div className="flex-shrink-0 pt-4 border-t border-slate-200 mt-2 flex justify-end gap-4">
                
                {onGenerateTemplate && (
                    <button
                        onClick={onGenerateTemplate}
                        disabled={!hasExtracts || isGenerating}
                        className={`flex items-center gap-3 px-6 py-3 rounded-lg font-bold shadow-lg transition-all transform hover:-translate-y-0.5 ${
                            hasExtracts && !isGenerating
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-500/30'
                                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        }`}
                        title={!hasExtracts ? "Carga extractos bancarios para habilitar" : ""}
                    >
                        {isGenerating ? (
                            <>
                                <Loader /> <span>Generando...</span>
                            </>
                        ) : (
                            <>
                                <BriefcaseIcon className="w-5 h-5" />
                                <span>Generar Plantilla Cronológica</span>
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

export default FileManagementView;
