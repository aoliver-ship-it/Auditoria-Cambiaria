import React from 'react';
import { BriefcaseIcon, TrashIcon, UploadIcon } from './icons';

interface SessionRecoveryModalProps {
    username: string;
    lastSaved?: string;
    onRecover: () => void;
    onDiscard: () => void;
}

const SessionRecoveryModal: React.FC<SessionRecoveryModalProps> = ({ username, lastSaved, onRecover, onDiscard }) => {
    return (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in-fast">
            <div className="bg-white rounded-xl shadow-2xl p-0 w-full max-w-lg overflow-hidden transform transition-all">
                <div className="bg-indigo-600 p-6 text-center">
                    <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 backdrop-blur-md">
                        <BriefcaseIcon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">Sesión Encontrada</h3>
                    <p className="text-indigo-100 mt-2">
                        Hola <b>{username}</b>, encontramos trabajo guardado de una sesión anterior.
                    </p>
                </div>

                <div className="p-8">
                    <p className="text-slate-600 text-center mb-8 text-sm">
                        ¿Te gustaría restaurar tu progreso (comentarios, clasificaciones, análisis) o prefieres comenzar una auditoría nueva desde cero?
                        {lastSaved && <span className="block mt-2 text-xs text-slate-400">Último autoguardado detectado.</span>}
                    </p>

                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={onRecover}
                            className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold shadow-lg hover:shadow-indigo-500/30 transition-all transform hover:-translate-y-0.5"
                        >
                            <UploadIcon className="w-5 h-5" />
                            Restaurar Sesión Anterior
                        </button>
                        
                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-slate-200"></div>
                            <span className="flex-shrink-0 mx-4 text-slate-400 text-xs uppercase">O</span>
                            <div className="flex-grow border-t border-slate-200"></div>
                        </div>

                        <button
                             onClick={onDiscard}
                             className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-red-600 font-medium transition-colors"
                        >
                            <TrashIcon className="w-4 h-4" />
                            Eliminar y Empezar desde Cero
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SessionRecoveryModal;