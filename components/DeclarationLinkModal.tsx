
import React, { useState, useMemo, useEffect } from 'react';
import { CloseIcon, FilePdfIcon, CheckIcon, SearchIcon, ExclamationTriangleIcon, CalculatorIcon } from './icons';
import { ProcessedDeclaration, AuditMovement } from '../types';

interface DeclarationLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    movementId: string;
    movementAmount: number;
    movementDate: string;
    availableDeclarations: string[];
    linkedDeclarations: string[];
    processedDeclarations?: ProcessedDeclaration[];
    allMovements?: AuditMovement[]; // Added to check for conflicts
    onSave: (selectedDeclarations: string[]) => void;
}

const DeclarationLinkModal: React.FC<DeclarationLinkModalProps> = ({
    isOpen,
    onClose,
    movementId,
    movementAmount,
    movementDate,
    availableDeclarations,
    linkedDeclarations,
    processedDeclarations,
    allMovements,
    onSave
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set(linkedDeclarations));

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedFiles(new Set(linkedDeclarations));
            setSearchTerm('');
        }
    }, [isOpen, linkedDeclarations]);

    // Calculate Totals
    const targetAmount = Math.abs(movementAmount);
    
    const selectedTotal = useMemo(() => {
        let total = 0;
        selectedFiles.forEach(fileName => {
            const meta = processedDeclarations?.find(pd => pd.fileName === fileName);
            if (meta) {
                total += meta.amount;
            }
        });
        return total;
    }, [selectedFiles, processedDeclarations]);

    const remaining = targetAmount - selectedTotal;

    // Helper: Find if a declaration is linked to OTHER movements
    const getLinkConflict = (fileName: string) => {
        if (!allMovements) return null;
        for (const mov of allMovements) {
            if (mov.id === movementId) continue; // Skip current
            if (mov.linkedDeclarations?.some(link => link.targetFileName === fileName)) {
                return mov.description;
            }
        }
        return null;
    };

    const sortedItems = useMemo(() => {
        const moveDate = new Date(movementDate);
        
        // Combine raw filenames and processed metadata
        const allItems = availableDeclarations.map(fileName => {
            const meta = processedDeclarations?.find(pd => pd.fileName === fileName);
            const conflict = getLinkConflict(fileName);
            return {
                fileName,
                meta,
                conflict,
                // Create a robust search string
                searchString: `${fileName} ${meta?.number || ''} ${meta?.amount || ''} ${meta?.date || ''} ${meta?.numeral || ''}`.toLowerCase()
            };
        });

        // Filter
        const filtered = allItems.filter(item => item.searchString.includes(searchTerm.toLowerCase()));

        // Sort
        return filtered.sort((a, b) => {
            // Priority 1: Already Selected
            const aLinked = selectedFiles.has(a.fileName);
            const bLinked = selectedFiles.has(b.fileName);
            if (aLinked && !bLinked) return -1;
            if (!aLinked && bLinked) return 1;

            // Priority 2: Conflict (Put conflicts at bottom usually, or top if critical? Let's standard sort)
            
            // Priority 3: Alphabetical / Date
            return a.fileName.localeCompare(b.fileName);
        });

    }, [availableDeclarations, searchTerm, movementDate, selectedFiles, processedDeclarations, allMovements]);

    if (!isOpen) return null;

    const handleToggleSelect = (fileName: string) => {
        const newSet = new Set(selectedFiles);
        if (newSet.has(fileName)) {
            newSet.delete(fileName);
        } else {
            newSet.add(fileName);
        }
        setSelectedFiles(newSet);
    };

    const handleSave = () => {
        onSave(Array.from(selectedFiles));
        onClose();
    };

    const formatMoney = (amount: number) => amount.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 font-sans">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden">
                
                {/* Header */}
                <header className="flex-shrink-0 p-5 border-b border-slate-200 bg-white">
                    <h3 className="text-xl font-bold text-slate-800">Vincular a Declaración</h3>
                    <p className="text-slate-500 text-sm mt-1">
                        Seleccione la declaración o combinación de declaraciones que corresponde a esta operación.
                    </p>
                    
                    <div className="mt-4 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon className="h-4 w-4 text-slate-400" />
                        </div>
                        <input 
                            type="text" 
                            placeholder="Buscar por palabra clave, valor, fecha..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            autoFocus
                        />
                    </div>
                </header>

                {/* List */}
                <main className="flex-grow overflow-y-auto p-5 bg-slate-50 space-y-3">
                    {sortedItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <FilePdfIcon className="w-12 h-12 mb-3 opacity-30" />
                            <p>No se encontraron documentos.</p>
                        </div>
                    ) : (
                        sortedItems.map(({ fileName, meta, conflict }) => {
                            const isSelected = selectedFiles.has(fileName);
                            
                            return (
                                <div 
                                    key={fileName}
                                    onClick={() => handleToggleSelect(fileName)}
                                    className={`relative flex items-start p-4 rounded-xl border transition-all duration-200 cursor-pointer group ${
                                        isSelected 
                                            ? 'bg-white border-indigo-500 ring-1 ring-indigo-500 shadow-md' 
                                            : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                                    }`}
                                >
                                    {/* Checkbox */}
                                    <div className="flex items-center h-full mr-4 pt-1">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                            isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 group-hover:border-indigo-400'
                                        }`}>
                                            {isSelected && <CheckIcon className="w-3.5 h-3.5 text-white" />}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-grow min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="text-base font-bold text-slate-800 truncate pr-2">
                                                {meta 
                                                    ? `${meta.numeral ? `Numeral ${meta.numeral}` : `Dec. ${meta.number || 'S/N'}`} - ${formatMoney(meta.amount)}` 
                                                    : fileName
                                                }
                                            </h4>
                                            <span className="text-xs font-medium text-slate-500 whitespace-nowrap bg-slate-100 px-2 py-0.5 rounded">
                                                {meta?.date || 'Sin Fecha'}
                                            </span>
                                        </div>
                                        
                                        <div className="flex items-center text-xs text-slate-500 mb-2">
                                            <FilePdfIcon className="w-3.5 h-3.5 mr-1 text-slate-400" />
                                            <span className="truncate" title={fileName}>{fileName}</span>
                                        </div>

                                        {/* Warning Box if Conflict */}
                                        {conflict && (
                                            <div className="mt-2 bg-amber-50 border border-amber-200 rounded px-3 py-1.5 text-xs text-amber-800 flex items-start gap-2">
                                                <ExclamationTriangleIcon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-600" />
                                                <span className="font-semibold">Ya vinculado a: "{conflict}"</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </main>

                {/* Footer Logic Panel */}
                <footer className="flex-shrink-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                    <div className="grid grid-cols-3 gap-6 mb-4 px-2">
                        <div>
                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Valor Operación:</p>
                            <p className="text-lg font-bold text-emerald-600 truncate" title={formatMoney(targetAmount)}>
                                {formatMoney(targetAmount)}
                            </p>
                        </div>
                        <div className="border-l border-slate-200 pl-6">
                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Total Seleccionado:</p>
                            <p className="text-lg font-bold text-blue-600 truncate" title={formatMoney(selectedTotal)}>
                                {formatMoney(selectedTotal)}
                            </p>
                        </div>
                        <div className="border-l border-slate-200 pl-6">
                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Faltante:</p>
                            <p className={`text-lg font-bold truncate ${remaining === 0 ? 'text-slate-400' : remaining > 0 ? 'text-amber-600' : 'text-red-600'}`} title={formatMoney(remaining)}>
                                {formatMoney(remaining)}
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button 
                            onClick={onClose} 
                            className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleSave} 
                            className="px-6 py-2.5 text-sm font-semibold text-white bg-slate-500 rounded-lg hover:bg-slate-600 shadow-sm transition-colors"
                        >
                            Vincular ({selectedFiles.size})
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default DeclarationLinkModal;
