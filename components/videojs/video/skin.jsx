'use client';
import '../styles/video/base.css';
import { BufferingIndicator } from '@/components/videojs/ui/buffering-indicator';
import { Container } from '@/components/videojs/ui/container';
import { ErrorDialog } from '@/components/videojs/ui/error-dialog';
import { Poster } from '@/components/videojs/ui/poster';
import { Title } from '@/components/videojs/ui/title';
import { cn } from '@/lib/resolve-class-name';
import { VideoGestures } from './behaviors/gestures';
import { VideoHotkeys } from './behaviors/hotkeys';
import { VideoStatusIndicators } from './display/status-indicators';
import { DefaultVideoControls } from './layout/controls';
export function VideoSkin({ children, className, renderPoster, renderThumbnail, ...props } = {}) {
    return (<Container className={cn('pointer-fine:not-data-controls-visible:cursor-none', className)} data-theme="default" data-preset="video" {...props}>
      {children}
      <Poster renderImage={renderPoster}/>
      <BufferingIndicator />
      <ErrorDialog />
      <Title />

      <DefaultVideoControls renderThumbnail={renderThumbnail}/>

      <VideoHotkeys />
      <VideoGestures />
      <VideoStatusIndicators />
    </Container>);
}
