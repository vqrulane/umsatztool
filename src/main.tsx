/* eslint-disable max-lines */
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

import useSWR, { SWRConfig, SWRConfiguration } from "swr";
import { Store, useStore } from "./store";
import {
  TransactionGroup,
  TransactionGrouping,
  TransactionParser,
  transactionGroupingNames,
} from "./transaction";
import { TransactionList } from "./transaction/group";
import { Amount } from "./transaction/amount";

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

type ParsedFile = {
  file: File;
  transactions: TransactionGroup | TransactionList;
  errors: Error[];
};

// eslint-disable-next-line array-bracket-newline
const parseFile = async ([, file, groupings]: [
  string,
  File,
  TransactionGrouping[]
]): Promise<ParsedFile> => {
  const transactions = TransactionGroup.of(groupings);
  const parser = new TransactionParser(file.stream());

  for await (const transaction of parser) {
    transactions.append(transaction);
  }

  return {
    file,
    transactions,
    errors: parser.errors,
  };
};

const useFile = () => {
  const [file] = useSelectedFile();
  const [grouping] = useGrouping();
  const key = file ? ["file::".concat(file.key), file.file, grouping] : null;

  return useSWR<ParsedFile>(key, { fetcher: parseFile });
};

const Sum: React.FC<{ readonly amount: Amount }> = ({ amount }) => <code> {String(amount)}</code>;
const blockSpacing = "2em";

const listStyle: React.CSSProperties = {
  paddingLeft: blockSpacing,
  listStylePosition: "inside",
};

const Tree: React.FC<{
  readonly data: TransactionGroup | TransactionList;
  readonly group?: React.ReactNode;
}> = ({ data, group }) => {
  const groupHeading = (
    <>
      <b style={{ lineHeight: group ? blockSpacing : "unset" }}>{group || "Total"}:</b>
      <Sum amount={new Amount(data.sum)} />
    </>
  );

  if (data instanceof TransactionGroup) {
    return (
      <ul style={listStyle}>
        <li>
          {groupHeading}
          {Array.from(data.entries()).map(([g, children]) => (
            <Tree key={g} group={g} data={children} />
          ))}
        </li>
      </ul>
    );
  }

  return (
    <ul style={listStyle}>
      {groupHeading}
      {data.map(transaction => (
        <li key={transaction.code}>
          {transaction.serial}: <Sum amount={transaction.amount} />
        </li>
      ))}
    </ul>
  );
};

const Transactions: React.FC = () => {
  const { data } = useFile();

  if (data) {
    return <Tree data={data.transactions} />;
  }

  return null;
};

const Errors: React.FC = () => {
  const { data } = useFile();

  if (data && data.errors.length > 0) {
    return (
      <ul>
        {data.errors.map(({ message }, idx) => (
          <li key={message.concat(String(idx))}>
            <code>{message}</code>
          </li>
        ))}
      </ul>
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
      padding: blockSpacing,
    }}
  >
    {children}
  </div>
);

const Body: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div
    style={{
      width: "100%",
      display: "grid",
      gridTemplateColumns: "3fr 1fr",
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
          <Header>
            <Files />
            <GroupingSettings />
          </Header>
          <Body>
            <Transactions />
            <Errors />
          </Body>
        </GroupingProvider>
      </SelectedFileProvider>
    </SWRConfig>
  </React.StrictMode>
);
