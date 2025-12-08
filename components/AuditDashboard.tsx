
import React from 'react';
import { AuditMovement, DeclarationReview, FileData } from '../types';
import { ChartBarIcon, DocumentCheckIcon, ExclamationTriangleIcon } from './icons';

interface AuditDashboardProps {
    movements: AuditMovement[];
    reviews: DeclarationReview[];
    fileData: FileData[];
}

const AuditDashboard: React.FC<AuditDashboardProps> = ({ movements, reviews, fileData }) => {
    
    const totalMovements = movements.length;
    const totalOperations = movements.reduce((acc, m) => acc + m.operations.length, 0);
    const totalUSD = movements.reduce((acc, m) => acc + Math.abs(m.amount), 0);

    const stats = {
        dian: { ok: 0, extemporaneo: 0, sinLegalizar: 0, parcial: 0, error: 0 },
        banrep: { ok: 0, extemporaneo: 0, sinTransmitir: 0, error: 0 },
        docs: { ok: 0, pendientes: 0 }
    };

    let totalFindings = 0;

    movements.forEach(m => {
        m.operations.forEach(op => {
            const dianStatus = op.reviewData.dian.status.toLowerCase();
            if (dianStatus.includes('oportunamente') || dianStatus === 'o.k.') stats.dian.ok++;
            else if (dianStatus.includes('extemporane')) stats.dian.extemporaneo++;
            else if (dianStatus.includes('sin legalizar')) stats.dian.sinLegalizar++;
            else if (dianStatus.includes('parcial')) stats.dian.parcial++;
            else if (dianStatus.includes('error')) stats.dian.error++;

            const banrepStatus = op.reviewData.banrep.status.toLowerCase();
            if (banrepStatus === 'o.k.') stats.banrep.ok++;
            else if (banrepStatus.includes('extemporánea')) stats.banrep.extemporaneo++;
            else if (banrepStatus.includes('sin transmitir')) stats.banrep.sinTransmitir++;
            else if (banrepStatus.includes('mal') || banrepStatus.includes('error')) stats.banrep.error++;

            const docStatus = op.reviewData.documental.status.toLowerCase();
            if (docStatus === 'o.k.') stats.docs.ok++;
            else if (docStatus) stats.docs.pendientes++; 

            if (dianStatus && !dianStatus.includes('o.k.') && !dianStatus.includes('oportunamente') && dianStatus !== '') totalFindings++;
            if (banrepStatus && !banrepStatus.includes('o.k.') && banrepStatus !== '') totalFindings++;
        });
    });

    const correctionPdfs = reviews.filter(r => r.status === 'correction_needed').length;

    const ProgressBar = ({ label, value, total, colorClass }: any) => {
        const percent = total > 0 ? Math.round((value / total) * 100) : 0;
        return (
            <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 font-medium">{label}</span>
                    <span className="text-slate-800 font-bold">{value} ({percent}%)</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all duration-1000 ${colorClass}`} style={{ width: `${percent}%` }}></div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full overflow-y-auto p-6 bg-slate-50">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Dashboard de Resultados</h2>
                    <p className="text-slate-500">Resumen ejecutivo de la auditoría cambiaria.</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
                    <span className="text-xs text-slate-400 uppercase font-bold">Total Auditado</span>
                    <div className="text-xl font-mono font-bold text-indigo-600">
                        {totalUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full"><ChartBarIcon className="w-6 h-6" /></div>
                    <div>
                        <p className="text-sm text-slate-500">Total Operaciones</p>
                        <p className="text-2xl font-bold text-slate-800">{totalOperations}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex items-center gap-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-full"><ExclamationTriangleIcon className="w-6 h-6" /></div>
                    <div>
                        <p className="text-sm text-slate-500">Hallazgos Detectados</p>
                        <p className="text-2xl font-bold text-amber-600">{totalFindings}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-full"><DocumentCheckIcon className="w-6 h-6" /></div>
                    <div>
                        <p className="text-sm text-slate-500">Declaraciones Rev.</p>
                        <p className="text-2xl font-bold text-slate-800">{reviews.length}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex items-center gap-4">
                    <div className="p-3 bg-red-50 text-red-600 rounded-full"><ExclamationTriangleIcon className="w-6 h-6" /></div>
                    <div>
                        <p className="text-sm text-slate-500">Correcciones Req.</p>
                        <p className="text-2xl font-bold text-red-600">{correctionPdfs}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-amber-500"></span> Cumplimiento DIAN (Legalización)
                    </h3>
                    <ProgressBar label="Legalizado Oportunamente" value={stats.dian.ok} total={totalOperations} colorClass="bg-green-500" />
                    <ProgressBar label="Extemporáneo" value={stats.dian.extemporaneo} total={totalOperations} colorClass="bg-yellow-500" />
                    <ProgressBar label="Sin Legalizar" value={stats.dian.sinLegalizar} total={totalOperations} colorClass="bg-red-500" />
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-green-500"></span> Cumplimiento BANREP (Información)
                    </h3>
                    <ProgressBar label="Transmisión O.K." value={stats.banrep.ok} total={totalOperations} colorClass="bg-green-500" />
                    <ProgressBar label="Extemporáneo" value={stats.banrep.extemporaneo} total={totalOperations} colorClass="bg-yellow-500" />
                    <ProgressBar label="Sin Transmitir / Error" value={stats.banrep.sinTransmitir + stats.banrep.error} total={totalOperations} colorClass="bg-red-500" />
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Hallazgos y Comentarios Relevantes</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-slate-600">Fecha</th>
                                <th className="px-4 py-2 text-left text-slate-600">Operación</th>
                                <th className="px-4 py-2 text-left text-slate-600">Estado</th>
                                <th className="px-4 py-2 text-left text-slate-600">Comentarios (Plantilla + XML + PDF)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {movements
                                .flatMap(m => m.operations.map(op => ({ ...op, date: m.date, desc: m.description, parentComments: op.reviewData.comments })))
                                .filter(op => 
                                    op.reviewData.dian.status.includes('SIN') || 
                                    op.reviewData.banrep.status.includes('SIN') ||
                                    op.reviewData.dian.status.includes('EXTEMPORANEO') ||
                                    (op.parentComments && op.parentComments.length > 5)
                                )
                                .slice(0, 10) 
                                .map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-4 py-2 whitespace-nowrap text-slate-500">{item.date}</td>
                                    <td className="px-4 py-2 text-slate-700 truncate max-w-xs" title={item.desc}>{item.desc}</td>
                                    <td className="px-4 py-2">
                                        {item.reviewData.dian.status.includes('SIN') ? (
                                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">Crítico</span>
                                        ) : (
                                            <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-bold">Alerta</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-slate-600 italic text-xs whitespace-pre-wrap">{item.parentComments || "Sin comentario manual"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {movements.length === 0 && <p className="text-center text-slate-400 py-4">No hay datos suficientes para mostrar hallazgos.</p>}
                </div>
            </div>
        </div>
    );
};

export default AuditDashboard;
