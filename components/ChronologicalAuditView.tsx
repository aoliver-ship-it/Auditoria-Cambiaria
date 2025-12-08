

import React, { useState, ChangeEvent, useMemo } from 'react';
import { AuditMovement, SmartLink, ProcessedDeclaration, FileData, DeclarationReview, ReviewData, CorrectionStatus } from '../types';
import { DOCUMENTAL_OPTIONS, BANREP_OPTIONS, DIAN_OPTIONS, extractXmlAttributes, formatCurrency } from '../utils';
import { CloseIcon, TrashIcon, FilePdfIcon, PlusIcon, CommentIcon, SearchIcon, TableIcon, PlusCircleIcon, MinusCircleIcon, FilterIcon, CheckIcon } from './icons';
import DeclarationLinkModal from './DeclarationLinkModal'; 

interface ChronologicalAuditViewProps {
    movements: AuditMovement[];
    setMovements: React.Dispatch<React.SetStateAction<AuditMovement[]>>;
    undo: () => void;
    canUndo: boolean;
    redo: () => void;
    canRedo: boolean;
    onNavigate?: (link: SmartLink) => void;
    declarationsList: string[]; 
    processedDeclarations?: ProcessedDeclaration[];
    onAddDeclarationLink: (movementId: string, declarationFileName: string) => void;
    onRemoveDeclarationLink: (movementId: string, targetFileName: string) => void;
    onFindXml?: (ndc: string, amount: number, date: string, movementId?: string) => void;
    fileData?: FileData[]; 
    reviews?: DeclarationReview[]; 
}

const ChronologicalAuditView: React.FC<ChronologicalAuditViewProps> = ({ 
    movements, setMovements, onNavigate, 
    declarationsList, processedDeclarations, onAddDeclarationLink, onRemoveDeclarationLink,
    onFindXml, reviews, fileData = []
}) => {
    
    // Updated Filter State
    const [filters, setFilters] = useState({ 
        year: '', 
        month: '', 
        description: '', 
        amount: '' 
    });
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [activeMovementForLinking, setActiveMovementForLinking] = useState<AuditMovement | null>(null);

    const handleDeleteMovementLocal = (movementId: string) => { 
        if (window.confirm('¿Eliminar movimiento?')) setMovements(prev => prev.filter(m => m.id !== movementId)); 
    };

    // --- SPLIT OPERATIONS LOGIC ---
    const handleAddSplit = (movementId: string) => {
        setMovements(prev => prev.map(m => {
            if (m.id !== movementId) return m;
            const newOp = {
                id: `op-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                amount: 0,
                includeInReview: true,
                reviewData: { documental: { status: '', correctionStatus: null, correctionDate: null }, banrep: { status: '', correctionStatus: null, correctionDate: null }, dian: { status: '', correctionStatus: null, correctionDate: null }, comments: '' }
            };
            return { ...m, operations: [...m.operations, newOp] };
        }));
    };

    const handleRemoveSplit = (movementId: string, operationId: string) => {
        if (!window.confirm("¿Eliminar esta división?")) return;
        setMovements(prev => prev.map(m => {
            if (m.id !== movementId) return m;
            if (m.operations.length <= 1) { alert("No se puede eliminar la única operación."); return m; }
            return { ...m, operations: m.operations.filter(op => op.id !== operationId) };
        }));
    };

    const handleAmountChange = (movementId: string, operationId: string, val: string) => {
        const newAmount = parseFloat(val);
        setMovements(prev => prev.map(m => m.id !== movementId ? m : {
            ...m, operations: m.operations.map(op => op.id === operationId ? { ...op, amount: isNaN(newAmount) ? 0 : newAmount } : op)
        }));
    };

    const handleOperationChange = (mid: string, oid: string, upd: any) => {
        setMovements(prev => prev.map(m => m.id !== mid ? m : { 
            ...m, 
            operations: m.operations.map(op => op.id === oid ? { ...op, ...upd } : op) 
        }));
    };

    const handleDeepReviewChange = (mid: string, oid: string, area: keyof ReviewData, field: string, value: any) => {
        setMovements(prev => prev.map(m => {
            if (m.id !== mid) return m;
            return {
                ...m,
                operations: m.operations.map(op => {
                    if (op.id !== oid) return op;
                    // @ts-ignore
                    const areaData = { ...op.reviewData[area], [field]: value };
                    return { ...op, reviewData: { ...op.reviewData, [area]: areaData } };
                })
            };
        }));
    };

    // Dynamic Filter Data
    const availableYears = useMemo(() => {
        const years = new Set(movements.map(m => m.date.substring(0, 4)));
        return Array.from(years).sort();
    }, [movements]);

    const months = [
        { value: '01', label: 'Enero' }, { value: '02', label: 'Febrero' }, { value: '03', label: 'Marzo' },
        { value: '04', label: 'Abril' }, { value: '05', label: 'Mayo' }, { value: '06', label: 'Junio' },
        { value: '07', label: 'Julio' }, { value: '08', label: 'Agosto' }, { value: '09', label: 'Septiembre' },
        { value: '10', label: 'Octubre' }, { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' }
    ];

    const filteredMovements = useMemo(() => {
        // 1. Filter
        const filtered = movements.filter(movement => {
            if (filters.year && !movement.date.startsWith(filters.year)) return false;
            if (filters.month) {
                const movMonth = movement.date.split('-')[1];
                if (movMonth !== filters.month) return false;
            }
            if (filters.description && !movement.description.toLowerCase().includes(filters.description.toLowerCase())) return false;
            if (filters.amount && !movement.amount.toString().includes(filters.amount)) return false;
            return true;
        });

        // 2. Sort
        return filtered.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });
    }, [movements, filters, sortOrder]);

    // Automatic XML Search Helper
    const findAutoXmlMatch = (movement: AuditMovement) => {
        const targetAmt = Math.abs(movement.amount);
        const targetDate = movement.date; 

        // First pass: Match Amount AND Date
        for (const file of fileData) {
            for (let i = 0; i < file.lines.length; i++) {
                const line = file.lines[i];
                if (line.content.includes(targetAmt.toString()) || line.content.includes(targetAmt.toFixed(2))) {
                    const attrs = extractXmlAttributes(line.content);
                    const vusdMatch = Math.abs(attrs.vusd - targetAmt) < 0.05;
                    const vusdiMatch = Math.abs(attrs.vusdi - targetAmt) < 0.05;

                    if (vusdMatch || vusdiMatch) {
                        if (line.content.includes(targetDate)) {
                            return { 
                                fileId: file.id, 
                                fileName: file.name, 
                                lineId: line.id, 
                                content: line.content, 
                                matchType: 'perfect' 
                            };
                        }
                    }
                }
            }
        }

        // Second pass: Match Amount Only (fallback)
        for (const file of fileData) {
            for (let i = 0; i < file.lines.length; i++) {
                const line = file.lines[i];
                if (line.content.includes(targetAmt.toString()) || line.content.includes(targetAmt.toFixed(2))) {
                    const attrs = extractXmlAttributes(line.content);
                    if (Math.abs(attrs.vusd - targetAmt) < 0.05 || Math.abs(attrs.vusdi - targetAmt) < 0.05) {
                        return { 
                            fileId: file.id, 
                            fileName: file.name, 
                            lineId: line.id, 
                            content: line.content, 
                            matchType: 'amount' 
                        };
                    }
                }
            }
        }
        return null;
    };

    const ReviewBlock = ({ movementId, operationId, area, data, options, bgColor }: any) => (
        <>
            <td className={`p-1 align-top ${bgColor} border-r border-slate-200`}>
                <select value={data.status} onChange={(e) => handleDeepReviewChange(movementId, operationId, area, 'status', e.target.value)} title={data.status} className="w-full text-[11px] py-1 border-slate-300 rounded shadow-sm focus:ring-1 focus:ring-indigo-500 min-w-[160px]">
                    <option value="">- Estado -</option>
                    {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            </td>
            <td className={`p-1 align-top ${bgColor} border-r border-slate-200`}>
                <select value={data.correctionStatus || ''} onChange={(e) => handleDeepReviewChange(movementId, operationId, area, 'correctionStatus', e.target.value || null)} className={`w-full text-[11px] py-1 border-slate-300 rounded shadow-sm font-bold min-w-[100px] ${data.correctionStatus === 'CORREGIDO' ? 'text-green-700' : data.correctionStatus === 'SIN CORREGIR' ? 'text-red-700' : 'text-slate-500'}`}>
                    <option value="">- N/A -</option>
                    <option value="CORREGIDO">Corregido</option>
                    <option value="SIN CORREGIR">Sin Corregir</option>
                </select>
            </td>
            <td className={`p-1 align-top ${bgColor} border-r-2 border-slate-300`}>
                <input type="date" value={data.correctionDate || ''} onChange={(e) => handleDeepReviewChange(movementId, operationId, area, 'correctionDate', e.target.value || null)} className="w-full text-[10px] py-1 border-slate-300 rounded shadow-sm min-w-[90px]" />
            </td>
        </>
    );

    return (
        <div className="flex-grow overflow-auto bg-slate-100 p-4 space-y-4">
            {/* Filters Bar */}
            <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 flex flex-wrap gap-4 items-end">
                <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold border-r border-slate-200 pr-4 mr-2">
                    <FilterIcon className="w-5 h-5" />
                    Filtros
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Año</label>
                    <select 
                        value={filters.year} 
                        onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
                        className="text-xs border-slate-300 rounded focus:ring-indigo-500 w-24 py-1.5"
                    >
                        <option value="">Todos</option>
                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Mes</label>
                    <select 
                        value={filters.month} 
                        onChange={(e) => setFilters(prev => ({ ...prev, month: e.target.value }))}
                        className="text-xs border-slate-300 rounded focus:ring-indigo-500 w-32 py-1.5"
                    >
                        <option value="">Todos</option>
                        {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                </div>

                <div className="flex flex-col gap-1 flex-grow max-w-xs">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Descripción</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                            <SearchIcon className="h-3 w-3 text-slate-400" />
                        </div>
                        <input 
                            type="text" 
                            placeholder="Buscar en descripción..." 
                            value={filters.description}
                            onChange={(e) => setFilters(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full pl-7 text-xs border-slate-300 rounded focus:ring-indigo-500 py-1.5"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Valor</label>
                    <input 
                        type="number" 
                        placeholder="Ej: 1000" 
                        value={filters.amount}
                        onChange={(e) => setFilters(prev => ({ ...prev, amount: e.target.value }))}
                        className="text-xs border-slate-300 rounded focus:ring-indigo-500 w-28 py-1.5"
                    />
                </div>

                <button 
                    onClick={() => setFilters({ year: '', month: '', description: '', amount: '' })}
                    className="ml-auto text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded transition-colors flex items-center gap-1"
                >
                    <CloseIcon className="w-3 h-3" /> Limpiar
                </button>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-slate-200">
                <table className="min-w-full text-sm divide-y divide-slate-300 border-collapse">
                    <thead className="bg-slate-100 sticky top-0 z-20 shadow-sm">
                        <tr>
                            <th 
                                className="p-2 text-left font-semibold text-slate-700 border-r border-slate-200 cursor-pointer hover:bg-slate-200 select-none group" 
                                rowSpan={2}
                                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                title="Click para ordenar por fecha"
                            >
                                <div className="flex items-center justify-between gap-1">
                                    Fecha
                                    <span className={`text-[10px] transition-transform ${sortOrder === 'asc' ? 'text-indigo-600' : 'text-slate-400 rotate-180'}`}>
                                        ▲
                                    </span>
                                </div>
                            </th>
                            <th className="p-2 text-left font-semibold text-slate-700 border-r border-slate-200 min-w-[200px]" rowSpan={2}>Descripción Movimiento</th>
                            <th className="p-2 text-right font-semibold text-slate-700 border-r border-slate-200" rowSpan={2}>Valor Operación</th>
                            {/* Eliminada columna Declaración de Cambio */}
                            <th className="p-2 text-center font-semibold text-slate-700 border-r border-slate-200 min-w-[200px] bg-indigo-50" rowSpan={2}>Op. en XML</th>
                            <th className="p-1 text-center font-bold text-blue-800 bg-blue-100 border-r-2 border-blue-200 border-b border-blue-200" colSpan={3}>Revisión Documental</th>
                            <th className="p-1 text-center font-bold text-green-800 bg-green-100 border-r-2 border-green-200 border-b border-green-200" colSpan={3}>Revisión BANREP</th>
                            <th className="p-1 text-center font-bold text-amber-800 bg-amber-100 border-r-2 border-amber-200 border-b border-amber-200" colSpan={3}>Revisión DIAN</th>
                            <th className="p-2 text-center font-semibold text-slate-700 min-w-[250px]" rowSpan={2}>Comentarios Auditor</th>
                            <th className="p-2 text-center font-semibold text-slate-700" rowSpan={2}>Acción</th>
                        </tr>
                        <tr className="text-[10px] text-slate-500 uppercase tracking-wider">
                            <th className="px-1 py-1 bg-blue-50 font-semibold text-center">Estado</th><th className="px-1 py-1 bg-blue-50 font-semibold text-center">Corr.</th><th className="px-1 py-1 bg-blue-50 font-semibold border-r-2 border-blue-200 text-center">Fecha</th>
                            <th className="px-1 py-1 bg-green-50 font-semibold text-center">Estado</th><th className="px-1 py-1 bg-green-50 font-semibold text-center">Corr.</th><th className="px-1 py-1 bg-green-50 font-semibold border-r-2 border-green-200 text-center">Fecha</th>
                            <th className="px-1 py-1 bg-amber-50 font-semibold text-center">Estado</th><th className="px-1 py-1 bg-amber-50 font-semibold text-center">Corr.</th><th className="px-1 py-1 bg-amber-50 font-semibold border-r-2 border-amber-200 text-center">Fecha</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {filteredMovements.length === 0 ? (
                            <tr>
                                <td colSpan={14} className="p-8 text-center text-slate-500">
                                    No se encontraron movimientos con los filtros aplicados.
                                </td>
                            </tr>
                        ) : (
                            filteredMovements.map((movement, movIndex) => {
                                const totalSplit = movement.operations.reduce((sum, op) => sum + op.amount, 0);
                                const diff = Math.abs(movement.amount - totalSplit);
                                const isSplitValid = diff < 0.01;
                                
                                // Auto Search XML Logic (Memoized calculation happens during render for simplicity, or could use effect)
                                const autoXmlMatch = findAutoXmlMatch(movement);

                                return (
                                <React.Fragment key={movement.id}>
                                    {movement.operations.map((op, opIndex) => {
                                        return (
                                        <tr key={op.id} className={`hover:bg-slate-50 transition-colors ${movIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                                            {opIndex === 0 && (
                                                <>
                                                    <td className="p-2 font-medium align-top whitespace-nowrap min-w-[100px] border-r border-slate-100" rowSpan={movement.operations.length}>
                                                        <div>{movement.date}</div>
                                                    </td>
                                                    <td className="p-2 align-top text-[10px] border-r border-slate-100" rowSpan={movement.operations.length}>
                                                        {movement.description}
                                                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                                                            <button onClick={() => handleAddSplit(movement.id)} className="text-[10px] flex items-center gap-1 text-indigo-600 hover:bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200"><PlusCircleIcon className="w-3 h-3" /> Dividir</button>
                                                            {!isSplitValid && <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1 rounded border border-red-200">Dif: {formatCurrency(movement.amount - totalSplit)}</span>}
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                            <td className="p-2 text-right align-top text-xs font-mono border-r border-slate-100 relative group/amt">
                                                <div className="flex items-center justify-end gap-1">
                                                    <input type="number" value={op.amount} onChange={(e) => handleAmountChange(movement.id, op.id, e.target.value)} className={`w-24 text-right border-none bg-transparent focus:ring-1 focus:ring-indigo-500 rounded p-0.5 font-bold ${op.amount >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                                                    {movement.operations.length > 1 && <button onClick={() => handleRemoveSplit(movement.id, op.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover/amt:opacity-100 transition-opacity"><MinusCircleIcon className="w-3 h-3" /></button>}
                                                </div>
                                            </td>
                                            {opIndex === 0 && (
                                                <td className="p-2 align-top text-center bg-indigo-50/20 border-r border-slate-100" rowSpan={movement.operations.length}>
                                                     {/* Prioritize Linked XMLs (Manual) */}
                                                     {movement.linkedXmls && movement.linkedXmls.length > 0 ? (
                                                         <div className="flex flex-col gap-1">
                                                            {movement.linkedXmls.map((xmlLink, i) => (
                                                                <button key={i} onClick={() => onNavigate && onNavigate(xmlLink)} className="flex items-center gap-1 text-[10px] text-indigo-600 hover:underline bg-white border border-indigo-200 rounded px-2 py-1 shadow-sm truncate max-w-full" title={xmlLink.label}>
                                                                    <TableIcon className="w-3 h-3 flex-shrink-0 text-indigo-500" />
                                                                    <span className="truncate">{xmlLink.label.replace("XML: ", "")}</span>
                                                                </button>
                                                            ))}
                                                         </div>
                                                     ) : autoXmlMatch ? (
                                                        /* Automatic Match Display */
                                                        <button 
                                                            onClick={() => onNavigate && onNavigate({
                                                                type: 'xml',
                                                                label: autoXmlMatch.fileName,
                                                                targetFileId: autoXmlMatch.fileId,
                                                                targetLineId: autoXmlMatch.lineId,
                                                                targetFileName: autoXmlMatch.fileName
                                                            })}
                                                            className={`w-full text-left flex flex-col gap-0.5 p-1.5 rounded border transition-colors ${autoXmlMatch.matchType === 'perfect' ? 'bg-green-50 border-green-200 hover:bg-green-100' : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'}`}
                                                            title="Clic para ver en XML"
                                                        >
                                                            <div className="flex items-center gap-1 font-bold text-[10px] text-slate-700">
                                                                <CheckIcon className={`w-3 h-3 ${autoXmlMatch.matchType === 'perfect' ? 'text-green-600' : 'text-yellow-600'}`} />
                                                                <span className="truncate">{autoXmlMatch.fileName}</span>
                                                            </div>
                                                            <code className="text-[9px] text-slate-500 font-mono truncate block bg-white/50 px-1 rounded">
                                                                {autoXmlMatch.content.trim().substring(0, 20)}...
                                                            </code>
                                                        </button>
                                                     ) : (
                                                        /* Fallback Manual Search */
                                                        <button 
                                                            onClick={() => onFindXml && onFindXml('', movement.amount, movement.date, movement.id)} 
                                                            className="flex flex-col items-center justify-center gap-1 p-1.5 bg-white border border-slate-200 rounded shadow-sm hover:bg-indigo-50 transition-colors w-full group opacity-60 hover:opacity-100"
                                                        >
                                                            <SearchIcon className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                                                            <span className="text-[9px] font-medium text-slate-500 group-hover:text-indigo-700">Buscar Manual</span>
                                                        </button>
                                                     )}
                                                </td>
                                            )}
                                            <ReviewBlock movementId={movement.id} operationId={op.id} area="documental" data={op.reviewData.documental} options={DOCUMENTAL_OPTIONS} bgColor="bg-blue-50/20" />
                                            <ReviewBlock movementId={movement.id} operationId={op.id} area="banrep" data={op.reviewData.banrep} options={BANREP_OPTIONS} bgColor="bg-green-50/20" />
                                            <ReviewBlock movementId={movement.id} operationId={op.id} area="dian" data={op.reviewData.dian} options={DIAN_OPTIONS} bgColor="bg-amber-50/20" />
                                            <td className="p-2 align-top">
                                                <textarea className="w-full text-xs text-blue-700 font-medium border-slate-300 rounded mb-2 focus:ring-1 focus:ring-indigo-500 min-h-[100px]" rows={5} placeholder="Comentario manual..." value={op.reviewData.comments} onChange={(e) => handleOperationChange(movement.id, op.id, { reviewData: { ...op.reviewData, comments: e.target.value } })} />
                                            </td>
                                            <td className="p-2 align-top text-center">{opIndex === 0 && <button onClick={() => handleDeleteMovementLocal(movement.id)}><TrashIcon className="w-4 h-4 text-red-500" /></button>}</td>
                                        </tr>
                                    )})}
                                </React.Fragment>
                            );
                        })
                    )}
                    </tbody>
                </table>
            </div>
            {activeMovementForLinking && (<DeclarationLinkModal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} movementId={activeMovementForLinking.id} movementAmount={activeMovementForLinking.amount} movementDate={activeMovementForLinking.date} availableDeclarations={declarationsList} processedDeclarations={processedDeclarations} linkedDeclarations={activeMovementForLinking.linkedDeclarations?.map(l => l.targetFileName) || []} onSave={(files) => { /* Placeholder if manual linking is restored */ }} allMovements={movements} />)}
        </div>
    );
};
export default ChronologicalAuditView;
