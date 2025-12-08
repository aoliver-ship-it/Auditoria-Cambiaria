import React from 'react';
import { UploadIcon } from './icons';

interface SaveConfirmationModalProps {
    onSaveActive: () => void;
    onSaveAll: () => void;
    onDownload: () => void;
    onClose: () => void;
}

const SaveConfirmationModal: React.FC<SaveConfirmationModalProps> = ({ onSaveActive, onSaveAll, onDownload, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md transform transition-all">
                <h3 className="text-xl font-bold mb-4 text-slate-800">Guardar Progreso</h3>
                <p className="text-slate-600 mb-6">Elige cómo deseas guardar tu trabajo actual:</p>
                
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={onSaveAll}
                        className="w-full text-left px-4 py-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md font-medium border border-indigo-200 transition-colors flex items-center justify-between group"
                    >
                        <span>Guardar en Navegador (Local)</span>
                        <span className="text-xs bg-indigo-200 px-2 py-1 rounded text-indigo-800 group-hover:bg-indigo-300">Autoguardado</span>
                    </button>

                    <button
                         onClick={onDownload}
                         className="w-full text-left px-4 py-3 bg-emerald-600 text-white hover:bg-emerald-700 rounded-md font-medium shadow-sm transition-colors flex items-center justify-between"
                    >
                        <span>Descargar Copia en PC (.json)</span>
                        <UploadIcon className="w-5 h-5" />
                    </button>
                    <p className="text-xs text-slate-400 px-1">
                        * Descarga el archivo JSON para respaldar tu trabajo y poder cargarlo en otro equipo o navegador después.
                    </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                     <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SaveConfirmationModal;