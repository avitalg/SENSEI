import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdaptiveImage, DynamicLayout, type SectionRegistry } from '../src/components/layout/DynamicLayout';

const registry: SectionRegistry = {
  text: ({ title }: { title: string }) => <h2>{title}</h2>,
};

describe('configuration-driven layout system', () => {
  it('reorders, duplicates and hides sections using configuration only', () => {
    const { container } = render(
      <DynamicLayout
        registry={registry}
        sections={[
          { id: 'second', type: 'text', props: { title: 'שני' }, width: 'narrow' },
          { id: 'hidden', type: 'text', props: { title: 'מוסתר' }, enabled: false },
          { id: 'first-copy', type: 'text', props: { title: 'עותק' }, tone: 'subtle' },
        ]}
      />,
    );
    expect(container.textContent).toBe('שניעותק');
    expect(container.querySelector('#hidden')).toBeNull();
    expect(container.querySelector('#second .dynamic-section__inner--narrow')).toBeTruthy();
    expect(container.querySelector('#first-copy.dynamic-section--subtle')).toBeTruthy();
  });

  it('ignores unknown CMS section types without crashing the page', () => {
    const { container } = render(
      <DynamicLayout registry={registry} sections={[{ id: 'unknown', type: 'future-block', props: {} }]} />,
    );
    expect(container.querySelector('#unknown')).toBeNull();
  });

  it('supports independently configured image shape, crop and focal point', () => {
    const { container } = render(
      <AdaptiveImage src="/assets/sensei-mark.png" alt="סמל סנסיי" shape="arch" aspectRatio="3 / 4" focalPoint="40% 20%" rotation={2} layered />,
    );
    const figure = container.querySelector('figure');
    const image = container.querySelector('img');
    expect(figure?.classList.contains('adaptive-media--arch')).toBe(true);
    expect(figure?.classList.contains('is-layered')).toBe(true);
    expect(figure?.getAttribute('style')).toContain('--media-ratio: 3 / 4');
    expect(image?.getAttribute('style')).toContain('object-position: 40% 20%');
  });
});
