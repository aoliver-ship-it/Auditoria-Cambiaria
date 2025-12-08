
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { CloseIcon, BriefcaseIcon, UserSwitchIcon } from './icons';

interface AdminSessionSelectorProps {
    onClose: () => void;
    onSelectUserSession: (username: string) => void;
    currentViewingUser: string;
}

const AdminSessionSelector: React.FC<AdminSessionSelectorProps> = ({ onClose, onSelectUserSession, currentViewingUser }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [progressMap, setProgressMap] = useState<{[key: string]: boolean}>({});

    useEffect(() => {
        // Load users
        const storedUsers = localStorage.getItem('cca-users');
        let parsedUsers: User[] = [];
        if (storedUsers) {
            parsedUsers = JSON.parse(storedUsers);
        }
        setUsers(parsedUsers);

        // Check for progress files
        const progressStatus: {[key: string]: boolean} = {};
        parsedUsers.forEach(u => {
            const key = `cca-progress-${u.username}`;
            progressStatus[u.username] = !!localStorage.getItem(key);
        });
        // Check Admin progress
        progressStatus['Admin95'] = !!localStorage.getItem('cca-progress-Admin95');
        
        setProgressMap(progressStatus);
    }, []);

    const handleSelect = (username: string) => {
        onSelectUserSession(username);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
                <header className="flex-shrink-0 p-4 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <UserSwitchIcon className="w-6 h-6 text-indigo-600" /> Inspeccionar Trabajo de Usuario
                    </h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800"><CloseIcon className="w-6 h-6" /></button>
                </header>

                <main className="flex-grow overflow-auto p-4 space-y-4">
                    <p className="text-sm text-slate-600">
                        Selecciona un usuario para cargar su sesión de trabajo completa (archivos cargados, comentarios, progreso, análisis).
                        <br/>
                        <span className="font-semibold text-amber-600">Nota:</span> Podrás ver y modificar el trabajo como si fueras ese usuario.
                    </p>

                    <div className="space-y-2">
                        {/* Admin Option */}
                        <div 
                            onClick={() => handleSelect('Admin95')}
                            className={`flex items-center justify-between p-3 border rounded-md cursor-pointer transition-colors ${currentViewingUser === 'Admin95' ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-500' : 'bg-white hover:bg-slate-50'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs">A</div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">Admin95 (Mi Sesión)</p>
                                    <p className="text-xs text-slate-500">{progressMap['Admin95'] ? 'Tiene progreso guardado' : 'Sin progreso guardado'}</p>
                                </div>
                            </div>
                            {currentViewingUser === 'Admin95' && <span className="text-xs font-bold text-indigo-600">Activo</span>}
                        </div>

                        {users.map(user => (
                            <div 
                                key={user.username}
                                onClick={() => handleSelect(user.username)}
                                className={`flex items-center justify-between p-3 border rounded-md cursor-pointer transition-colors ${currentViewingUser === user.username ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-500' : 'bg-white hover:bg-slate-50'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
                                        {user.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-800">{user.username}</p>
                                        <p className="text-xs text-slate-500">
                                            {progressMap[user.username] ? 
                                                <span className="text-green-600 flex items-center gap-1"><BriefcaseIcon className="w-3 h-3"/> Trabajo guardado encontrado</span> 
                                                : 'Sin trabajo iniciado'}
                                        </p>
                                    </div>
                                </div>
                                {currentViewingUser === user.username && <span className="text-xs font-bold text-indigo-600">Activo</span>}
                            </div>
                        ))}

                        {users.length === 0 && (
                            <p className="text-center text-sm text-slate-500 py-4">No hay otros usuarios registrados.</p>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminSessionSelector;
