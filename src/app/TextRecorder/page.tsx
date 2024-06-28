"use client";
import React, { useState, ChangeEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { diff_match_patch } from 'diff-match-patch';
import { logError } from '../../utils/errorHandler';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay } from '@fortawesome/free-solid-svg-icons/faPlay';

type InputRecord = {
    diffs: object[];
    timestamp: number;
    timeDiff: number;
};

const generateSessionId = () => '_' + Math.random().toString(36).substr(2, 9);

const TextRecorder: React.FC = () => {
    const [text, setText] = useState<string>('');
    const [lastText, setLastText] = useState<string>('');
    const [records, setRecords] = useState<InputRecord[]>([]);
    const [sessionId, setSessionId] = useState<string>(generateSessionId());
    const [timeLeft, setTimeLeft] = useState<number>(15 * 60);
    const [recordingStatus, setRecordingStatus] = useState<'notStarted' | 'recording' | 'stopped'>('notStarted');
    const dmp = new diff_match_patch();
    const router = useRouter();

    useEffect(() => {
        if (recordingStatus === 'recording') {
            const timer = setInterval(() => {
                setTimeLeft((prevTime) => {
                    if (prevTime <= 1) {
                        setRecordingStatus('stopped');
                        clearInterval(timer);
                        location.reload();
                    }
                    return prevTime - 1;
                });
            }, 1000);
        }
    }, [recordingStatus]);

    const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        if (recordingStatus === 'stopped') return;

        if (recordingStatus === 'notStarted') {
            setRecordingStatus('recording');
        }

        const newText = event.target.value;

        if (newText.length > 500) {
            alert("文字数の上限に達しています");
            return;
        }

        setText(newText);
        const diffs = dmp.diff_main(lastText, newText);
        dmp.diff_cleanupSemantic(diffs);
        const patches = dmp.patch_make(lastText, newText, diffs);
        const currentTime = Date.now();
        const timeDiff = records.length > 0 ? currentTime - records[records.length - 1].timestamp : 0;

        if (records.length < 1500) {
            setRecords((prevRecords) => [
                ...prevRecords,
                { diffs: patches, timestamp: currentTime, timeDiff }
            ]);
        }

        if (records.length > 1500) {
            location.reload();
        };

        setLastText(newText);
    };

    const saveRecords = async () => {
        if (records.length === 0) {
            logError('No records to save', null);
            return;
        }

        try {
            const response = await fetch('/api/saveRecords', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ sessionId, records })
            });

            if (response.ok) {
                console.log('Records saved successfully');
                router.push(`/playback?sessionId=${sessionId}`);
            } else {
                const errorData = await response.json();
                logError('Failed to save records', errorData);
            }
        } catch (error) {
            logError('An unexpected error occurred', error);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
            <textarea
                className="w-full h-48 p-4 mb-4 text-sm border-2 border-gray-300 focus:ring-2 focus:ring-gray-500 rounded-lg"
                value={text}
                onChange={handleInputChange}
                maxLength={500}
                disabled={recordingStatus === 'stopped'}
            />
            <div className="text-center">
                <h4 className="text-lg mb-4">Limit: {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</h4>
                <button
                    className="
                        py-2 
                        px-6 
                        mb-4 
                        m-auto 
                        bg-gray-800 
                        text-white
                        font-semibold 
                        rounded-lg 
                        hover:bg-gray-700 
                        focus:outline-none 
                        focus:ring-2 
                        focus:ring-gray-500 
                        focus:ring-opacity-50 
                        disabled:bg-gray-400 
                        flex 
                        items-center 
                        justify-center
                        "
                    onClick={saveRecords}
                    disabled={recordingStatus !== 'recording'}
                >
                    <FontAwesomeIcon icon={faPlay} className="mr-2" style={{ width: '1em', height: '1em' }} />
                    筆跡を再生する
                </button>
                <ul className="list-disc list-inside text-left mx-auto max-w-md">
                    <li>文字数制限は500文字です。</li>
                    <li>タイマーが時間切れになると自動的に再生画面に遷移します。</li>
                    <li>入力した筆跡は共有URLで保存することができます。</li>
                </ul>
            </div>
        </div>
    );
};

export default TextRecorder;
