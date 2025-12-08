
import React from 'react';

interface PdfConfirmationModalProps {
    onGenerateActive: () => void;
    onGenerateAll: () => void;
    onClose: () => void;
}

const PdfConfirmationModal: React.FC<PdfConfirmationModalProps> = ({ onGenerateActive, onGenerateAll, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-lg transform transition-all">
                <h3 className="text-xl font-bold mb-4 text-slate-800">Generar Reporte PDF</h3>

                <div className="bg-amber-50 border-l-4 border-amber-400 text-amber-800 p-4 rounded-r-lg mb-6" role="alert">
                    <p className="font-bold">¡Atención!</p>
                    <p className="mt-1 text-sm">Recuerda verificar el campo <strong>"tdca"</strong> para cambiar de 5 a 4 por correcciones de operaciones de servicios, luego proceder a validar el archivo en el <strong>PREVALIDADOR</strong>.</p>
                </div>
                
                <p className="text-slate-600 mb-6">El reporte PDF incluirá todas las líneas que tengan un comentario. ¿Qué alcance deseas para el reporte?</p>
                <div className="flex flex-col gap-4">
                    <button 
                        onClick={onGenerateActive}
                        className="w-full text-center px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium shadow-sm transition-colors"
                    >
                        Generar para archivo activo
                    </button>
                    <button
                         onClick={onGenerateAll}
                         className="w-full text-center px-4 py-3 bg-teal-600 text-white rounded-md hover:bg-teal-700 font-medium shadow-sm transition-colors"
                    >
                        Generar para todos los archivos
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

export default PdfConfirmationModal;
