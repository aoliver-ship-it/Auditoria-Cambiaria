
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { TrashIcon, PlusIcon, CloseIcon, LockClosedIcon, LockOpenIcon, KeyIcon, EyeIcon, EyeSlashIcon } from './icons';

interface UserManagementModalProps {
    onClose: () => void;
}

const UserManagementModal: React.FC<UserManagementModalProps> = ({ onClose }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showCreatePassword, setShowCreatePassword] = useState(false);
    const [error, setError] = useState('');
    
    // States for password reset (secondary users)
    const [resettingUser, setResettingUser] = useState<string | null>(null);
    const [resetPasswordValue, setResetPasswordValue] = useState('');
    const [showResetPassword, setShowResetPassword] = useState(false);

    // States for Admin changing own password
    const [adminNewPassword, setAdminNewPassword] = useState('');
    const [showAdminNewPassword, setShowAdminNewPassword] = useState(false);
    const [adminError, setAdminError] = useState('');
    const [adminSuccess, setAdminSuccess] = useState('');

    useEffect(() => {
        const storedUsers = localStorage.getItem('cca-users');
        if (storedUsers) {
            setUsers(JSON.parse(storedUsers));
        }
    }, []);

    const saveUsers = (updatedUsers: User[]) => {
        setUsers(updatedUsers);
        localStorage.setItem('cca-users', JSON.stringify(updatedUsers));
    };

    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!newUsername.trim() || !newPassword.trim()) {
            setError('Todos los campos son obligatorios.');
            return;
        }

        if (users.some(u => u.username === newUsername.trim()) || newUsername.trim() === 'Admin95') {
            setError('El nombre de usuario ya existe.');
            return;
        }

        const newUser: User = {
            username: newUsername.trim(),
            password: newPassword.trim(),
            role: 'user', // Default to secondary user
            isLocked: false
        };

        saveUsers([...users, newUser]);
        
        setNewUsername('');
        setNewPassword('');
    };

    const handleDeleteUser = (username: string) => {
        if (window.confirm(`¿Estás seguro de eliminar al usuario ${username}?`)) {
            saveUsers(users.filter(u => u.username !== username));
        }
    };

    const handleToggleLock = (username: string) => {
        const updatedUsers = users.map(u => {
            if (u.username === username) {
                return { ...u, isLocked: !u.isLocked };
            }
            return u;
        });
        saveUsers(updatedUsers);
    };

    const handleResetPassword = (e: React.FormEvent) => {
        e.preventDefault();
        if (!resettingUser || !resetPasswordValue.trim()) return;
        
        const updatedUsers = users.map(u => {
            if (u.username === resettingUser) {
                return { ...u, password: resetPasswordValue.trim() };
            }
            return u;
        });
        saveUsers(updatedUsers);
        alert(`Contraseña actualizada para el usuario ${resettingUser}`);
        setResettingUser(null);
        setResetPasswordValue('');
    };

    const handleChangeAdminPassword = (e: React.FormEvent) => {
        e.preventDefault();
        setAdminError('');
        setAdminSuccess('');

        if (!adminNewPassword.trim()) {
            setAdminError('La nueva contraseña no puede estar vacía.');
            return;
        }

        localStorage.setItem('cca-admin-password', adminNewPassword.trim());
        setAdminSuccess('Contraseña de Administrador actualizada correctamente.');
        setAdminNewPassword('');
        setTimeout(() => setAdminSuccess(''), 3000);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
                <header className="flex-shrink-0 p-4 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-800">Gestión de Usuarios</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800"><CloseIcon className="w-6 h-6" /></button>
                </header>

                <main className="flex-grow overflow-auto p-6 relative space-y-8">
                    {/* Add User Form */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                            <PlusIcon className="w-4 h-4" /> Crear Nuevo Usuario
                        </h4>
                        <form onSubmit={handleAddUser} className="space-y-3">
                            <div>
                                <input
                                    type="text"
                                    placeholder="Nombre de usuario"
                                    value={newUsername}
                                    onChange={e => setNewUsername(e.target.value)}
                                    className="w-full text-sm border-slate-300 rounded shadow-sm px-3 py-2"
                                />
                            </div>
                            <div className="relative">
                                <input
                                    type={showCreatePassword ? "text" : "password"}
                                    placeholder="Contraseña"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    className="w-full text-sm border-slate-300 rounded shadow-sm px-3 py-2 pr-10"
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                                >
                                    {showCreatePassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                                </button>
                            </div>
                            {error && <p className="text-xs text-red-600">{error}</p>}
                            <div className="flex justify-end">
                                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-sm">
                                    Crear Usuario
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* User List */}
                    <div>
                        <h4 className="font-semibold text-slate-700 mb-3">Usuarios Existentes</h4>
                        <div className="space-y-2">
                            {/* Default Admin (Read Only) */}
                            <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-md">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs">A</div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">Admin95</p>
                                        <p className="text-xs text-slate-500">Administrador Principal</p>
                                    </div>
                                </div>
                                <span className="text-xs bg-indigo-200 text-indigo-800 px-2 py-1 rounded-full">Sistema</span>
                            </div>

                            {users.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-4 italic">No hay usuarios secundarios creados.</p>
                            ) : (
                                users.map((user, index) => (
                                    <div key={index} className={`flex items-center justify-between p-3 border rounded-md hover:shadow-sm transition-colors ${user.isLocked ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${user.isLocked ? 'bg-red-200 text-red-700' : 'bg-slate-200 text-slate-600'}`}>
                                                {user.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className={`text-sm font-medium ${user.isLocked ? 'text-red-700' : 'text-slate-800'}`}>
                                                    {user.username} {user.isLocked && <span className="text-xs font-normal">(Bloqueado)</span>}
                                                </p>
                                                <p className="text-xs text-slate-500 capitalize">{user.role === 'user' ? 'Auditor' : user.role}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button 
                                                onClick={() => handleToggleLock(user.username)}
                                                className={`p-2 rounded-full ${user.isLocked ? 'text-green-600 hover:bg-green-50' : 'text-amber-500 hover:bg-amber-50'}`}
                                                title={user.isLocked ? "Desbloquear usuario" : "Bloquear usuario"}
                                            >
                                                {user.isLocked ? <LockOpenIcon className="w-4 h-4" /> : <LockClosedIcon className="w-4 h-4" />}
                                            </button>
                                            <button 
                                                onClick={() => { setResettingUser(user.username); setResetPasswordValue(''); }}
                                                className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-full"
                                                title="Cambiar contraseña"
                                            >
                                                <KeyIcon className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteUser(user.username)}
                                                className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full"
                                                title="Eliminar usuario"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Admin Password Change Section */}
                    <div className="border-t border-slate-200 pt-6">
                        <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                            <KeyIcon className="w-4 h-4 text-indigo-600" /> Seguridad del Administrador (Admin95)
                        </h4>
                        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                            <form onSubmit={handleChangeAdminPassword} className="space-y-3">
                                <div className="relative">
                                    <input
                                        type={showAdminNewPassword ? "text" : "password"}
                                        placeholder="Nueva contraseña para Admin95"
                                        value={adminNewPassword}
                                        onChange={e => setAdminNewPassword(e.target.value)}
                                        className="w-full text-sm border-slate-300 rounded shadow-sm px-3 py-2 pr-10"
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                                        onClick={() => setShowAdminNewPassword(!showAdminNewPassword)}
                                    >
                                        {showAdminNewPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                                    </button>
                                </div>
                                {adminError && <p className="text-xs text-red-600">{adminError}</p>}
                                {adminSuccess && <p className="text-xs text-green-600 font-medium">{adminSuccess}</p>}
                                <div className="flex justify-end">
                                    <button type="submit" className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 border border-slate-300">
                                        Actualizar Clave Admin
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Password Reset Overlay for Secondary Users */}
                    {resettingUser && (
                        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center p-6 rounded-lg z-10">
                            <div className="bg-white shadow-xl border border-slate-200 p-6 rounded-lg w-full max-w-sm animate-fade-in-fast">
                                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <KeyIcon className="w-5 h-5 text-indigo-600" />
                                    Cambiar Contraseña
                                </h4>
                                <p className="text-sm text-slate-600 mb-4">
                                    Asignar nueva contraseña para: <b>{resettingUser}</b>
                                </p>
                                <form onSubmit={handleResetPassword}>
                                    <div className="relative mb-4">
                                        <input
                                            type={showResetPassword ? "text" : "password"}
                                            placeholder="Nueva contraseña"
                                            value={resetPasswordValue}
                                            onChange={e => setResetPasswordValue(e.target.value)}
                                            className="w-full text-sm border-slate-300 rounded shadow-sm px-3 py-2 pr-10"
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                                            onClick={() => setShowResetPassword(!showResetPassword)}
                                        >
                                            {showResetPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button 
                                            type="button" 
                                            onClick={() => { setResettingUser(null); setResetPasswordValue(''); }} 
                                            className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-md"
                                        >
                                            Cancelar
                                        </button>
                                        <button 
                                            type="submit" 
                                            className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm"
                                        >
                                            Guardar
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default UserManagementModal;
