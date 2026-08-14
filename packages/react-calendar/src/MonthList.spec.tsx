import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import MonthList from './MonthList.js';

import type { MonthListProps } from './MonthList.js';

describe('MonthList', () => {
  const startMonth = new Date(2026, 7, 1);

  function dayTile(container: HTMLElement, longDate: string): HTMLButtonElement | null {
    return container.querySelector(`abbr[aria-label="${longDate}"]`)?.closest('button') ?? null;
  }

  it('renders 13 months by default', async () => {
    const { container } = await render(<MonthList startMonth={startMonth} />);

    expect(container.querySelectorAll('.react-calendar__month-view')).toHaveLength(13);
  });

  it('renders monthCount consecutive months starting at startMonth', async () => {
    const { container } = await render(<MonthList startMonth={startMonth} monthCount={3} />);

    expect(container.querySelectorAll('.react-calendar__month-view')).toHaveLength(3);
    // August, September and October 2026 — 31 + 30 + 31 days, no padding.
    expect(container.querySelectorAll('.react-calendar__month-view__days__day')).toHaveLength(92);
  });

  it('omits neighbouring-month days by default so they are not duplicated across months', async () => {
    const { container } = await render(<MonthList startMonth={startMonth} monthCount={1} />);

    expect(
      container.querySelectorAll('.react-calendar__month-view__days__day--neighboringMonth'),
    ).toHaveLength(0);
  });

  it('calls onClickDay with the clicked day', async () => {
    const onClickDay = vi.fn();
    const { container } = await render(
      <MonthList startMonth={startMonth} monthCount={1} onClickDay={onClickDay} />,
    );

    const tile = dayTile(container as HTMLElement, 'August 5, 2026');
    if (!tile) {
      throw new Error('expected August 5 tile to be rendered');
    }
    await userEvent.click(tile);

    expect(onClickDay).toHaveBeenCalledTimes(1);
    expect(onClickDay.mock.calls[0]?.[0]).toEqual(new Date(2026, 7, 5));
  });

  it('paints nothing as selected when no value is passed, since it holds no selection state', async () => {
    const onClickDay = vi.fn();
    const { container } = await render(
      <MonthList startMonth={startMonth} monthCount={1} onClickDay={onClickDay} />,
    );

    const tile = dayTile(container as HTMLElement, 'August 5, 2026');
    if (!tile) {
      throw new Error('expected August 5 tile to be rendered');
    }
    await userEvent.click(tile);

    // The click is reported, but nothing is painted: selection is the consumer's.
    expect(onClickDay).toHaveBeenCalledTimes(1);
    expect(container.querySelectorAll('.react-calendar__tile--active')).toHaveLength(0);
  });

  it('paints a controlled range across its span', async () => {
    const { container } = await render(
      <MonthList
        startMonth={startMonth}
        monthCount={1}
        value={[new Date(2026, 7, 10), new Date(2026, 7, 14)]}
      />,
    );

    const classOf = (longDate: string) =>
      dayTile(container as HTMLElement, longDate)?.className ?? '';

    expect(classOf('August 10, 2026')).toContain('react-calendar__tile--rangeStart');
    expect(classOf('August 12, 2026')).toContain('react-calendar__tile--range');
    expect(classOf('August 14, 2026')).toContain('react-calendar__tile--rangeEnd');
  });

  it('disables days outside minDate/maxDate', async () => {
    const { container } = await render(
      <MonthList
        startMonth={startMonth}
        monthCount={1}
        minDate={new Date(2026, 7, 10)}
        maxDate={new Date(2026, 7, 20)}
      />,
    );

    const enabled = [
      ...container.querySelectorAll<HTMLButtonElement>('.react-calendar__month-view__days__day'),
    ].filter((tile) => !tile.disabled);

    expect(enabled).toHaveLength(11);
  });

  it("wraps every month with renderMonth, passing that month's MonthView state and its grid", async () => {
    const renderMonth = vi.fn<NonNullable<MonthListProps['renderMonth']>>((props) => (
      <section {...props} data-month="">
        {props.children}
      </section>
    ));

    const { container } = await render(
      <MonthList startMonth={startMonth} monthCount={2} renderMonth={renderMonth} />,
    );

    expect(renderMonth).toHaveBeenCalledTimes(2);
    expect(renderMonth.mock.calls[0]?.[1]).toMatchObject({
      activeStartDate: new Date(2026, 7, 1),
      index: 0,
    });
    expect(renderMonth.mock.calls[1]?.[1]).toMatchObject({
      activeStartDate: new Date(2026, 8, 1),
      index: 1,
    });
    expect(
      container.querySelectorAll('[data-month] .react-calendar__month-view__days__day').length,
    ).toBe(61);
  });

  it('applies tileClassName and tileContent to every day', async () => {
    const { container } = await render(
      <MonthList
        startMonth={startMonth}
        monthCount={1}
        tileClassName="custom-tile"
        tileContent={<span data-tile-content="" />}
      />,
    );

    expect(container.querySelectorAll('.custom-tile')).toHaveLength(31);
    expect(container.querySelectorAll('[data-tile-content]')).toHaveLength(31);
  });
});
