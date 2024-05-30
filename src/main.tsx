/* eslint-disable max-lines */
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

import useSWR, { SWRConfig, SWRConfiguration } from "swr";
import { Store, useStore } from "./store";
import { Transaction, TransactionParser } from "./transaction";
import { Amount } from "./transaction/amount";
import { DateTree } from "./dateTree";
import { DateGroup, dateGroups, getDateGrouping } from "./dateGroup";

class FileWithKey {
  key: string;
  file: File;
  name: string;

  constructor(file: File) {
    this.key = file.name.concat(String(file.lastModified));
    this.file = file;
    this.name = file.name;
  }
}

const AddFiles: React.FC<{
  readonly onAdd: (files: FileWithKey[]) => void;
}> = ({ onAdd }) => {
  const onChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { files } = e.target;

      if (files) {
        onAdd(Array.from(files).map(f => new FileWithKey(f)));
      }
    },
    [onAdd]
  );

  return (
    <label>
      + Add Files
      <input id="addFile" type="file" multiple style={{ display: "none" }} onChange={onChange} />
    </label>
  );
};

const FileTab: React.FC<
  React.PropsWithChildren<{
    readonly isSelected: boolean;
    readonly onSelect: () => void;
    readonly onRemove: () => void;
  }>
> = ({ isSelected, children, onSelect, onRemove }) => (
  <div>
    <button
      type="button"
      onClick={onSelect}
      style={{
        opacity: isSelected ? 1 : 0.5,
      }}
    >
      {children}
    </button>
    <button type="button" onClick={onRemove}>
      X
    </button>
  </div>
);

const FileTabs: React.FC<{
  files: FileWithKey[];
  selectedFile: FileWithKey | null;
  onSelect: (file: FileWithKey) => void;
  onRemove: (file: FileWithKey) => void;
}> = ({ files, selectedFile, onSelect, onRemove }) =>
  files.map(file => (
    <FileTab
      key={file.key}
      isSelected={file.key === selectedFile?.key}
      onSelect={() => onSelect(file)}
      onRemove={() => onRemove(file)}
    >
      {file.name}
    </FileTab>
  ));

const sameFileWithKey = (x: FileWithKey | null, y: FileWithKey | null) => x?.key === y?.key;

class SelectedFile extends Store<FileWithKey | null> {
  compare = sameFileWithKey;

  constructor() {
    super(null);
  }
}

const SelectedFileContext = React.createContext<SelectedFile>(new SelectedFile());
const useSelectedFile = () => useStore(React.useContext(SelectedFileContext));

const SelectedFileProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const store = React.useMemo(() => new SelectedFile(), []);

  return <SelectedFileContext.Provider value={store}>{children}</SelectedFileContext.Provider>;
};

const addFiles = (prevFiles: FileWithKey[], newFiles: FileWithKey[]): FileWithKey[] => {
  const prevKeys = new Set(prevFiles.map(f => f.key));

  return prevFiles.concat(newFiles.filter(f => !prevKeys.has(f.key)));
};

const removeFile = (prevFiles: FileWithKey[], file: FileWithKey): FileWithKey[] =>
  prevFiles.filter(f => f.key !== file.key);

const selectFile = (prevFile: FileWithKey | null, newFile: FileWithKey) => {
  if (prevFile && prevFile.key === newFile.key) {
    return prevFile;
  }

  return newFile;
};

const Files: React.FC = () => {
  const [addedFiles, setAddedFiles] = React.useState<FileWithKey[]>([]);
  const [selectedFile, setSelectedFile] = useSelectedFile();

  const onAdd = React.useCallback(
    (newFiles: FileWithKey[]) => {
      setAddedFiles(prevFiles => addFiles(prevFiles, newFiles));

      if (!selectedFile) {
        setSelectedFile(() => newFiles[0]);
      }
    },
    [setAddedFiles, selectedFile, setSelectedFile]
  );

  const onSelect = React.useCallback(
    (newFile: FileWithKey) => setSelectedFile(prevFile => selectFile(prevFile, newFile)),
    [setSelectedFile]
  );

  const onRemove = React.useCallback(
    (file: FileWithKey) => {
      setAddedFiles(prevFiles => {
        const withoutRemoved = removeFile(prevFiles, file);

        if (selectedFile?.key === file.key) {
          setSelectedFile(() => withoutRemoved[0] ?? null);
        }

        return withoutRemoved;
      });
    },
    [selectedFile, setAddedFiles, setSelectedFile]
  );

  return (
    <>
      <FileTabs
        files={addedFiles}
        selectedFile={selectedFile}
        onSelect={onSelect}
        onRemove={onRemove}
      />
      <AddFiles onAdd={onAdd} />
    </>
  );
};

const transactionGroupings = {
  account: (transaction: Transaction) => String(transaction.account),
  serial: (transaction: Transaction) => transaction.serial || "no serial",
  text: (transaction: Transaction) => transaction.text || "no text",
} as const;

type TransactionGrouping = keyof typeof transactionGroupings;
const transactionGroupingNames = Object.keys(transactionGroupings) as TransactionGrouping[];

const sameGrouping = (x: TransactionGrouping[], y: TransactionGrouping[]) =>
  x.join("") === y.join("");

class Grouping extends Store<TransactionGrouping[]> {
  compare = sameGrouping;

  constructor() {
    super(["serial"]);
  }
}

const GroupingContext = React.createContext<Grouping>(new Grouping());
const useGrouping = () => useStore(React.useContext(GroupingContext));

const GroupingProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const store = React.useMemo(() => new Grouping(), []);

  return <GroupingContext.Provider value={store}>{children}</GroupingContext.Provider>;
};

const yieldRemainingGroups = function* (
  groupings: TransactionGrouping[],
  remainder = transactionGroupingNames
): Generator<TransactionGrouping[]> {
  const [grouping, ...nextGroupings] = groupings;

  if (grouping) {
    const newRemainder = remainder.filter(g => g !== grouping);
    yield newRemainder;

    if (newRemainder.length > 0) {
      yield* yieldRemainingGroups(nextGroupings, newRemainder);
    }
  }
};

const getRemainingGroups = ([, groupings]: [string, TransactionGrouping[]]) => [
  transactionGroupingNames,
  ...yieldRemainingGroups(groupings),
];

const useRemainingGroups = (groupings: TransactionGrouping[]) =>
  useSWR(["grouping_options", groupings], getRemainingGroups);

const GroupingSelect: React.FC<{
  readonly value: TransactionGrouping;
  readonly options: TransactionGrouping[];
  readonly onSelect: (option: TransactionGrouping) => void;
}> = ({ value, options, onSelect }) => (
  <select
    value={value}
    onChange={e => e.target.value && onSelect(e.target.value as TransactionGrouping)}
  >
    {!value && <option value="">add grouping</option>}
    {options.map(option => (
      <option key={option}>{option}</option>
    ))}
  </select>
);

const updateGrouping = (grouping: TransactionGrouping, idx: number, prev: TransactionGrouping[]) =>
  prev.slice(0, idx).concat(grouping);

const GroupingSettings: React.FC = () => {
  const [grouping, setGrouping] = useGrouping();
  const { data: remainingGroups } = useRemainingGroups(grouping);

  if (remainingGroups) {
    return (
      <div>
        {remainingGroups.map((options, idx) => (
          <GroupingSelect
            key={options.join("/")}
            value={grouping[idx]}
            options={options}
            onSelect={selected => setGrouping(prev => updateGrouping(selected, idx, prev))}
          />
        ))}
      </div>
    );
  }

  return null;
};

class SelectedDateGroup extends Store<DateGroup> {
  constructor() {
    super("week");
  }
}

const SelectedDateGroupContext = React.createContext(new SelectedDateGroup());
const useSelectedDateGroup = () => useStore(React.useContext(SelectedDateGroupContext));

const SelectedDateGroupProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const store = React.useMemo(() => new SelectedDateGroup(), []);

  return (
    <SelectedDateGroupContext.Provider value={store}>{children}</SelectedDateGroupContext.Provider>
  );
};

const DateGroupSelect: React.FC = () => {
  const [selectedDateGroup, setselectedDateGroup] = useSelectedDateGroup();

  return (
    <div>
      {dateGroups.map(g => (
        <button
          key={g}
          type="button"
          onClick={() => setselectedDateGroup(() => g)}
          disabled={g === selectedDateGroup}
        >
          {g}
        </button>
      ))}
    </div>
  );
};

type ParsedFile = {
  file: File;
  dates: Date[];
  transactions: Transaction[];
  errors: Error[];
};

const parseFile = async ([, file]: [string, File]): Promise<ParsedFile> => {
  const transactions = [];
  const dates = [];
  const parser = new TransactionParser(file.stream());

  for await (const transaction of parser) {
    transactions.push(transaction);
    dates.push(transaction.date);
  }

  return {
    file,
    dates,
    transactions,
    errors: parser.errors,
  };
};

const useFile = () => {
  const [file] = useSelectedFile();
  const key = file ? ["file::".concat(file.key), file.file] : null;

  return useSWR<ParsedFile>(key, { fetcher: parseFile });
};

const Sum: React.FC<{ readonly value: number }> = ({ value }) => (
  <pre>{String(new Amount(value))}</pre>
);

const Transactions: React.FC = () => {
  const { data } = useFile();
  const [grouping] = useGrouping();
  const [selectedDateGroup] = useSelectedDateGroup();

  if (data) {
    return (
      <DateTree
        dates={data.dates}
        entries={data.transactions}
        groups={grouping
          .map(g => transactionGroupings[g])
          .concat(t => getDateGrouping(t.date, selectedDateGroup))}
        groupNames={grouping}
        dateGroup={selectedDateGroup}
        CellValue={Sum}
      />
    );
  }

  return null;
};

const Errors: React.FC = () => {
  const { data } = useFile();
  const [open, setOpen] = React.useState(false);

  if (data && data.errors.length > 0) {
    return (
      <>
        <button type="button" onClick={() => setOpen(!open)}>
          {data.errors.length} errors
        </button>
        <dialog open={open} style={{ position: "relative" }}>
          <ul>
            {data.errors.map(({ message }, idx) => (
              <li key={message.concat(String(idx))}>
                <code>{message}</code>
              </li>
            ))}
          </ul>
        </dialog>
      </>
    );
  }

  return null;
};

const Header: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div
    style={{
      display: "flex",
      width: "100%",
      flexWrap: "wrap",
      alignItems: "center",
      gap: "1em",
      padding: "2em",
    }}
  >
    {children}
  </div>
);

const Body: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div
    style={{
      maxWidth: "100%",
      overflow: "scroll",
      margin: "0 2em",
    }}
  >
    {children}
  </div>
);

const swrConfig: SWRConfiguration = {
  compare: Object.is,
  revalidateOnFocus: false,
  refreshWhenHidden: false,
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <SWRConfig value={swrConfig}>
      <SelectedFileProvider>
        <GroupingProvider>
          <SelectedDateGroupProvider>
            <Header>
              <Files />
              <GroupingSettings />
              <DateGroupSelect />
              <Errors />
            </Header>
            <Body>
              <Transactions />
            </Body>
          </SelectedDateGroupProvider>
        </GroupingProvider>
      </SelectedFileProvider>
    </SWRConfig>
  </React.StrictMode>
);
