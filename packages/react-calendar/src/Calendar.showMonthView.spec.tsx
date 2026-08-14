import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import Calendar from './Calendar.js';

/**
 * Characterisation tests for `showMonthView`, the fork's scrolling month-list mode.
 *
 * These pin down the behaviour of the public `showMonthView` prop as it stands today
 * so that extracting the mode into its own component can be shown to preserve it.
 * They deliberately assert through `<Calendar showMonthView />` rather than any
 * internal, because that surface is what consumers depend on and must not change.
 */
describe('Calendar showMonthView', () => {
  const minDate = new Date(2026, 7, 1);

  function renderMonthView(props: Partial<React.ComponentProps<typeof Calendar>> = {}) {
    return render(<Calendar showMonthView minDate={minDate} {...props} />);
  }

  /**
   * Finds a day tile by its long date. The label sits on the tile's inner `<abbr>`,
   * not on the button, so this walks back up to the button.
   */
  function dayTile(container: HTMLElement, longDate: string): HTMLButtonElement | null {
    return container.querySelector(`abbr[aria-label="${longDate}"]`)?.closest('button') ?? null;
  }

  it('renders 13 consecutive months anchored on minDate', async () => {
    const { container } = await renderMonthView();

    const months = container.querySelectorAll('.react-calendar__month-view');

    expect(months).toHaveLength(13);
  });

  it('does not render Navigation', async () => {
    const { container } = await renderMonthView();

    expect(container.querySelector('.react-calendar__navigation')).not.toBeInTheDocument();
  });

  it('renders each month without neighbouring-month days duplicated across the list', async () => {
    const { container } = await renderMonthView({ showNeighboringMonth: false });

    const august = container.querySelectorAll('.react-calendar__month-view')[0];
    const days = august?.querySelectorAll('.react-calendar__month-view__days__day');

    // August 2026 has 31 days and no padding cells.
    expect(days).toHaveLength(31);
  });

  it('calls onClickDay with the clicked date', async () => {
    const onClickDay = vi.fn();
    const { container } = await renderMonthView({ onClickDay });

    const fifth = dayTile(container as HTMLElement, 'August 5, 2026');
    if (!fifth) {
      throw new Error('expected August 5 tile to be rendered');
    }
    await userEvent.click(fifth);

    expect(onClickDay).toHaveBeenCalledTimes(1);
    expect(onClickDay.mock.calls[0]?.[0]).toEqual(new Date(2026, 7, 5));
  });

  it('calls onChange as well as onClickDay when a day is clicked', async () => {
    const onChange = vi.fn();
    const onClickDay = vi.fn();
    const { container } = await renderMonthView({ onChange, onClickDay });

    const fifth = dayTile(container as HTMLElement, 'August 5, 2026');
    if (!fifth) {
      throw new Error('expected August 5 tile to be rendered');
    }
    await userEvent.click(fifth);

    expect(onClickDay).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0]).toEqual(new Date(2026, 7, 5));
  });

  it('disables days outside minDate/maxDate', async () => {
    const { container } = await renderMonthView({
      minDate: new Date(2026, 7, 10),
      maxDate: new Date(2026, 7, 20),
    });

    const enabled = [
      ...container.querySelectorAll<HTMLButtonElement>('.react-calendar__month-view__days__day'),
    ].filter((tile) => !tile.disabled);

    expect(enabled).toHaveLength(11);
  });

  it('paints a range value with rangeStart, range and rangeEnd', async () => {
    const { container } = await renderMonthView({
      value: [new Date(2026, 7, 10), new Date(2026, 7, 14)],
    });

    const classOf = (longDate: string) =>
      dayTile(container as HTMLElement, longDate)?.className ?? '';

    expect(classOf('August 10, 2026')).toContain('react-calendar__tile--rangeStart');
    expect(classOf('August 12, 2026')).toContain('react-calendar__tile--range');
    expect(classOf('August 14, 2026')).toContain('react-calendar__tile--rangeEnd');
  });

  it('paints a single value as active', async () => {
    const { container } = await renderMonthView({ value: new Date(2026, 7, 12) });

    const active = container.querySelectorAll('.react-calendar__tile--active');

    expect(active).toHaveLength(1);
    expect(active[0]).toBe(dayTile(container as HTMLElement, 'August 12, 2026'));
  });

  it('routes each month through slotProps.render, passing that month’s grid as children', async () => {
    const render_ = vi.fn((props: React.ComponentProps<'div'>) => (
      <div {...props} data-custom-month="">
        {props.children}
      </div>
    ));

    const { container } = await renderMonthView({
      // `slotProps` is spread flat into the month props, so `render` sits at the top level.
      slotProps: { render: render_ } as React.ComponentProps<typeof Calendar>['slotProps'],
    });

    expect(render_).toHaveBeenCalledTimes(13);
    expect(container.querySelectorAll('[data-custom-month]')).toHaveLength(13);
    // Each custom wrapper still contains that month's day tiles.
    expect(
      container.querySelectorAll('[data-custom-month] .react-calendar__month-view__days__day')
        .length,
    ).toBeGreaterThan(300);
  });

  it('applies tileClassName and tileContent to every day', async () => {
    const { container } = await renderMonthView({
      tileClassName: 'custom-tile',
      tileContent: <span data-tile-content="" />,
    });

    const days = container.querySelectorAll('.react-calendar__month-view__days__day');
    const tagged = container.querySelectorAll('.custom-tile');
    const contents = container.querySelectorAll('[data-tile-content]');

    expect(tagged).toHaveLength(days.length);
    expect(contents).toHaveLength(days.length);
  });
});
