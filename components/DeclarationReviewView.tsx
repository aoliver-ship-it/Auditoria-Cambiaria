
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AuditFile, DeclarationReview, PdfAnnotation, ProcessedDeclaration } from '../types';
import { CloseIcon, Loader, SearchIcon, TrashIcon, CommentIcon, ChevronLeftIcon, ChevronRightIcon, CheckIcon, FilePdfIcon, TableIcon, PlusIcon, SaveIcon, DownloadIcon } from './icons';
import { formatCurrency, getPdfLib, NUMERAL_DESCRIPTIONS, burnAnnotationsToPdf } from '../utils';

interface DeclarationReviewViewProps {
    declarations: AuditFile[];
    reviews: DeclarationReview[];
    processedDeclarations?: ProcessedDeclaration[]; 
    onUpdateReview: (review: DeclarationReview) => void;
    currentUser: string;
    focusFileId?: string | null;
    searchOnLoad?: string;
    onFindXml?: (ndc: string, amount: number, date: string) => void;
    customComments?: string[];
    onSaveCustomComment?: (comment: string) => void;
}

const DeclarationReviewView: React.FC<DeclarationReviewViewProps> = ({ 
    declarations, 
    reviews, 
    processedDeclarations = [],
    onUpdateReview, 
    currentUser, 
    focusFileId, 
    searchOnLoad,
    onFindXml,
    customComments = [],
    onSaveCustomComment
}) => {
    const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
    const [activeReview, setActiveReview] = useState<DeclarationReview | null>(null);

    // PDF Rendering State
    const [pdfDocument, setPdfDocument] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [scale, setScale] = useState(1.2); 
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const renderTaskRef = useRef<any>(null);
    
    // Internal PDF Search
    const [searchText, setSearchText] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResult, setSearchResult] = useState<string | null>(null);

    // Global Sidebar Search State
    const [globalSearchTerm, setGlobalSearchTerm] = useState('');

    // Annotation State
    const [isAddingAnnotation, setIsAddingAnnotation] = useState(false);
    const [annotationInputPos, setAnnotationInputPos] = useState<{x: number, y: number} | null>(null);
    const [currentAnnotationText, setCurrentAnnotationText] = useState('');
    const [annotations, setAnnotations] = useState<PdfAnnotation[]>([]);

    // Dragging State
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Initial load or focus change
    useEffect(() => {
        if (focusFileId) {
            const fileToFocus = declarations.find(d => d.id === focusFileId);
            if (fileToFocus) setSelectedFileId(fileToFocus.id);
        } else if (declarations.length > 0 && !selectedFileId) {
            setSelectedFileId(declarations[0].id);
        }
    }, [focusFileId, declarations, selectedFileId]);

    // Handle File Selection & Load
    useEffect(() => {
        if (!selectedFileId) return;
        
        const fileObj = declarations.find(d => d.id === selectedFileId);
        if (!fileObj) return;

        // Initialize review from props only when file changes
        const existing = reviews.find(r => r.fileId === fileObj.id);
        if (existing) {
            setActiveReview(existing);
            setAnnotations(existing.annotations || []);
        } else {
            setActiveReview({
                fileId: fileObj.id,
                fileName: fileObj.file.name,
                status: 'pending',
                metadata: {
                    numero: '', fecha: '', nit: '', numeral: '', valor: 0, moneda: 'USD', tipoOperacion: 'Egreso'
                },
                auditorComments: '',
                annotations: [],
                reviewedBy: currentUser
            });
            setAnnotations([]);
        }

        // Load PDF
        const loadPdf = async () => {
            setPdfDocument(null);
            setNumPages(0);
            setCurrentPage(1);

            try {
                const arrayBuffer = await fileObj.file.arrayBuffer();
                const pdfjsLib = await getPdfLib();
                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                const pdf = await loadingTask.promise;
                setPdfDocument(pdf);
                setNumPages(pdf.numPages);
            } catch (error) {
                console.error("Error loading PDF", error);
            }
        };

        loadPdf();
    }, [selectedFileId]); 

    // Render Page
    useEffect(() => {
        if (!pdfDocument || !canvasRef.current) return;

        const renderPage = async () => {
            if (renderTaskRef.current) {
                await renderTaskRef.current.cancel();
            }

            try {
                const page = await pdfDocument.getPage(currentPage);
                const viewport = page.getViewport({ scale });
                const canvas = canvasRef.current;
                if (!canvas) return;

                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };

                const renderTask = page.render(renderContext);
                renderTaskRef.current = renderTask;
                await renderTask.promise;
            } catch (error: any) {
                if (error.name !== 'RenderingCancelledException') {
                    console.error("Page render error", error);
                }
            }
        };

        renderPage();
    }, [pdfDocument, currentPage, scale]);

    // Search Logic
    useEffect(() => {
        const termToSearch = searchOnLoad || (globalSearchTerm.length > 4 ? globalSearchTerm : '');
        if (pdfDocument && termToSearch && !isSearching) {
            setSearchText(termToSearch);
            handleSearchDocument(termToSearch);
        }
    }, [pdfDocument, searchOnLoad, globalSearchTerm]);

    const handleSelectFile = (file: AuditFile) => {
        setSelectedFileId(file.id);
        setSearchResult(null);
        if (globalSearchTerm && /[\d.]+/.test(globalSearchTerm)) {
            setSearchText(globalSearchTerm);
        } else {
            setSearchText('');
        }
    };

    const handleSearchDocument = async (term?: string) => {
        const query = term || searchText;
        if (!pdfDocument || !query) return;

        setIsSearching(true);
        setSearchResult(null);

        try {
            let found = false;
            for (let i = 1; i <= numPages; i++) {
                const page = await pdfDocument.getPage(i);
                const textContent = await page.getTextContent();
                const text = textContent.items.map((item: any) => item.str).join(' ');
                
                if (text.toLowerCase().includes(query.toLowerCase())) {
                    setCurrentPage(i);
                    setSearchResult(`Encontrado en página ${i}`);
                    found = true;
                    break;
                }
            }
            if (!found) {
                setSearchResult('No encontrado');
            }
        } catch (e) {
            console.error(e);
            setSearchResult('Error en búsqueda');
        } finally {
            setIsSearching(false);
        }
    };

    // --- ANNOTATION LOGIC ---

    const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!canvasRef.current || draggingId) return; // Don't create if dragging
        
        // Don't start annotation if clicking existing one (handled by stopPropagation, but double check)
        if ((e.target as HTMLElement).closest('.pdf-annotation')) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Convert to percentage
        const xPercent = x / rect.width;
        const yPercent = y / rect.height;

        setAnnotationInputPos({ x: xPercent, y: yPercent });
        setIsAddingAnnotation(true);
        setCurrentAnnotationText('');
    };

    const saveAnnotation = () => {
        if (!activeReview || !annotationInputPos || !currentAnnotationText.trim()) {
            cancelAnnotation();
            return;
        }

        const newAnnotation: PdfAnnotation = {
            id: `ann-${Date.now()}`,
            page: currentPage,
            x: annotationInputPos.x,
            y: annotationInputPos.y,
            text: currentAnnotationText,
            author: currentUser,
            createdAt: new Date().toISOString()
        };

        const updatedAnnotations = [...annotations, newAnnotation];
        setAnnotations(updatedAnnotations);
        
        const updatedReview = { ...activeReview, annotations: updatedAnnotations, reviewedBy: currentUser, reviewedAt: new Date().toISOString() };
        setActiveReview(updatedReview);
        onUpdateReview(updatedReview);
        
        // Also add to custom comments bank if unique
        if(onSaveCustomComment) onSaveCustomComment(currentAnnotationText);

        cancelAnnotation();
    };

    const cancelAnnotation = () => {
        setIsAddingAnnotation(false);
        setAnnotationInputPos(null);
        setCurrentAnnotationText('');
    };

    const deleteAnnotation = (id: string) => {
        // if (!window.confirm("¿Eliminar este comentario?")) return; // Optional confirmation
        if (!activeReview) return;

        const updatedAnnotations = annotations.filter(a => a.id !== id);
        setAnnotations(updatedAnnotations);
        const updatedReview = { ...activeReview, annotations: updatedAnnotations };
        setActiveReview(updatedReview);
        onUpdateReview(updatedReview);
    };

    // --- DRAG AND DROP LOGIC ---

    const startDrag = (e: React.MouseEvent, annId: string) => {
        e.preventDefault();
        e.stopPropagation();
        
        const el = e.currentTarget.closest('.pdf-annotation');
        if (el && containerRef.current) {
            const rect = el.getBoundingClientRect();
            setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
            setDraggingId(annId);
        }
    };

    const onMouseMove = (e: React.MouseEvent) => {
        if (!draggingId || !containerRef.current || !canvasRef.current) return;
        
        const containerRect = canvasRef.current.getBoundingClientRect();
        
        // Calculate new position in pixels relative to canvas
        let newX = e.clientX - containerRect.left - dragOffset.x;
        let newY = e.clientY - containerRect.top - dragOffset.y;

        // Boundaries
        newX = Math.max(0, Math.min(newX, containerRect.width - 50)); 
        newY = Math.max(0, Math.min(newY, containerRect.height - 20));

        // Convert to percentage
        const xPercent = newX / containerRect.width;
        const yPercent = newY / containerRect.height;

        setAnnotations(prev => prev.map(a => 
            a.id === draggingId ? { ...a, x: xPercent, y: yPercent } : a
        ));
    };

    const stopDrag = () => {
        if (draggingId && activeReview) {
            // Save final position to review state
            const updatedReview = { ...activeReview, annotations: annotations };
            setActiveReview(updatedReview);
            onUpdateReview(updatedReview);
        }
        setDraggingId(null);
    };

    // Global mouse up to stop drag even if mouse leaves container
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (draggingId) stopDrag();
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, [draggingId, annotations]);


    const handleDownloadWithComments = async () => {
        const fileObj = declarations.find(d => d.id === selectedFileId);
        if (!fileObj || !activeReview) return;

        try {
            const arrayBuffer = await fileObj.file.arrayBuffer();
            const burnedPdfBytes = await burnAnnotationsToPdf(arrayBuffer, activeReview.annotations || []);
            
            const blob = new Blob([burnedPdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Revisado_${fileObj.file.name}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error generating PDF", error);
            alert("Error al generar el PDF con comentarios.");
        }
    };

    const handleStatusChange = (status: DeclarationReview['status']) => {
        if (!activeReview) return;
        const updated = { ...activeReview, status, reviewedBy: currentUser, reviewedAt: new Date().toISOString() };
        setActiveReview(updated);
        onUpdateReview(updated);
    };

    // Filter Logic
    const filteredDeclarations = useMemo(() => {
        if (!globalSearchTerm) return declarations;
        const lowerTerm = globalSearchTerm.toLowerCase();

        return declarations.filter(file => {
            if (file.file.name.toLowerCase().includes(lowerTerm)) return true;
            const meta = processedDeclarations.find(pd => pd.fileName === file.file.name);
            if (meta) {
                if (meta.number.toLowerCase().includes(lowerTerm)) return true;
                if (meta.amount.toString().includes(lowerTerm)) return true;
                if (meta.date.includes(lowerTerm)) return true;
                if (meta.numeral && meta.numeral.toLowerCase().includes(lowerTerm)) return true;
            }
            return false;
        });
    }, [declarations, processedDeclarations, globalSearchTerm]);

    const currentFileMeta = useMemo(() => {
        if (!selectedFileId) return null;
        const file = declarations.find(d => d.id === selectedFileId);
        if (!file) return null;
        return processedDeclarations.find(pd => pd.fileName === file.file.name);
    }, [selectedFileId, declarations, processedDeclarations]);

    if (declarations.length === 0) {
        return <div className="p-10 text-center text-slate-500">No hay declaraciones cargadas para revisar.</div>;
    }

    return (
        <div className="flex h-full bg-slate-100 overflow-hidden">
            {/* 1. Left Sidebar: File List */}
            <div className="w-72 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col shadow-lg z-20">
                <div className="p-4 border-b bg-slate-50">
                    <h3 className="font-bold text-slate-700 mb-3">Declaraciones ({filteredDeclarations.length})</h3>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon className="h-4 w-4 text-indigo-500" />
                        </div>
                        <input
                            type="text"
                            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm"
                            placeholder="Buscar..."
                            value={globalSearchTerm}
                            onChange={(e) => setGlobalSearchTerm(e.target.value)}
                        />
                        {globalSearchTerm && (
                            <button onClick={() => setGlobalSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
                                <CloseIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="overflow-y-auto flex-1">
                    {filteredDeclarations.map(file => {
                        const review = reviews.find(r => r.fileId === file.id);
                        const isReviewed = review?.status === 'approved';
                        const isCorrection = review?.status === 'correction_needed';
                        const isSelected = file.id === selectedFileId;
                        const meta = processedDeclarations.find(pd => pd.fileName === file.file.name);

                        return (
                            <button
                                key={file.id}
                                onClick={() => handleSelectFile(file)}
                                className={`w-full text-left p-3 border-b border-slate-100 transition-all duration-200 hover:bg-indigo-50/50 relative group ${
                                    isSelected ? 'bg-indigo-50 border-l-4 border-indigo-600 shadow-inner' : 'border-l-4 border-transparent'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="mt-1">
                                        <FilePdfIcon className={`w-5 h-5 ${isSelected ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-400'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-bold truncate ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                                            {meta ? (meta.number ? `Dec. ${meta.number}` : file.file.name) : file.file.name}
                                        </p>
                                        
                                        {meta ? (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
                                                    {formatCurrency(meta.amount)}
                                                </span>
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                                                    {meta.date}
                                                </span>
                                                {meta.numeral && (
                                                    <span 
                                                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 cursor-help"
                                                        title={NUMERAL_DESCRIPTIONS[meta.numeral] || "Descripción no disponible"}
                                                    >
                                                        Num. {meta.numeral}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-400 truncate mt-0.5">{file.file.name}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="absolute top-2 right-2">
                                    <div className={`w-2 h-2 rounded-full ${isReviewed ? 'bg-green-500' : isCorrection ? 'bg-amber-500' : isSelected ? 'bg-indigo-400' : 'bg-slate-300'}`} />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 2. Main PDF Area */}
            <div className="flex-1 bg-slate-200 flex flex-col overflow-hidden relative">
                {/* Toolbar */}
                <div className="h-14 bg-white border-b border-slate-300 flex items-center justify-between px-4 z-20 shadow-sm gap-4">
                    <div className="flex items-center gap-3 flex-1">
                        <div className="flex items-center gap-1 border border-slate-200 rounded-md p-0.5 bg-slate-50">
                            <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="w-6 h-6 hover:bg-white rounded flex items-center justify-center text-slate-600 font-bold">-</button>
                            <span className="text-xs font-mono text-slate-600 w-10 text-center select-none">{Math.round(scale * 100)}%</span>
                            <button onClick={() => setScale(s => Math.min(3.0, s + 0.2))} className="w-6 h-6 hover:bg-white rounded flex items-center justify-center text-slate-600 font-bold">+</button>
                        </div>

                        <div className="h-6 w-px bg-slate-300 mx-1"></div>

                        {/* Status Selector in Toolbar */}
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Estado:</label>
                            <select 
                                value={activeReview?.status || 'pending'} 
                                onChange={(e) => handleStatusChange(e.target.value as any)}
                                className={`text-xs border rounded-md py-1.5 pl-2 pr-6 font-bold outline-none cursor-pointer transition-colors ${
                                    activeReview?.status === 'approved' ? 'bg-green-50 border-green-300 text-green-700' :
                                    activeReview?.status === 'correction_needed' ? 'bg-amber-50 border-amber-300 text-amber-700' :
                                    'bg-white border-slate-300 text-slate-700'
                                }`}
                            >
                                <option value="pending">Pendiente</option>
                                <option value="approved">Aprobado / Correcto</option>
                                <option value="correction_needed">Requiere Corrección</option>
                            </select>
                        </div>

                        {/* Download Button */}
                        <button 
                            onClick={handleDownloadWithComments}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                            title="Descargar PDF con los comentarios incrustados"
                        >
                            <DownloadIcon className="w-4 h-4" />
                            PDF Comentado
                        </button>

                        <div className="flex-1"></div>

                        {onFindXml && (
                            <button
                                onClick={() => {
                                    if (currentFileMeta) {
                                        onFindXml(currentFileMeta.number, currentFileMeta.amount, currentFileMeta.date);
                                    } else {
                                        alert("Esta declaración no tiene metadatos procesados.");
                                    }
                                }}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-colors border ${currentFileMeta ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100' : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'}`}
                                disabled={!currentFileMeta}
                            >
                                <TableIcon className="w-4 h-4" />
                                Buscar en XML
                            </button>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-slate-600 font-medium bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="p-1 hover:bg-white rounded disabled:opacity-30"><ChevronLeftIcon className="w-4 h-4"/></button>
                        <span className="min-w-[3rem] text-center select-none">{currentPage} / {numPages}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} disabled={currentPage >= numPages} className="p-1 hover:bg-white rounded disabled:opacity-30"><ChevronRightIcon className="w-4 h-4"/></button>
                    </div>
                </div>

                {/* Canvas Container */}
                <div 
                    className="flex-1 overflow-auto flex justify-center p-8 relative bg-slate-200/50 cursor-crosshair" 
                    onClick={handleCanvasClick}
                    onMouseMove={onMouseMove}
                >
                    {pdfDocument ? (
                        <div 
                            ref={containerRef}
                            className="relative shadow-2xl border border-slate-300 bg-white" 
                            style={{ width: 'fit-content', height: 'fit-content' }}
                        >
                            <canvas ref={canvasRef} className="block" />
                            
                            {/* Render Annotations Overlay */}
                            {annotations.filter(a => a.page === currentPage).map(ann => (
                                <div 
                                    key={ann.id}
                                    className="absolute pdf-annotation group"
                                    style={{ 
                                        left: `${ann.x * 100}%`, 
                                        top: `${ann.y * 100}%`,
                                        maxWidth: '200px',
                                        cursor: draggingId === ann.id ? 'grabbing' : 'move'
                                    }}
                                    onMouseDown={(e) => startDrag(e, ann.id)}
                                    onClick={(e) => e.stopPropagation()} 
                                >
                                    <div className="text-blue-700 font-bold text-xs bg-white/80 px-1 py-0.5 rounded border border-blue-200 shadow-sm whitespace-pre-wrap hover:bg-white hover:z-50 hover:shadow-md flex items-center gap-1 select-none">
                                        {ann.text}
                                        <button 
                                            onMouseDown={(e) => e.stopPropagation()} // Prevent drag start
                                            onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }}
                                            className="ml-1 text-slate-400 hover:text-red-500 cursor-pointer p-0.5 rounded hover:bg-red-50"
                                            title="Eliminar comentario"
                                        >
                                            <TrashIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* New Annotation Input */}
                            {isAddingAnnotation && annotationInputPos && (
                                <div 
                                    className="absolute z-50 bg-white p-3 rounded-lg shadow-xl border border-indigo-300 flex flex-col gap-2 w-72 animate-fade-in-fast"
                                    style={{ 
                                        left: `${annotationInputPos.x * 100}%`, 
                                        top: `${annotationInputPos.y * 100}%`,
                                        cursor: 'default'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <textarea
                                        autoFocus
                                        className="w-full text-xs border border-slate-300 rounded p-2 resize-y min-h-[60px] text-blue-800 font-medium focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-400"
                                        placeholder="Escribe el comentario..."
                                        value={currentAnnotationText}
                                        onChange={(e) => setCurrentAnnotationText(e.target.value)}
                                        onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveAnnotation(); }}}
                                    />
                                    <div className="flex flex-col gap-2">
                                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar">
                                            {customComments.map((c, i) => (
                                                <button 
                                                    key={i} 
                                                    onClick={() => setCurrentAnnotationText(c)}
                                                    className="text-[10px] bg-slate-50 px-2 py-1 rounded border border-slate-200 hover:bg-indigo-50 text-slate-600 truncate max-w-full text-left"
                                                    title={c}
                                                >
                                                    {c}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex justify-end gap-2 border-t pt-2 mt-1">
                                            <button onClick={cancelAnnotation} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded bg-white border border-slate-200">Cancelar</button>
                                            <button onClick={saveAnnotation} className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 shadow-sm">Guardar</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                         <div className="flex items-center justify-center h-full text-slate-500"><Loader /> <span className="ml-2">Renderizando PDF...</span></div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeclarationReviewView;
