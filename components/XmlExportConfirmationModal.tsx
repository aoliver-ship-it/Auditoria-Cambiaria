

import React from 'react';

interface XmlExportConfirmationModalProps {
    onExportActive: () => void;
    onExportAll: () => void;
    onClose: () => void;
}

const XmlExportConfirmationModal: React.FC<XmlExportConfirmationModalProps> = ({ onExportActive, onExportAll, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md transform transition-all">
                <h3 className="text-xl font-bold mb-4 text-slate-800">Exportar XML Modificado</h3>
                <p className="text-slate-600 mb-6">¿Qué archivos XML modificados deseas exportar?</p>
                <div className="flex flex-col gap-4">
                    <button 
                        onClick={onExportActive}
                        className="w-full text-center px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium shadow-sm transition-colors"
                    >
                        Exportar solo el archivo activo
                    </button>
                    <button
                         onClick={onExportAll}
                         className="w-full text-center px-4 py-3 bg-sky-600 text-white rounded-md hover:bg-sky-700 font-medium shadow-sm transition-colors"
                    >
                        Exportar todos los archivos cargados
                    </button>
                </div>
                <div className="mt-6 text-center">
                     <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default XmlExportConfirmationModal;