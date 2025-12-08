import React from 'react';

interface CleanConfirmationModalProps {
    onCleanActive: () => void;
    onRemoveAll: () => void;
    onClose: () => void;
    activeFileName: string | null;
    canRemoveAll: boolean;
}

const CleanConfirmationModal: React.FC<CleanConfirmationModalProps> = ({ onCleanActive, onRemoveAll, onClose, activeFileName, canRemoveAll }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md transform transition-all">
                <h3 className="text-xl font-bold mb-4 text-slate-800">Opciones de Limpieza</h3>
                <p className="text-slate-600 mb-6">Elige una opción. Estas acciones no se pueden deshacer.</p>
                <div className="flex flex-col gap-4">
                    <button 
                        onClick={onCleanActive}
                        disabled={!activeFileName}
                        className="w-full text-center px-4 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={activeFileName ? `Limpia comentarios y estados del archivo: ${activeFileName}` : 'No hay un archivo activo para limpiar'}
                    >
                        Limpiar Archivo Activo
                    </button>
                    <button
                         onClick={onRemoveAll}
                         disabled={!canRemoveAll}
                         className="w-full text-center px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                         title={canRemoveAll ? 'Quita todos los archivos de la sesión actual' : 'No hay archivos para quitar'}
                    >
                        Quitar Todos los Archivos
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

export default CleanConfirmationModal;
