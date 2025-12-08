import React from 'react';

interface ConfirmationModalProps {
    title: string;
    children: React.ReactNode;
    confirmText: string;
    onConfirm: () => void;
    onClose: () => void;
    confirmButtonClass?: string;
    modalClass?: string;
    cancelText?: string;
    cancelButtonClass?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ title, children, confirmText, onConfirm, onClose, confirmButtonClass, modalClass, cancelText, cancelButtonClass }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
        <div className={`bg-white rounded-lg shadow-2xl p-6 w-full transform transition-all ${modalClass || 'max-w-md'}`}>
            <h3 className="text-xl font-bold mb-4 text-slate-800">{title}</h3>
            <div className="text-slate-600 mb-6">{children}</div>
            <div className="flex justify-end gap-3">
                {confirmText !== "Entendido" && (
                     <button onClick={onClose} className={cancelButtonClass || "px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200"}>
                        {cancelText || 'Cancelar'}
                    </button>
                )}
                <button 
                    onClick={onConfirm}
                    className={confirmButtonClass || "px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-sm"}
                >
                    {confirmText}
                </button>
            </div>
        </div>
    </div>
);

export default ConfirmationModal;