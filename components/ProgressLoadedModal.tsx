
import React from 'react';
import { CheckIcon } from './icons';

interface ProgressLoadedModalProps {
    onClose: () => void;
}

const ProgressLoadedModal: React.FC<ProgressLoadedModalProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in-fast">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-xl transform transition-all">
                <h3 className="text-2xl font-bold mb-2 text-slate-800">Progreso Cargado Exitosamente</h3>
                <p className="text-slate-600 mb-6">Tu sesión de revisión ha sido restaurada completamente.</p>

                <div className="bg-green-50 p-4 rounded-lg border border-green-200 mb-4">
                    <ul className="space-y-2 text-sm text-slate-700">
                        <li className="flex items-center gap-3">
                            <CheckIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                            <span>Archivos de revisión (XML/JSON)</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <CheckIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                            <span>Comentarios y estados de cada línea</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <CheckIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                            <span>Detalles de la auditoría</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <CheckIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                            <span>Archivos de soporte (PDFs, Extractos)</span>
                        </li>
                    </ul>
                </div>

                <div className="bg-indigo-50 border-l-4 border-indigo-400 text-indigo-800 p-4 rounded-r-lg">
                    <p className="font-bold text-sm">¡Listo para trabajar!</p>
                    <p className="mt-1 text-xs">
                        Toda la documentación ha sido restaurada. Puedes continuar exactamente donde lo dejaste.
                    </p>
                </div>

                <div className="flex justify-end mt-8">
                    <button
                        onClick={onClose}
                        className="px-8 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Empezar a Revisar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProgressLoadedModal;
