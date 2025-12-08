
import React, { useState, useRef, useEffect } from 'react';
import { LineData, DuplicateIdentifierGroup, IdentifierLocation } from '../types';
import { isAlertComment, isMainRecordLine } from '../utils';
import { CommentIcon, CheckIcon, FilePdfIcon } from './icons';

interface LineComponentProps {
    line: LineData;
    lineNumber: number;
    isSelected: boolean;
    isHighlighted: boolean;
    isDuplicate: boolean;
    duplicateInfo?: { group: DuplicateIdentifierGroup; locationIndex: number };
    onContextMenu: (e: React.MouseEvent, lineId: string) => void;
    onSelect: (lineId: string, isCtrlOrMetaKey: boolean) => void;
    onUpdateContent: (lineId: string, newContent: string) => void;
    onEditComment: (lineId: string) => void;
    onNavigateToDuplicate: (location: IdentifierLocation) => void;
    onNavigateToPdf?: (declarationNumber: string) => void;
    onToggleSelection?: (lineId: string) => void; 
    onToggleStatus?: (lineId: string) => void;
    isChecked?: boolean;
}

const LineComponent: React.FC<LineComponentProps> = React.memo(({ 
    line, lineNumber, isSelected, isHighlighted, isDuplicate, duplicateInfo, 
    onContextMenu, onSelect, onUpdateContent, onEditComment, 
    onNavigateToDuplicate, onNavigateToPdf, onToggleSelection, onToggleStatus, isChecked 
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(line.content);
    const lineRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isHighlighted && lineRef.current) {
            lineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [isHighlighted]);

    useEffect(() => {
        if (lineRef.current && !isEditing) {
            const el = lineRef.current.querySelector('.line-content');
            if(el) {
                el.textContent = line.content;
                // @ts-ignore
                if (window.hljs) window.hljs.highlightElement(el);
            }
        }
    }, [line.content, isEditing]);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            const textarea = textareaRef.current;
            textarea.focus();
            textarea.select();
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [isEditing]);
    
    useEffect(() => {
        if (isEditing && line.content !== editContent) {
            setEditContent(line.content);
        }
    }, [line.content]);

    const handleDoubleClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.action-badge') || (e.target as HTMLElement).closest('.inline-comment') || (e.target as HTMLElement).closest('.xml-checkbox') || (e.target as HTMLElement).closest('.status-toggle')) return;
        onEditComment(line.id);
    };

    const handleSave = () => {
        setIsEditing(false);
        if (editContent !== line.content) onUpdateContent(line.id, editContent);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditContent(line.content); 
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave(); } 
        else if (e.key === 'Escape') { e.preventDefault(); handleCancel(); }
    };
    
    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditContent(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
    };

    const ndecMatch = line.content.match(/ndec="([^"]+)"/i) || line.content.match(/ndeci="([^"]+)"/i) || line.content.match(/ndex="([^"]+)"/i);
    const declarationNumber = ndecMatch ? ndecMatch[1] : null;
    const alert = isAlertComment(line.comment);
    const mainLine = isMainRecordLine(line.content);
    const isReviewed = line.status === 'reviewed';

    const wrapperClasses = [
        'line-wrapper',
        isReviewed ? 'reviewed' : '',
        isHighlighted ? 'highlight-active-result' : '',
        isSelected && !isEditing ? 'selected' : '',
        mainLine ? 'main-record-line' : '',
        isDuplicate ? 'is-duplicate' : '',
        isChecked ? 'bg-indigo-50' : '' 
    ].join(' ');

    return (
        <div
            ref={lineRef}
            className={wrapperClasses}
            data-line-id={line.id}
            onClick={(e) => !isEditing && onSelect(line.id, e.ctrlKey || e.metaKey)}
            onContextMenu={(e) => !isEditing && onContextMenu(e, line.id)}
            onDoubleClick={handleDoubleClick}
        >
            {/* Checkbox for Summation */}
            <div className="flex items-center pl-3 pr-2 cursor-pointer hover:bg-slate-100" onClick={e => { e.stopPropagation(); onToggleSelection && onToggleSelection(line.id); }}>
                <input 
                    type="checkbox" 
                    className="xml-checkbox w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    checked={isChecked || false}
                    onChange={() => {}} 
                />
            </div>

            <div className="line-number flex items-center justify-end gap-1">
                <button 
                    onClick={(e) => { e.stopPropagation(); onToggleStatus && onToggleStatus(line.id); }}
                    className={`status-toggle p-0.5 rounded hover:bg-slate-200 ${isReviewed ? 'text-green-600 bg-green-50' : 'text-slate-300'}`}
                    title={isReviewed ? "Marcar como pendiente" : "Marcar como revisado"}
                >
                    <CheckIcon className="w-3 h-3" />
                </button>
                {lineNumber}
            </div>

            <div className="line-content-area">
                {isEditing ? (
                    <textarea
                        ref={textareaRef}
                        value={editContent}
                        onChange={handleTextareaChange}
                        onBlur={handleSave}
                        onKeyDown={handleKeyDown}
                        className="flex-grow bg-white font-mono text-sm border border-indigo-400 rounded-sm px-1 resize-none overflow-hidden focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        spellCheck="false"
                    />
                ) : (
                    <code className={`line-content hljs language-xml flex-grow ${isReviewed ? 'text-green-900' : ''}`}>{line.content}</code>
                )}
                
                <div className="flex items-center flex-shrink-0 ml-4 gap-2">
                     {declarationNumber && onNavigateToPdf && !isEditing && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onNavigateToPdf(declarationNumber); }}
                            className="action-badge badge-pdf"
                            title={`Abrir PDF Declaración: ${declarationNumber}`}
                        >
                            <FilePdfIcon className="w-3 h-3" /> Dec. {declarationNumber}
                        </button>
                     )}
                     {isReviewed && <CheckIcon className="w-4 h-4 text-green-600" />}
                     {line.comment && !isEditing && (
                        <span className={`inline-comment ${alert ? 'is-alert' : ''}`} title="Editar comentario" onClick={(e) => { e.stopPropagation(); onEditComment(line.id); }}>
                            <CommentIcon className="w-3 h-3 flex-shrink-0" />
                            <span>{line.comment}</span>
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
});
export default LineComponent;
