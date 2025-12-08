
import React, { useState, useEffect, useRef } from 'react';

interface CommentModalProps {
    lineId: string | null;
    position: { x: number; y: number };
    lineContent: string;
    existingComment: string;
    commentOptions: string[];
    selectedCount: number;
    onSave: (comment: string, saveForFuture: boolean) => void;
    onDelete?: () => void;
    onClose: () => void;
}

const CommentModal: React.FC<CommentModalProps> = ({ lineContent, existingComment, commentOptions, selectedCount, onSave, onDelete, onClose, position }) => {
    const [comment, setComment] = useState(existingComment);
    const [saveForFuture, setSaveForFuture] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const [modalPosition, setModalPosition] = useState({ top: position.y, left: position.x });

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        if (modalRef.current) {
            const modalRect = modalRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let top = position.y;
            let left = position.x;
            const margin = 16; 

            if (left + modalRect.width > viewportWidth - margin) {
                left = viewportWidth - modalRect.width - margin;
            }
            if (top + modalRect.height > viewportHeight - margin) {
                top = viewportHeight - modalRect.height - margin;
            }
            if (left < margin) {
                left = margin;
            }
            if (top < margin) {
                top = margin;
            }

            setModalPosition({ top, left });
        }
    }, [position]);

    const handleSave = () => {
        onSave(comment, saveForFuture);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50" onClick={onClose}>
            <div 
                ref={modalRef}
                style={{
                    position: 'absolute',
                    top: `${modalPosition.top}px`,
                    left: `${modalPosition.left}px`,
                }}
                className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-lg transform transition-all" 
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-xl font-bold mb-2 text-slate-800">Comentarios</h3>
                {selectedCount > 1 ? (
                     <p className="text-sm text-slate-600 mb-4">Aplicando a <b>{selectedCount}</b> líneas seleccionadas.</p>
                ) : (
                    <div className="bg-slate-50 p-2 rounded text-xs font-mono mb-4 text-slate-600 truncate">
                         {lineContent.trim().substring(0, 100)}...
                    </div>
                )}

                <div className="mb-4">
                    <label htmlFor="comment-input" className="block text-sm font-medium text-slate-700 mb-1">Escribe tu observación:</label>
                    <textarea
                        ref={inputRef}
                        id="comment-input"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="w-full border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm p-2"
                        rows={3}
                        placeholder="Ej: Valor no coincide con factura..."
                    />
                </div>
                
                <div className="mb-4">
                    <label htmlFor="save-for-future" className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                        <input
                            id="save-for-future"
                            type="checkbox"
                            checked={saveForFuture}
                            onChange={e => setSaveForFuture(e.target.checked)}
                            className="rounded border-slate-400 text-indigo-600 focus:ring-indigo-500"
                        />
                        Guardar en favoritos
                    </label>
                </div>

                {commentOptions.length > 0 && (
                    <div className="mb-6">
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Favoritos</p>
                        <div className="flex flex-wrap gap-2">
                            {commentOptions.map(option => (
                                <button
                                    key={option}
                                    onClick={() => setComment(option)}
                                    className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded-md hover:bg-indigo-100 hover:text-indigo-700 border border-slate-200"
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    {existingComment && onDelete && (
                        <button 
                            onClick={onDelete}
                            className="mr-auto px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md border border-transparent transition-colors"
                        >
                            Eliminar
                        </button>
                    )}
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancelar</button>
                    <button onClick={handleSave} className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-sm">Guardar</button>
                </div>
            </div>
        </div>
    );
};

export default CommentModal;
