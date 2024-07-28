"use client";
import React, { Suspense } from 'react';
import Playback from '../Playback/page';

const PlaybackWrapper: React.FC = () => {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <Playback />
        </Suspense>
    );
};

export default PlaybackWrapper;
