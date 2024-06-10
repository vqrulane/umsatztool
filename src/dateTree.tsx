/* eslint-disable array-bracket-newline */
import React from "react";
import useSWR from "swr";
import { FallbackMap } from "./fallbackMap";
import { DateGroup, getDateGrouping } from "./dateGroup";

type RowValueReducer<Entry, RowValue> = (
  entry: Entry,
  currentValue?: RowValue,
  groupedBy?: string
) => RowValue;

type RowValueComparator<RowValue> = (x: RowValue, y: RowValue) => number;
type CellValueComponent<RowValue> = React.FC<{ value: RowValue; groupedBy?: string }>;

class DateTreeCol<Entry, RowValue> extends Array<Entry> {
  value?: RowValue;
  reduceValue?: RowValueReducer<Entry, RowValue>;

  append(entry: Entry) {
    if (this.reduceValue) {
      this.value = this.reduceValue(entry, this.value);
    }

    this.push(entry);
  }
}

class DateTreeRow<Entry, RowValue> extends FallbackMap<
  DateTreeCol<Entry, RowValue> | DateTreeRow<Entry, RowValue>
> {
  groups: ((entry: Entry) => string)[] = [];
  value?: RowValue;
  reduceValue?: RowValueReducer<Entry, RowValue>;

  append(entry: Entry): DateTreeRow<Entry, RowValue> {
    const [groupBy] = this.groups;
    const group = String(groupBy(entry));
    const current = this.getWithFallback(group);

    if (this.reduceValue) {
      const getDateGroup = this.groups.at(-1);

      if (getDateGroup) {
        const dateGroup = getDateGroup(entry);
        this.value = this.reduceValue(entry, this.value, dateGroup);
      }
    }

    current.append(entry);

    return this;
  }

  getFallback() {
    const childGroups = this.groups.slice(1);

    if (childGroups.length) {
      const row = new DateTreeRow<Entry, RowValue>();
      row.groups = childGroups;
      row.reduceValue = this.reduceValue;

      return row;
    }

    const col = new DateTreeCol<Entry, RowValue>();
    col.reduceValue = this.reduceValue;

    return col;
  }
}

const DateTreeContext = React.createContext<{
  head: string[];
  CellValue: CellValueComponent<any>;
  compare: RowValueComparator<any>;
  groupNames: string[];
}>({
  head: [],
  groupNames: [],

  compare() {
    return 0;
  },

  CellValue() {
    return null;
  },
});

type Children = [string | number, DateTreeRow<any, any>][];

const getChildren = <Entry extends {}, RowValue>([, node, compare]: [
  string,
  DateTreeRow<Entry, RowValue>,
  RowValueComparator<RowValue>
]) => {
  if (node.groups.length > 1) {
    const children = Array.from(node).sort(([, x], [, y]) =>
      compare(x.value as RowValue, y.value as RowValue)
    ) as Children;

    if (children.length) {
      return children;
    }
  }

  return null;
};

const useChildren = <Entry, RowValue>(
  node: DateTreeRow<Entry, RowValue>,
  compare: RowValueComparator<RowValue>
) => useSWR<Children | null>(["tree::children", node, compare], { fetcher: getChildren });

const SkippedCols: React.FC<{
  readonly groupIdx: number;
  readonly group?: string;
  readonly node: DateTreeRow<any, any>;
}> = ({ node, group, groupIdx }) => {
  const { groupNames, CellValue } = React.useContext(DateTreeContext);
  const withTotal = ["Total"].concat(groupNames);
  const pre = withTotal.slice(0, groupIdx);
  const post = withTotal.slice(groupIdx + 1);

  return (
    <>
      {pre.map(g => (
        <td key={g}></td>
      ))}
      <td>{group || <CellValue value={node.value} />}</td>
      {post.map(g => (
        <td key={g}></td>
      ))}
    </>
  );
};

const Sum: React.FC<{
  readonly node: DateTreeRow<any, any>;
  readonly group?: string;
  readonly groupIdx: number;
}> = ({ node, group, groupIdx }) => {
  const { head, CellValue } = React.useContext(DateTreeContext);

  return (
    <tr>
      <SkippedCols node={node} group={group} groupIdx={groupIdx} />
      {head.map(key => (
        <td key={key}>{node.value && <CellValue value={node.value} groupedBy={key} />}</td>
      ))}
    </tr>
  );
};

const DateTreeNode: React.FC<{
  readonly group?: string;
  readonly groupIdx?: number;
  readonly node: DateTreeRow<any, any>;
}> = ({ group, groupIdx = 0, node }) => {
  const { compare } = React.useContext(DateTreeContext);
  const { data: children } = useChildren(node, compare);
  const sum = <Sum node={node} group={group} groupIdx={groupIdx} />;

  if (children) {
    return (
      <>
        {sum}
        {children.map(([g, child]) => (
          <DateTreeNode key={g} node={child} group={String(g)} groupIdx={groupIdx + 1} />
        ))}
      </>
    );
  }

  return sum;
};

const compareDates = (x: Date, y: Date) => Number(x) - Number(y);

const getHead = ([, dates, dateGroup]: [string, Date[], DateGroup]): string[] => {
  const sorted = [...dates].sort(compareDates);

  return sorted.reduce<string[]>((groups, date, idx) => {
    const prev = sorted[idx - 1];
    const group = getDateGrouping(date, dateGroup);

    if (prev && getDateGrouping(prev, dateGroup) === group) {
      return groups;
    }

    return groups.concat(group);
  }, []);
};

const useHead = (dates: Date[], dateGroup: DateGroup) =>
  useSWR<string[]>(["tree::keys", dates, dateGroup], { fetcher: getHead });

const getRows = <Entry extends {}, RowValue>([, entries, groups, reduce]: [
  string,
  Entry[],
  ((x: Entry) => string)[],
  RowValueReducer<Entry, RowValue>
]) => {
  if (groups.length > 1) {
    const root = new DateTreeRow<Entry, RowValue>();
    root.groups = groups;
    root.reduceValue = reduce;

    return entries.reduce((acc, entry) => acc.append(entry), root);
  }

  throw new Error("No groupings specified");
};

const useRows = <Entry extends {}, RowValue>(
  entries: Entry[],
  groups: ((x: Entry) => string)[],
  reduce: RowValueReducer<Entry, RowValue>
) => useSWR<DateTreeRow<Entry, any>>(["tree::body", entries, groups, reduce], { fetcher: getRows });

export const DateTree = <Entry extends {}, RowValue>({
  dates,
  dateGroup,
  entries,
  groupNames,
  groups,
  CellValue,
  reduce,
  compare,
}: {
  readonly dates: Date[];
  readonly dateGroup: DateGroup;
  readonly entries: Entry[];
  readonly groupNames: string[];
  readonly groups: ((x: Entry) => string)[];
  readonly CellValue: CellValueComponent<RowValue>;
  readonly reduce: RowValueReducer<Entry, RowValue>;
  readonly compare: RowValueComparator<RowValue>;
}): ReturnType<React.FC> => {
  const { data: head } = useHead(dates, dateGroup);
  const { data: rows } = useRows(entries, groups, reduce);

  if (head && rows) {
    return (
      <DateTreeContext.Provider value={{ head, groupNames, CellValue, compare }}>
        <table>
          <thead>
            <tr>
              <th>Total</th>
              {groupNames.map(groupName => (
                <th key={groupName}>{groupName}</th>
              ))}
              {head.map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <DateTreeNode node={rows} />
          </tbody>
        </table>
      </DateTreeContext.Provider>
    );
  }

  return null;
};
