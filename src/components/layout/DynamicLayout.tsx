import React, { type CSSProperties, type ComponentType, type ReactNode } from 'react';
import './dynamic-layout.css';

export type SectionWidth = 'narrow' | 'content' | 'wide' | 'full';
export type SectionTone = 'default' | 'subtle' | 'brand' | 'transparent';
export type SectionSpacing = 'none' | 'compact' | 'normal' | 'spacious';

export interface SectionContext {
  index: number
  sectionId: string
}

export interface SectionDefinition<TProps extends object = Record<string, unknown>> {
  id: string
  type: string
  props: TProps
  enabled?: boolean
  visible?: boolean
  width?: SectionWidth
  tone?: SectionTone
  spacing?: SectionSpacing
  className?: string
  visibility?: 'all' | 'desktop' | 'tablet' | 'mobile'
}

export type SectionRegistry = Record<string, ComponentType<any>>;

export interface DynamicLayoutProps {
  sections: SectionDefinition[]
  registry: SectionRegistry
  className?: string
  empty?: ReactNode
}

/**
 * Configuration-driven page composition.
 * Sections can be reordered, duplicated, disabled, hidden or replaced entirely
 * by changing data only. The registry keeps CMS data decoupled from React code.
 */
export function DynamicLayout({ sections, registry, className = '', empty = null }: DynamicLayoutProps) {
  const visible = sections.filter((section) => section.enabled !== false && section.visible !== false);
  if (!visible.length) return <>{empty}</>;

  return (
    <div className={`dynamic-layout ${className}`.trim()}>
      {visible.map((section, index) => {
        const Component = registry[section.type];
        if (!Component) return null;
        const width = section.width ?? 'content';
        const tone = section.tone ?? 'transparent';
        const spacing = section.spacing ?? 'normal';
        return (
          <section
            key={section.id}
            id={section.id}
            data-section-type={section.type}
            className={`dynamic-section dynamic-section--${tone} dynamic-section--space-${spacing} dynamic-section--show-${section.visibility ?? 'all'} ${section.className ?? ''}`.trim()}
          >
            <div className={`dynamic-section__inner dynamic-section__inner--${width}`}>
              <Component {...section.props} sectionContext={{ index, sectionId: section.id } satisfies SectionContext} />
            </div>
          </section>
        );
      })}
    </div>
  );
}

export type MediaShape = 'rectangle' | 'rounded' | 'circle' | 'ellipse' | 'capsule' | 'arch' | 'organic' | 'polygon';

export interface AdaptiveImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'width' | 'height'> {
  shape?: MediaShape
  aspectRatio?: CSSProperties['aspectRatio']
  objectFit?: CSSProperties['objectFit']
  focalPoint?: string
  scale?: number
  rotation?: number
  width?: CSSProperties['width']
  maxWidth?: CSSProperties['maxWidth']
  align?: 'start' | 'center' | 'end'
  layered?: boolean
  reveal?: boolean
}

/** Accessible, independently configurable image presentation for any section. */
export function AdaptiveImage({
  shape = 'rounded',
  aspectRatio = '4 / 3',
  objectFit = 'cover',
  focalPoint = '50% 50%',
  scale = 1,
  rotation = 0,
  width = '100%',
  maxWidth,
  align = 'center',
  layered = false,
  reveal = false,
  className = '',
  style,
  alt,
  ...imageProps
}: AdaptiveImageProps) {
  return (
    <figure
      className={`adaptive-media adaptive-media--${shape} adaptive-media--align-${align}${layered ? ' is-layered' : ''}${reveal ? ' has-reveal' : ''} ${className}`.trim()}
      style={{ '--media-ratio': aspectRatio, '--media-width': width, '--media-max-width': maxWidth ?? width, '--media-scale': scale, '--media-rotation': `${rotation}deg` } as CSSProperties}
    >
      <img {...imageProps} alt={alt ?? ''} style={{ objectFit, objectPosition: focalPoint, ...style }} />
    </figure>
  );
}
