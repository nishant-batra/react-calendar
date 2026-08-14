'use client';

import clsx from 'clsx';

import { getBegin } from './shared/dates.js';

import MonthView from './MonthView.js';

import type { ClassName, OnClickFunc, Value } from './shared/types.js';

const DEFAULT_MONTH_COUNT = 13;

/**
 * Props forwarded to every month untouched. Taken from `MonthView` rather than
 * redeclared so the two cannot drift.
 */
type ForwardedMonthProps = Pick<
  React.ComponentProps<typeof MonthView>,
  | 'calendarType'
  | 'formatDay'
  | 'formatLongDate'
  | 'formatShortWeekday'
  | 'formatWeekday'
  | 'showWeekNumbers'
  | 'tileClassName'
  | 'tileContent'
  | 'tileDisabled'
>;

export type MonthListProps = ForwardedMonthProps & {
  /**
   * First month to render. Only the year and month are significant.
   *
   * @example new Date(2026, 7, 1)
   */
  startMonth: Date;
  /**
   * How many consecutive months to render, starting at `startMonth`.
   *
   * @default 13
   * @example 6
   */
  monthCount?: number;
  /**
   * `className` applied to the list's wrapper.
   *
   * @example 'my-month-list'
   */
  className?: ClassName;
  /**
   * The selected value. A `[from, to]` pair paints range classes across the span.
   *
   * There is no internal fallback: this component holds no selection state, so a
   * consumer that wants a selection painted must pass it.
   *
   * @example [new Date(2026, 7, 10), new Date(2026, 7, 14)]
   */
  value?: Value;
  /** Earliest selectable day. Days before it render disabled. */
  minDate?: Date;
  /** Latest selectable day. Days after it render disabled. */
  maxDate?: Date;
  /**
   * The day currently hovered, for painting a range preview before the second
   * endpoint is chosen. Owned by the consumer; this component tracks no hover state.
   */
  hover?: Date | null;
  locale?: string;
  /**
   * Whether to render days belonging to adjacent months. Off by default: across a
   * list of consecutive months they would appear twice.
   *
   * @default false
   */
  showNeighboringMonth?: boolean;
  /** Called with the clicked day. The only selection signal this component emits. */
  onClickDay?: OnClickFunc;
  onDayMouseOver?: (date: Date) => void;
  onDayMouseLeave?: () => void;
  /**
   * Wraps a single month. Receives the month container's props — `children` being
   * that month's rendered grid — plus that month's own `MonthView` props and its
   * position in the list, so a consumer can add a heading, a holiday list, or its
   * own windowing around each one.
   *
   * @example (props, { activeStartDate }) => <section {...props}><h2>{activeStartDate.getMonth()}</h2>{props.children}</section>
   */
  renderMonth?: (
    props: React.ComponentProps<'div'>,
    state: Omit<React.ComponentProps<typeof MonthView>, 'render'> & { index: number },
  ) => React.ReactElement;
};

/** `monthCount` consecutive months starting at `startMonth`. */
function getMonths(startMonth: Date, monthCount: number): Date[] {
  const first = getBegin('month', startMonth);

  return Array.from({ length: monthCount }, (_, index) => {
    const month = new Date(first);
    month.setMonth(month.getMonth() + index);
    return month;
  });
}

/**
 * Renders a run of consecutive months as one list, for calendars that scroll
 * rather than page.
 *
 * Fully controlled and stateless by design. `Calendar` keeps state so it can
 * navigate between months, drill down through century/decade/year, and work
 * uncontrolled — none of which a fixed list can do. Keeping that state here would
 * make it dead weight and, worse, reachable: routing taps through `Calendar`'s
 * `onChange` is what made it write `activeStartDate` and `value` state that this
 * mode never reads back. Here a tap goes straight to `onClickDay`, so those writes
 * are not skipped, they are impossible.
 *
 * Scrolling, virtualisation and sticky headers are the consumer's business; wrap
 * each month with `renderMonth` and style the container however you like.
 *
 * @example
 * ```tsx
 * <MonthList
 *   startMonth={new Date(2026, 7, 1)}
 *   monthCount={6}
 *   value={selected}
 *   onClickDay={setSelected}
 * />
 * ```
 */
export default function MonthList({
  startMonth,
  monthCount = DEFAULT_MONTH_COUNT,
  className,
  value,
  minDate,
  maxDate,
  hover,
  locale,
  showNeighboringMonth = false,
  onClickDay,
  onDayMouseOver,
  onDayMouseLeave,
  renderMonth,
  ...forwardedMonthProps
}: MonthListProps): React.ReactElement {
  const months = getMonths(startMonth, monthCount);

  return (
    <div className={clsx('react-calendar__month-list', className)}>
      {months.map((month, index) => (
        <MonthView
          key={month.getTime()}
          activeStartDate={month}
          hover={hover}
          locale={locale}
          maxDate={maxDate}
          minDate={minDate}
          onClick={onClickDay}
          onMouseLeave={onDayMouseLeave}
          onMouseOver={onDayMouseOver}
          render={renderMonth && ((props, state) => renderMonth(props, { ...state, index }))}
          showNeighboringMonth={showNeighboringMonth}
          value={value}
          // Day tiles are the only granularity a month list has.
          valueType="day"
          {...forwardedMonthProps}
        />
      ))}
    </div>
  );
}
