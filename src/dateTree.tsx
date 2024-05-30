import React from "react";
import useSWR from "swr";
import { FallbackMap } from "./fallbackMap";
import { DateGroup, getDateGrouping } from "./dateGroup";

class DateTreeCol<T> extends Array<T> {
  value = 0;

  append(x: T) {
    this.value += Number(x);
    this.push(x);
  }
}

class SumMap extends FallbackMap<number> {
  total = 0;

  append(key: string, value: number) {
    this.total += value;
    this.set(key, this.getWithFallback(key) + value);
  }

  // eslint-disable-next-line class-methods-use-this
  getFallback(): number {
    return 0;
  }
}

class DateTreeRow<T> extends FallbackMap<DateTreeCol<T> | DateTreeRow<T>> {
  groups: ((x: T) => string)[] = [];
  value = new SumMap();

  updateSum(x: T) {
    const getLastGroup = this.groups.at(-1);

    if (getLastGroup) {
      const group = getLastGroup(x);
      this.value.append(group, Number(x));
    }
  }

  append(x: T) {
    const [groupBy] = this.groups;
    const group = String(groupBy(x));
    const current = this.getWithFallback(group);

    this.updateSum(x);
    current.append(x);
  }

  getFallback() {
    const childGroups = this.groups.slice(1);

    if (childGroups.length) {
      const row = new DateTreeRow<T>();
      row.groups = childGroups;

      return row;
    }

    return new DateTreeCol<T>();
  }
}

const DateTreeContext = React.createContext<{
  head: string[];
  CellValue: React.FC<{ value: number }>;
  groupNames: string[];
}>({
  head: [],
  groupNames: [],

  CellValue() {
    return null;
  },
});

type Children = [string | number, DateTreeRow<any>][];

const extractTotal = (x: DateTreeCol<any> | DateTreeRow<any>) =>
  typeof x.value === "number" ? x.value : x.value.total;

const compareSums = (
  x: DateTreeCol<any> | DateTreeRow<any>,
  y: DateTreeCol<any> | DateTreeRow<any>
) => extractTotal(x) - extractTotal(y);

const getChildren = ([, node]: [string, DateTreeRow<any>]) => {
  if (node.groups.length > 1) {
    const children = Array.from(node).sort(([, x], [, y]) => compareSums(x, y)) as Children;

    if (children.length) {
      return children;
    }
  }

  return null;
};

const useChildren = (node: DateTreeRow<any>) =>
  useSWR<Children | null>(["tree::children", node], { fetcher: getChildren });

const SkippedCols: React.FC<{
  readonly groupIdx: number;
  readonly group?: string;
  readonly node: DateTreeRow<any>;
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
      <td>{group || <CellValue value={node.value.total} />}</td>
      {post.map(g => (
        <td key={g}></td>
      ))}
    </>
  );
};

const Sum: React.FC<{
  readonly node: DateTreeRow<any>;
  readonly group?: string;
  readonly groupIdx: number;
}> = ({ node, group, groupIdx }) => {
  const { head, CellValue } = React.useContext(DateTreeContext);

  return (
    <tr>
      <SkippedCols node={node} group={group} groupIdx={groupIdx} />
      {head.map(key => {
        const value = node.get(key)?.value ?? node.value.get(key);

        return <td key={key}>{value && <CellValue value={Number(value)} />}</td>;
      })}
    </tr>
  );
};

const DateTreeNode: React.FC<{
  readonly group?: string;
  readonly groupIdx?: number;
  readonly node: DateTreeRow<any>;
}> = ({ group, groupIdx = 0, node }) => {
  const { data: children } = useChildren(node);
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

const getRows = <T extends {}>([, entries, groups]: [string, T[], ((x: T) => string)[]]) => {
  if (groups.length > 1) {
    const root = new DateTreeRow<T>();
    root.groups = groups;

    return entries.reduce((acc, x) => {
      acc.append(x);

      return acc;
    }, root);
  }

  throw new Error("No groupings specified");
};

const useRows = <T extends {}>(entries: T[], groups: ((x: T) => string)[]) =>
  useSWR<DateTreeRow<T>>(["tree::body", entries, groups], { fetcher: getRows });

export const DateTree = <T extends {}>({
  dates,
  dateGroup,
  entries,
  groupNames,
  groups,
  CellValue,
}: {
  readonly dates: Date[];
  readonly dateGroup: DateGroup;
  readonly entries: T[];
  readonly groupNames: string[];
  readonly groups: ((x: T) => string)[];
  readonly CellValue: React.FC<{ value: number }>;
}): ReturnType<React.FC> => {
  const { data: head } = useHead(dates, dateGroup);
  const { data: rows } = useRows(entries, groups);

  if (head && rows) {
    return (
      <DateTreeContext.Provider value={{ head, groupNames, CellValue }}>
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
