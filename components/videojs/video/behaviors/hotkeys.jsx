import { Hotkey } from '@videojs/react';
import { PlaybackHotkeys } from './playback-hotkeys';
export function VideoHotkeys({ disabled = false } = {}) {
    return (<>
      <PlaybackHotkeys disabled={disabled}/>
      <Hotkey disabled={disabled} keys="f" action="toggleFullscreen"/>
      <Hotkey disabled={disabled} keys="c" action="toggleSubtitles"/>
      <Hotkey disabled={disabled} keys="i" action="togglePictureInPicture"/>
    </>);
}
