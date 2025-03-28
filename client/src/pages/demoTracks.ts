export interface Track {
    id: number;
    title: string;
    artist: string;
    duration: string;
    coverUrl: string;
    audioUrl: string;
    playCount?: number;
}

export const getDemoTracks = (): Track[] => [
    { 
        id: 1, 
        title: 'Shape of You', 
        artist: 'Ed Sheeran', 
        duration: '3:53', 
        coverUrl: 'https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96',
        audioUrl: 'https://github.com/anars/blank-audio/raw/master/2-seconds-of-silence.mp3'
    },
    { 
        id: 2, 
        title: 'Bad Guy', 
        artist: 'Billie Eilish', 
        duration: '3:14', 
        coverUrl: 'https://i.scdn.co/image/ab67616d0000b2732a038d3bf875d23e4aeaa84e',
        audioUrl: 'https://github.com/anars/blank-audio/raw/master/5-seconds-of-silence.mp3'
    },
    { 
        id: 3, 
        title: 'Blinding Lights', 
        artist: 'The Weeknd', 
        duration: '3:20', 
        coverUrl: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36',
        audioUrl: 'https://github.com/anars/blank-audio/raw/master/10-seconds-of-silence.mp3'
    },
    { 
        id: 4, 
        title: 'Dance Monkey', 
        artist: 'Tones and I', 
        duration: '3:29', 
        coverUrl: 'https://i.scdn.co/image/ab67616d0000b273c6f7af36ecce1cb3be0c3ab6',
        audioUrl: 'https://github.com/anars/blank-audio/raw/master/15-seconds-of-silence.mp3'
    },
    { 
        id: 5, 
        title: 'Circles', 
        artist: 'Post Malone', 
        duration: '3:35', 
        coverUrl: 'https://i.scdn.co/image/ab67616d0000b273cfc4b1939c9776e2726a07be',
        audioUrl: 'https://github.com/anars/blank-audio/raw/master/30-seconds-of-silence.mp3'
    }
]; 